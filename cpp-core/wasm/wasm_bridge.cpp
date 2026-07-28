#include <algorithm>
#include <cctype>
#include <cstdint>
#include <memory>
#include <optional>
#include <sstream>
#include <stdexcept>
#include <string>
#include <type_traits>
#include <unordered_map>
#include <vector>

#ifdef __EMSCRIPTEN__
#include <emscripten/emscripten.h>
#else
#define EMSCRIPTEN_KEEPALIVE
#endif

#include "Assembler.hpp"
#include "CometVm.hpp"

namespace {

struct WasmRuntime {
    casl::Assembler assembler;
    casl::CometVm vm;
    std::optional<casl::AssembleOutput> assembled;
    std::optional<casl::StepResult> lastStep;
    std::vector<casl::Diagnostic> lastDiagnostics;
    bool loaded = false;
};

std::unique_ptr<WasmRuntime> g_runtime;
std::string g_lastJsonBuffer;
std::string g_lastError;

const char* setJson(std::string json) {
    g_lastJsonBuffer = std::move(json);
    return g_lastJsonBuffer.c_str();
}

const char* setError(std::string message);

WasmRuntime& runtime() {
    if (!g_runtime) {
        g_runtime = std::make_unique<WasmRuntime>();
    }
    return *g_runtime;
}

std::string jsonEscape(const std::string& text) {
    std::string escaped;
    escaped.reserve(text.size() + 8);
    for (const char ch : text) {
        switch (ch) {
            case '"': escaped += "\\\""; break;
            case '\\': escaped += "\\\\"; break;
            case '\n': escaped += "\\n"; break;
            case '\r': escaped += "\\r"; break;
            case '\t': escaped += "\\t"; break;
            default: escaped += ch; break;
        }
    }
    return escaped;
}

std::string boolText(bool value) {
    return value ? "true" : "false";
}

std::string nullableNumber(std::optional<std::uint32_t> value) {
    if (!value.has_value()) return "null";
    return std::to_string(*value);
}

std::string nullableString(const std::optional<std::string>& value) {
    if (!value.has_value()) return "null";
    return "\"" + jsonEscape(*value) + "\"";
}

std::string runStateName(casl::RunState state) {
    switch (state) {
        case casl::RunState::Idle: return "Idle";
        case casl::RunState::Dirty: return "Dirty";
        case casl::RunState::Ready: return "Ready";
        case casl::RunState::Running: return "Running";
        case casl::RunState::WaitingInput: return "WaitingInput";
        case casl::RunState::Finished: return "Finished";
        case casl::RunState::Error: return "Error";
    }
    return "Error";
}

std::string executionGranularityName(casl::ExecutionGranularity granularity) {
    return granularity == casl::ExecutionGranularity::Microcycle ? "microcycle" : "instruction";
}

std::string microcyclePhaseName(casl::MicrocyclePhase phase) {
    switch (phase) {
        case casl::MicrocyclePhase::Fetch: return "fetch";
        case casl::MicrocyclePhase::Decode: return "decode";
        case casl::MicrocyclePhase::EffectiveAddress: return "effective-address";
        case casl::MicrocyclePhase::OperandRead: return "operand-read";
        case casl::MicrocyclePhase::Execute: return "execute";
        case casl::MicrocyclePhase::WriteBack: return "write-back";
        case casl::MicrocyclePhase::FlagUpdate: return "flag-update";
        case casl::MicrocyclePhase::Complete: return "complete";
        default: return "none";
    }
}

std::string severityName(casl::Severity severity) {
    return severity == casl::Severity::Error ? "error" : "warning";
}

void writeDiagnosticParam(std::ostream& output, const casl::DiagnosticParamValue& value) {
    std::visit([&output](const auto& typed) {
        using T = std::decay_t<decltype(typed)>;
        if constexpr (std::is_same_v<T, std::string>) output << "\"" << jsonEscape(typed) << "\"";
        else if constexpr (std::is_same_v<T, bool>) output << boolText(typed);
        else output << typed;
    }, value);
}

void writeSourceRange(std::ostream& output, const casl::SourceRange& range) {
    const auto writePosition = [&output](const casl::SourcePosition& position) {
        output << "{\"line\": " << position.line << ", \"column\": " << position.column;
        if (position.offset.has_value()) output << ", \"offset\": " << *position.offset;
        output << "}";
    };
    output << "{\"start\": ";
    writePosition(range.start);
    output << ", \"end\": ";
    writePosition(range.end);
    output << "}";
}

std::string normalizeInstructionText(std::string source) {
    std::string normalized;
    normalized.reserve(source.size());
    bool inSpace = false;
    for (const char ch : source) {
        if (std::isspace(static_cast<unsigned char>(ch)) != 0) {
            inSpace = true;
            continue;
        }
        if (inSpace && !normalized.empty()) {
            normalized.push_back(' ');
        }
        normalized.push_back(ch);
        inSpace = false;
    }
    return normalized;
}

std::optional<casl::Instruction> findInstruction(const casl::AssembleOutput& output, std::uint16_t address) {
    const auto found = std::find_if(output.instructions.begin(), output.instructions.end(), [address](const casl::Instruction& instruction) {
        return instruction.address == address;
    });
    if (found == output.instructions.end()) return std::nullopt;
    return *found;
}

std::optional<casl::Instruction> findLastInstruction(
    const casl::AssembleOutput& output,
    const casl::CometState& state,
    const std::optional<casl::StepResult>& lastStep
) {
    if (lastStep.has_value()) {
        return findInstruction(output, lastStep->executedAddress);
    }
    if (!state.lastInstructionKind.has_value()) return std::nullopt;

    const auto baseAddress = state.lastBaseAddress;

    const auto found = std::find_if(output.instructions.begin(), output.instructions.end(), [&](const casl::Instruction& instruction) {
        if (instruction.opcode != *state.lastInstructionKind) return false;
        if (state.memory[instruction.address] != state.ir) return false;
        if (baseAddress.has_value() && instruction.operandAddress != baseAddress) return false;
        return true;
    });
    if (found == output.instructions.end()) return std::nullopt;
    return *found;
}

std::unordered_map<std::uint16_t, std::string> labelsByAddress(const casl::AssembleOutput& output) {
    std::unordered_map<std::uint16_t, std::string> labels;
    for (const auto& [label, address] : output.symbols) {
        labels.emplace(address, label);
    }
    return labels;
}

std::optional<std::uint16_t> secondWordAddress(const std::optional<casl::Instruction>& instruction) {
    if (!instruction.has_value() || instruction->size <= 1) return std::nullopt;
    return static_cast<std::uint16_t>(instruction->address + 1);
}

void writeDiagnostics(std::ostream& output, const std::vector<casl::Diagnostic>& diagnostics, int indent) {
    const std::string pad(static_cast<std::size_t>(indent), ' ');
    output << "[";
    if (!diagnostics.empty()) output << "\n";
    for (std::size_t index = 0; index < diagnostics.size(); index += 1) {
        const auto& diagnostic = diagnostics[index];
        output << pad << "  {\"line\": " << diagnostic.line
               << ", \"message\": \"" << jsonEscape(diagnostic.message)
               << "\", \"severity\": \"" << severityName(diagnostic.severity) << "\"";
        if (!diagnostic.code.empty()) {
            output << ", \"code\": \"" << jsonEscape(diagnostic.code) << "\"";
        }
        if (!diagnostic.producer.empty()) {
            output << ", \"producer\": \"" << jsonEscape(diagnostic.producer) << "\"";
        }
        if (!diagnostic.params.empty()) {
            output << ", \"params\": {";
            std::size_t paramIndex = 0;
            for (const auto& [name, value] : diagnostic.params) {
                if (paramIndex++ != 0) output << ", ";
                output << "\"" << jsonEscape(name) << "\": ";
                writeDiagnosticParam(output, value);
            }
            output << "}";
        }
        if (!diagnostic.rawContext.empty()) {
            output << ", \"rawContext\": \"" << jsonEscape(diagnostic.rawContext) << "\"";
        }
        if (!diagnostic.fallbackMessage.empty()) {
            output << ", \"fallbackMessage\": \"" << jsonEscape(diagnostic.fallbackMessage) << "\"";
        }
        if (diagnostic.sourceRange.has_value()) {
            output << ", \"sourceRange\": ";
            writeSourceRange(output, *diagnostic.sourceRange);
        }
        if (!diagnostic.relatedLocations.empty()) {
            output << ", \"relatedLocations\": [";
            for (std::size_t relatedIndex = 0; relatedIndex < diagnostic.relatedLocations.size(); ++relatedIndex) {
                if (relatedIndex != 0) output << ", ";
                const auto& location = diagnostic.relatedLocations[relatedIndex];
                output << "{\"label\": \"" << jsonEscape(location.label) << "\", \"sourceRange\": ";
                writeSourceRange(output, location.sourceRange);
                if (!location.fileName.empty()) output << ", \"fileName\": \"" << jsonEscape(location.fileName) << "\"";
                output << "}";
            }
            output << "]";
        }
        output << "}";
        if (index + 1 < diagnostics.size()) output << ",";
        output << "\n";
    }
    if (!diagnostics.empty()) output << pad;
    output << "]";
}

void writeNumberArray(std::ostream& output, const std::vector<std::uint16_t>& values) {
    output << "[";
    for (std::size_t index = 0; index < values.size(); index += 1) {
        if (index != 0) output << ", ";
        output << values[index];
    }
    output << "]";
}

void writeMemoryWindow(std::ostream& output, const casl::CometState& state, const casl::AssembleOutput& assembled, std::optional<std::uint16_t> currentAddress) {
    const auto labels = labelsByAddress(assembled);
    auto endAddress = static_cast<std::uint16_t>(0x2a);

    for (const auto& entry : assembled.sourceMap.entries()) {
        for (std::size_t offset = 0; offset < entry.machineWords.size(); offset += 1) {
            const auto address = static_cast<std::uint16_t>(entry.address + offset);
            if (address > endAddress) endAddress = address;
        }
    }
    if (currentAddress.has_value() && *currentAddress > endAddress) endAddress = *currentAddress;
    if (state.lastMemoryReadAddress.has_value() && *state.lastMemoryReadAddress > endAddress) endAddress = *state.lastMemoryReadAddress;
    if (state.lastMemoryWriteAddress.has_value() && *state.lastMemoryWriteAddress > endAddress) endAddress = *state.lastMemoryWriteAddress;
    if (state.mar > endAddress && state.mar < 0xff00) endAddress = state.mar;

    const auto maxRows = static_cast<std::uint16_t>(0x100);
    if (endAddress > static_cast<std::uint16_t>(0x20 + maxRows - 1)) {
        endAddress = static_cast<std::uint16_t>(0x20 + maxRows - 1);
    }

    output << "[\n";
    for (std::uint16_t address = 0x20; address <= endAddress; address = static_cast<std::uint16_t>(address + 1)) {
        const auto label = labels.find(address);
        const auto isChanged = state.lastMemoryWriteAddress.has_value() && *state.lastMemoryWriteAddress == address;
        output << "      {\n";
        output << "        \"address\": " << address << ",\n";
        output << "        \"value\": " << state.memory[address] << ",\n";
        output << "        \"label\": " << (label == labels.end() ? "null" : "\"" + jsonEscape(label->second) + "\"") << ",\n";
        output << "        \"isCurrent\": " << boolText(currentAddress.has_value() && *currentAddress == address) << ",\n";
        output << "        \"isChanged\": " << boolText(isChanged) << "\n";
        output << "      }";
        if (address != endAddress) output << ",";
        output << "\n";
    }
    output << "    ]";
}

void writeSourceRows(std::ostream& output, const casl::AssembleOutput& assembled, std::optional<std::uint16_t> currentAddress) {
    output << "[\n";
    const auto& entries = assembled.sourceMap.entries();
    for (std::size_t index = 0; index < entries.size(); index += 1) {
        const auto& entry = entries[index];
        const auto instruction = findInstruction(assembled, entry.address);
        output << "      {\n";
        output << "        \"line\": " << entry.line << ",\n";
        output << "        \"address\": " << entry.address << ",\n";
        output << "        \"machineWords\": ";
        writeNumberArray(output, entry.machineWords);
        output << ",\n";
        output << "        \"source\": \"" << jsonEscape(entry.source) << "\",\n";
        output << "        \"label\": " << (entry.label.empty() ? "null" : "\"" + jsonEscape(entry.label) + "\"") << ",\n";
        output << "        \"instruction\": \"" << casl::opcodeName(entry.instruction) << "\",\n";
        output << "        \"operandAddress\": " << nullableNumber(instruction && instruction->operandAddress ? std::optional<std::uint32_t>(*instruction->operandAddress) : std::nullopt) << ",\n";
        if (instruction && instruction->sourceRegister) {
            output << "        \"sourceRegister\": " << static_cast<unsigned int>(*instruction->sourceRegister) << ",\n";
        }
        output << "        \"indexRegister\": " << nullableNumber(instruction && instruction->indexRegister != 0 ? std::optional<std::uint32_t>(instruction->indexRegister) : std::nullopt) << ",\n";
        output << "        \"isCurrent\": " << boolText(currentAddress.has_value() && *currentAddress == entry.address) << "\n";
        output << "      }";
        if (index + 1 < entries.size()) output << ",";
        output << "\n";
    }
    output << "    ]";
}

std::string dumpStateJson(
    const casl::AssembleOutput& assembled,
    const casl::CometState& state,
    const std::optional<casl::StepResult>& lastStep,
    const std::vector<casl::Diagnostic>& diagnostics
) {
    const auto activeAddress = state.executionGranularity == casl::ExecutionGranularity::Microcycle &&
        state.microcycle.phase != casl::MicrocyclePhase::None
        ? state.microcycle.instructionAddress
        : state.pr;
    const auto currentInstruction = findInstruction(assembled, activeAddress);
    const auto lastInstruction = findLastInstruction(assembled, state, lastStep);
    const auto instructionForIr1 = lastInstruction.has_value() ? lastInstruction : currentInstruction;
    const auto ir1Address = secondWordAddress(instructionForIr1);
    const auto currentAddress = currentInstruction.has_value() && state.runState != casl::RunState::Finished && state.runState != casl::RunState::Error
        ? std::optional<std::uint16_t>(currentInstruction->address)
        : std::nullopt;
    const auto currentLine = currentInstruction.has_value() && currentAddress.has_value()
        ? std::optional<std::uint32_t>(static_cast<std::uint32_t>(currentInstruction->line))
        : std::nullopt;
    const auto currentText = currentInstruction.has_value() && currentAddress.has_value()
        ? std::optional<std::string>(normalizeInstructionText(currentInstruction->source))
        : std::nullopt;
    const auto lastKind = state.lastInstructionKind.has_value() ? std::optional<std::string>(casl::opcodeName(*state.lastInstructionKind)) : std::nullopt;
    const auto baseAddress = state.lastBaseAddress ? std::optional<std::uint32_t>(*state.lastBaseAddress) : (lastInstruction && lastInstruction->operandAddress ? std::optional<std::uint32_t>(*lastInstruction->operandAddress) : std::nullopt);
    const auto indexRegister = state.lastIndexRegister ? std::optional<std::uint32_t>(*state.lastIndexRegister) : (lastInstruction && lastInstruction->indexRegister != 0 ? std::optional<std::uint32_t>(lastInstruction->indexRegister) : std::nullopt);
    const auto indexValue = state.lastIndexValue ? std::optional<std::uint32_t>(*state.lastIndexValue) : (indexRegister ? std::optional<std::uint32_t>(state.gr[*indexRegister]) : std::nullopt);
    const auto effectiveAddress = state.lastEffectiveAddress ? std::optional<std::uint32_t>(*state.lastEffectiveAddress) : (baseAddress ? std::optional<std::uint32_t>((*baseAddress + indexValue.value_or(0)) & 0xffffU) : std::nullopt);
    const auto lastMemoryRead = state.lastMemoryReadAddress ? std::optional<std::uint32_t>(*state.lastMemoryReadAddress) : std::nullopt;
    const auto lastMemoryWrite = state.lastMemoryWriteAddress ? std::optional<std::uint32_t>(*state.lastMemoryWriteAddress) : std::nullopt;
    const auto lastRegisterWrite = state.lastRegisterWriteIndex ? std::optional<std::uint32_t>(*state.lastRegisterWriteIndex) : std::nullopt;

    std::ostringstream output;
    output << "{\n";
    output << "  \"runState\": \"" << runStateName(state.runState) << "\",\n";
    output << "  \"stepCount\": " << state.stepCount << ",\n";
    output << "  \"pr\": " << state.pr << ",\n";
    output << "  \"sp\": " << state.sp << ",\n";
    output << "  \"callDepth\": " << state.callDepth << ",\n";
    output << "  \"ir0\": " << state.ir << ",\n";
    output << "  \"ir1\": " << nullableNumber(ir1Address ? std::optional<std::uint32_t>(state.memory[*ir1Address]) : std::nullopt) << ",\n";
    output << "  \"mar\": " << state.mar << ",\n";
    output << "  \"mdr\": " << state.mdr << ",\n";
    output << "  \"gr\": [";
    for (std::size_t index = 0; index < state.gr.size(); index += 1) {
        if (index != 0) output << ", ";
        output << state.gr[index];
    }
    output << "],\n";
    output << "  \"frOF\": " << boolText(state.fr.o) << ",\n";
    output << "  \"frSF\": " << boolText(state.fr.n) << ",\n";
    output << "  \"frZF\": " << boolText(state.fr.z) << ",\n";
    if (state.executionGranularity == casl::ExecutionGranularity::Microcycle) {
        output << "  \"executionGranularity\": \"" << executionGranularityName(state.executionGranularity) << "\",\n";
        output << "  \"microcyclePhase\": \"" << microcyclePhaseName(state.microcycle.phase) << "\",\n";
        output << "  \"microcycleInstructionAddress\": "
               << (state.microcycle.phase == casl::MicrocyclePhase::None ? "null" : std::to_string(state.microcycle.instructionAddress)) << ",\n";
        output << "  \"microcycleInstructionKind\": "
               << (state.microcycle.instructionKind.has_value()
                   ? "\"" + casl::opcodeName(*state.microcycle.instructionKind) + "\""
                   : "null") << ",\n";
        output << "  \"microcycleSourceLineIndex\": "
               << (state.microcycle.sourceLine < 0 ? "null" : std::to_string(state.microcycle.sourceLine)) << ",\n";
        output << "  \"microcycleIndex\": " << state.microcycle.microIndex << ",\n";
        output << "  \"microcycleTotal\": " << state.microcycle.totalMicrosteps << ",\n";
        output << "  \"microcycleInstructionComplete\": " << boolText(state.microcycle.instructionComplete) << ",\n";
        output << "  \"microcycleHistorySequence\": " << state.microcycle.historySequence << ",\n";
        output << "  \"microcycleDetail\": \"" << jsonEscape(state.microcycle.detail) << "\",\n";
    }
    output << "  \"currentInstructionAddress\": " << nullableNumber(currentAddress ? std::optional<std::uint32_t>(*currentAddress) : std::nullopt) << ",\n";
    output << "  \"currentSourceLineIndex\": " << nullableNumber(currentLine) << ",\n";
    output << "  \"currentInstructionText\": " << nullableString(currentText) << ",\n";
    output << "  \"lastInstructionKind\": " << nullableString(lastKind) << ",\n";
    output << "  \"lastMemoryReadAddress\": " << nullableNumber(lastMemoryRead) << ",\n";
    output << "  \"lastMemoryWriteAddress\": " << nullableNumber(lastMemoryWrite) << ",\n";
    output << "  \"lastRegisterWriteIndex\": " << nullableNumber(lastRegisterWrite) << ",\n";
    output << "  \"baseAddress\": " << nullableNumber(baseAddress) << ",\n";
    output << "  \"indexRegister\": " << nullableNumber(indexRegister) << ",\n";
    output << "  \"indexValue\": " << nullableNumber(indexValue) << ",\n";
    output << "  \"effectiveAddress\": " << nullableNumber(effectiveAddress) << ",\n";
    if (!state.consoleOutput.empty()) {
        output << "  \"consoleOutput\": [";
        for (std::size_t recordIndex = 0; recordIndex < state.consoleOutput.size(); ++recordIndex) {
            if (recordIndex != 0) output << ", ";
            writeNumberArray(output, state.consoleOutput[recordIndex]);
        }
        output << "],\n";
    }
    output << "  \"memoryWindow\": ";
    writeMemoryWindow(output, state, assembled, currentAddress);
    output << ",\n";
    output << "  \"sourceRows\": ";
    writeSourceRows(output, assembled, currentAddress);
    output << ",\n";
    output << "  \"diagnostics\": ";
    writeDiagnostics(output, diagnostics, 2);
    output << "\n";
    output << "}";
    return output.str();
}

std::string resultJson(const char* resultType, bool ok, const std::string& stateJson, const std::vector<casl::Diagnostic>& diagnostics) {
    std::ostringstream output;
    output << "{\n";
    output << "  \"ok\": " << boolText(ok) << ",\n";
    output << "  \"state\": " << stateJson << ",\n";
    output << "  \"diagnostics\": ";
    writeDiagnostics(output, diagnostics, 2);
    output << "\n";
    output << "}";
    (void)resultType;
    return output.str();
}

std::string emptyStateJson(casl::RunState runState, const std::vector<casl::Diagnostic>& diagnostics) {
    std::ostringstream output;
    output << "{\n";
    output << "  \"runState\": \"" << runStateName(runState) << "\",\n";
    output << "  \"stepCount\": 0,\n";
    output << "  \"pr\": " << casl::kDefaultStartAddress << ",\n";
    output << "  \"sp\": " << casl::kDefaultStackPointer << ",\n";
    output << "  \"callDepth\": 0,\n";
    output << "  \"ir0\": 0,\n";
    output << "  \"ir1\": null,\n";
    output << "  \"mar\": " << casl::kDefaultStartAddress << ",\n";
    output << "  \"mdr\": 0,\n";
    output << "  \"gr\": [0, 0, 0, 0, 0, 0, 0, 0],\n";
    output << "  \"frOF\": false,\n";
    output << "  \"frSF\": false,\n";
    output << "  \"frZF\": false,\n";
    output << "  \"currentInstructionAddress\": null,\n";
    output << "  \"currentSourceLineIndex\": null,\n";
    output << "  \"currentInstructionText\": null,\n";
    output << "  \"lastInstructionKind\": null,\n";
    output << "  \"lastMemoryReadAddress\": null,\n";
    output << "  \"lastMemoryWriteAddress\": null,\n";
    output << "  \"lastRegisterWriteIndex\": null,\n";
    output << "  \"baseAddress\": null,\n";
    output << "  \"indexRegister\": null,\n";
    output << "  \"indexValue\": null,\n";
    output << "  \"effectiveAddress\": null,\n";
    output << "  \"memoryWindow\": [],\n";
    output << "  \"sourceRows\": [],\n";
    output << "  \"diagnostics\": ";
    writeDiagnostics(output, diagnostics, 2);
    output << "\n";
    output << "}";
    return output.str();
}

std::string currentStateJson(WasmRuntime& rt) {
    if (rt.assembled.has_value()) {
        const auto& state = rt.loaded ? rt.vm.state() : rt.assembled->state;
        return dumpStateJson(*rt.assembled, state, rt.lastStep, rt.lastDiagnostics);
    }
    return emptyStateJson(casl::RunState::Idle, rt.lastDiagnostics);
}

std::string stateErrorJson(const std::string& message) {
    const std::vector<casl::Diagnostic> diagnostics{{0, casl::Severity::Error, message}};
    return emptyStateJson(casl::RunState::Error, diagnostics);
}

std::string mutationResultJson(
    const std::string& status,
    std::uint16_t previousWord,
    std::uint16_t nextWord,
    const std::string& stateJson,
    const std::string& reason = ""
) {
    std::ostringstream output;
    output << "{"
           << "\"status\":\"" << status << "\","
           << "\"previousWord\":" << previousWord << ","
           << "\"nextWord\":" << nextWord;
    if (!reason.empty()) output << ",\"reason\":\"" << jsonEscape(reason) << "\"";
    output << ",\"state\":" << stateJson << "}";
    return output.str();
}

const char* setError(std::string message) {
    g_lastError = std::move(message);
    return setJson(stateErrorJson(g_lastError));
}

}  // namespace

extern "C" {

EMSCRIPTEN_KEEPALIVE const char* stugx_casl_create() {
    try {
        g_runtime = std::make_unique<WasmRuntime>();
        g_lastError.clear();
        return setJson(currentStateJson(*g_runtime));
    } catch (const std::exception& error) {
        return setError(error.what());
    }
}

EMSCRIPTEN_KEEPALIVE void stugx_casl_destroy() {
    g_runtime.reset();
    g_lastJsonBuffer.clear();
    g_lastError.clear();
}

EMSCRIPTEN_KEEPALIVE const char* stugx_casl_assemble(const char* sourceText) {
    try {
        auto& rt = runtime();
        if (sourceText == nullptr) {
            rt.loaded = false;
            rt.lastDiagnostics = {{0, casl::Severity::Error, "sourceText is null"}};
            g_lastError = "sourceText is null";
            const auto stateJson = stateErrorJson(g_lastError);
            return setJson(resultJson("assemble", false, stateJson, rt.lastDiagnostics));
        }

        auto result = rt.assembler.assemble(sourceText);
        rt.assembled = result.value;
        rt.lastStep.reset();
        rt.lastDiagnostics = result.diagnostics;
        rt.loaded = result.ok;

        if (result.ok) {
            rt.vm.load(*rt.assembled);
            rt.lastDiagnostics.clear();
            g_lastError.clear();
            const auto stateJson = dumpStateJson(*rt.assembled, rt.vm.state(), rt.lastStep, rt.lastDiagnostics);
            return setJson(resultJson("assemble", true, stateJson, rt.lastDiagnostics));
        }

        g_lastError = result.diagnostics.empty() ? "Assembly failed" : result.diagnostics.front().message;
        const auto stateJson = dumpStateJson(*rt.assembled, rt.assembled->state, rt.lastStep, rt.lastDiagnostics);
        return setJson(resultJson("assemble", false, stateJson, rt.lastDiagnostics));
    } catch (const std::exception& error) {
        g_lastError = error.what();
        const std::vector<casl::Diagnostic> diagnostics{{0, casl::Severity::Error, g_lastError}};
        return setJson(resultJson("assemble", false, stateErrorJson(g_lastError), diagnostics));
    }
}

EMSCRIPTEN_KEEPALIVE const char* stugx_casl_step() {
    try {
        auto& rt = runtime();
        if (!rt.loaded || !rt.assembled.has_value()) {
            rt.lastDiagnostics = {{0, casl::Severity::Error, "No program loaded"}};
            g_lastError = "No program loaded";
            return setJson(resultJson("step", false, stateErrorJson(g_lastError), rt.lastDiagnostics));
        }

        rt.lastStep = rt.vm.step();
        rt.lastDiagnostics = rt.lastStep->diagnostics;
        if (!rt.lastStep->ok && !rt.lastDiagnostics.empty()) {
            g_lastError = rt.lastDiagnostics.front().message;
        } else {
            g_lastError.clear();
        }
        const auto stateJson = dumpStateJson(*rt.assembled, rt.vm.state(), rt.lastStep, rt.lastDiagnostics);
        return setJson(resultJson("step", rt.lastStep->ok, stateJson, rt.lastDiagnostics));
    } catch (const std::exception& error) {
        g_lastError = error.what();
        const std::vector<casl::Diagnostic> diagnostics{{0, casl::Severity::Error, g_lastError}};
        return setJson(resultJson("step", false, stateErrorJson(g_lastError), diagnostics));
    }
}

EMSCRIPTEN_KEEPALIVE const char* stugx_casl_micro_step() {
    try {
        auto& rt = runtime();
        if (!rt.loaded || !rt.assembled.has_value()) {
            rt.lastDiagnostics = {{0, casl::Severity::Error, "No program loaded"}};
            g_lastError = "No program loaded";
            return setJson(resultJson("microStep", false, stateErrorJson(g_lastError), rt.lastDiagnostics));
        }

        const auto micro = rt.vm.stepMicrocycle();
        casl::StepResult step;
        step.ok = micro.ok;
        step.finished = micro.finished;
        step.executedAddress = micro.executedAddress;
        step.executedLine = micro.executedLine;
        step.executedInstruction = micro.executedInstruction;
        step.instructionKind = micro.instructionKind;
        step.visualPath = micro.visualPath;
        step.diagnostics = micro.diagnostics;
        rt.lastStep = std::move(step);
        rt.lastDiagnostics = micro.diagnostics;
        if (!micro.ok && !rt.lastDiagnostics.empty()) {
            g_lastError = rt.lastDiagnostics.front().message;
        } else {
            g_lastError.clear();
        }
        const auto stateJson = dumpStateJson(*rt.assembled, rt.vm.state(), rt.lastStep, rt.lastDiagnostics);
        return setJson(resultJson("microStep", micro.ok, stateJson, rt.lastDiagnostics));
    } catch (const std::exception& error) {
        g_lastError = error.what();
        const std::vector<casl::Diagnostic> diagnostics{{0, casl::Severity::Error, g_lastError}};
        return setJson(resultJson("microStep", false, stateErrorJson(g_lastError), diagnostics));
    }
}

EMSCRIPTEN_KEEPALIVE const char* stugx_casl_run_microcycles(int maxMicrosteps) {
    try {
        auto& rt = runtime();
        if (!rt.loaded || !rt.assembled.has_value()) {
            rt.lastDiagnostics = {{0, casl::Severity::Error, "No program loaded"}};
            g_lastError = "No program loaded";
            return setJson(stateErrorJson(g_lastError));
        }
        const auto result = rt.vm.runMicrocycles(maxMicrosteps);
        rt.lastStep.reset();
        rt.lastDiagnostics = result.diagnostics;
        if (!result.ok && !rt.lastDiagnostics.empty()) {
            g_lastError = rt.lastDiagnostics.front().message;
        } else {
            g_lastError.clear();
        }
        return setJson(dumpStateJson(*rt.assembled, rt.vm.state(), rt.lastStep, rt.lastDiagnostics));
    } catch (const std::exception& error) {
        return setError(error.what());
    }
}

EMSCRIPTEN_KEEPALIVE const char* stugx_casl_reset() {
    try {
        auto& rt = runtime();
        if (!rt.loaded || !rt.assembled.has_value()) {
            rt.lastDiagnostics = {{0, casl::Severity::Error, "No program loaded"}};
            g_lastError = "No program loaded";
            return setJson(stateErrorJson(g_lastError));
        }

        rt.vm.reset();
        rt.lastStep.reset();
        rt.lastDiagnostics.clear();
        g_lastError.clear();
        return setJson(dumpStateJson(*rt.assembled, rt.vm.state(), rt.lastStep, rt.lastDiagnostics));
    } catch (const std::exception& error) {
        return setError(error.what());
    }
}

EMSCRIPTEN_KEEPALIVE const char* stugx_casl_reload(int mode) {
    try {
        auto& rt = runtime();
        if (!rt.loaded || !rt.assembled.has_value()) {
            rt.lastDiagnostics = {{0, casl::Severity::Error, "No program loaded"}};
            g_lastError = "No program loaded";
            return setJson(stateErrorJson(g_lastError));
        }
        if (mode < 0 || mode > 2) {
            return setError("Invalid reload initialization mode");
        }

        const auto fill = mode == 0
            ? std::optional<std::uint16_t>{}
            : std::optional<std::uint16_t>{mode == 1 ? static_cast<std::uint16_t>(0x0000) : static_cast<std::uint16_t>(0xffff)};
        rt.vm.reload(fill);
        rt.lastStep.reset();
        rt.lastDiagnostics.clear();
        g_lastError.clear();
        return setJson(dumpStateJson(*rt.assembled, rt.vm.state(), rt.lastStep, rt.lastDiagnostics));
    } catch (const std::exception& error) {
        return setError(error.what());
    }
}

EMSCRIPTEN_KEEPALIVE const char* stugx_casl_run(int maxSteps) {
    try {
        auto& rt = runtime();
        if (!rt.loaded || !rt.assembled.has_value()) {
            rt.lastDiagnostics = {{0, casl::Severity::Error, "No program loaded"}};
            g_lastError = "No program loaded";
            return setJson(stateErrorJson(g_lastError));
        }

        const auto result = rt.vm.run(maxSteps);
        rt.lastStep.reset();
        rt.lastDiagnostics = result.diagnostics;
        if (!result.ok && !rt.lastDiagnostics.empty()) {
            g_lastError = rt.lastDiagnostics.front().message;
        } else {
            g_lastError.clear();
        }
        return setJson(dumpStateJson(*rt.assembled, rt.vm.state(), rt.lastStep, rt.lastDiagnostics));
    } catch (const std::exception& error) {
        return setError(error.what());
    }
}

EMSCRIPTEN_KEEPALIVE const char* stugx_casl_get_state() {
    try {
        auto& rt = runtime();
        return setJson(currentStateJson(rt));
    } catch (const std::exception& error) {
        return setError(error.what());
    }
}

EMSCRIPTEN_KEEPALIVE const char* stugx_casl_enqueue_input(const char* encodedWords, int endOfFile) {
    try {
        auto& rt = runtime();
        std::vector<std::uint16_t> words;
        if (encodedWords != nullptr && *encodedWords != '\0') {
            std::istringstream input(encodedWords);
            std::string token;
            while (std::getline(input, token, ',')) {
                const auto value = std::stoul(token);
                if (value > 0xff) throw std::out_of_range("input character is outside JIS X 0201 byte range");
                words.push_back(static_cast<std::uint16_t>(value));
                if (words.size() == 256) break;
            }
        }
        rt.vm.enqueueInput(std::move(words), endOfFile != 0);
        return setJson(currentStateJson(rt));
    } catch (const std::exception& error) {
        return setError(error.what());
    }
}

EMSCRIPTEN_KEEPALIVE const char* stugx_casl_mutate(int kind, int target, int value) {
    try {
        auto& rt = runtime();
        if (!rt.loaded || !rt.assembled.has_value()) {
            return setJson(mutationResultJson("rejected", 0, 0, currentStateJson(rt), "not-loaded"));
        }
        if (value < 0 || value > 0xffff) {
            return setJson(mutationResultJson("rejected", 0, 0, currentStateJson(rt), "invalid-value"));
        }

        const auto nextWord = static_cast<std::uint16_t>(value);
        std::uint16_t previousWord = 0;
        bool applied = false;
        if (kind == 0 && target >= 0 && target < static_cast<int>(casl::kGeneralRegisterCount)) {
            previousWord = rt.vm.state().gr[static_cast<std::size_t>(target)];
            applied = rt.vm.writeGeneralRegister(static_cast<std::uint32_t>(target), nextWord);
        } else if (kind == 1) {
            previousWord = rt.vm.state().pr;
            applied = rt.vm.setProgramCounter(static_cast<std::uint32_t>(nextWord));
        } else if (kind == 2) {
            previousWord = rt.vm.state().sp;
            applied = rt.vm.setStackPointer(static_cast<std::uint32_t>(nextWord));
        } else if (kind == 3 && (nextWord & 0xfff8U) == 0) {
            previousWord = rt.vm.state().fr.packed();
            rt.vm.setFlagsPacked(nextWord);
            applied = true;
        } else if (kind == 4 && target >= 0 && target <= 0xffff) {
            previousWord = rt.vm.readMemory(static_cast<std::uint32_t>(target)).value_or(0);
            applied = rt.vm.writeMemory(static_cast<std::uint32_t>(target), nextWord);
        }

        rt.lastStep.reset();
        rt.lastDiagnostics.clear();
        g_lastError.clear();
        const auto stateJson = dumpStateJson(*rt.assembled, rt.vm.state(), rt.lastStep, rt.lastDiagnostics);
        return setJson(mutationResultJson(
            applied ? "applied" : "rejected",
            previousWord,
            nextWord,
            stateJson,
            applied ? "" : "backend-rejected"
        ));
    } catch (const std::exception& error) {
        return setError(error.what());
    }
}

EMSCRIPTEN_KEEPALIVE const char* stugx_casl_full_clear() {
    try {
        auto& rt = runtime();
        rt.vm.fullClear();
        rt.assembled.reset();
        rt.lastStep.reset();
        rt.lastDiagnostics.clear();
        rt.loaded = false;
        g_lastError.clear();
        return setJson(currentStateJson(rt));
    } catch (const std::exception& error) {
        return setError(error.what());
    }
}

EMSCRIPTEN_KEEPALIVE const char* stugx_casl_get_last_error() {
    return g_lastError.c_str();
}

}  // extern "C"
