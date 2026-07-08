#include <algorithm>
#include <cctype>
#include <cstdint>
#include <memory>
#include <optional>
#include <sstream>
#include <string>
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
        case casl::RunState::Finished: return "Finished";
        case casl::RunState::Error: return "Error";
    }
    return "Error";
}

std::string severityName(casl::Severity severity) {
    return severity == casl::Severity::Error ? "error" : "warning";
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

    const auto effectiveAddress = state.lastMemoryReadAddress.has_value()
        ? state.lastMemoryReadAddress
        : state.lastMemoryWriteAddress;

    const auto found = std::find_if(output.instructions.begin(), output.instructions.end(), [&](const casl::Instruction& instruction) {
        if (instruction.opcode != *state.lastInstructionKind) return false;
        if (state.memory[instruction.address] != state.ir) return false;
        if (effectiveAddress.has_value() && instruction.operandAddress != effectiveAddress) return false;
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
               << "\", \"severity\": \"" << severityName(diagnostic.severity) << "\"}";
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
    output << "[\n";
    for (std::uint16_t address = 0x20; address <= 0x2a; address = static_cast<std::uint16_t>(address + 1)) {
        const auto label = labels.find(address);
        const auto isChanged = state.lastMemoryWriteAddress.has_value() && *state.lastMemoryWriteAddress == address;
        output << "      {\n";
        output << "        \"address\": " << address << ",\n";
        output << "        \"value\": " << state.memory[address] << ",\n";
        output << "        \"label\": " << (label == labels.end() ? "null" : "\"" + jsonEscape(label->second) + "\"") << ",\n";
        output << "        \"isCurrent\": " << boolText(currentAddress.has_value() && *currentAddress == address) << ",\n";
        output << "        \"isChanged\": " << boolText(isChanged) << "\n";
        output << "      }";
        if (address != 0x2a) output << ",";
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
    const auto currentInstruction = findInstruction(assembled, state.pr);
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
    const auto effectiveAddress = lastInstruction && lastInstruction->operandAddress ? std::optional<std::uint32_t>(*lastInstruction->operandAddress) : std::nullopt;
    const auto lastMemoryRead = state.lastMemoryReadAddress ? std::optional<std::uint32_t>(*state.lastMemoryReadAddress) : std::nullopt;
    const auto lastMemoryWrite = state.lastMemoryWriteAddress ? std::optional<std::uint32_t>(*state.lastMemoryWriteAddress) : std::nullopt;
    const auto lastRegisterWrite = state.lastRegisterWriteIndex ? std::optional<std::uint32_t>(*state.lastRegisterWriteIndex) : std::nullopt;

    std::ostringstream output;
    output << "{\n";
    output << "  \"runState\": \"" << runStateName(state.runState) << "\",\n";
    output << "  \"stepCount\": " << state.stepCount << ",\n";
    output << "  \"pr\": " << state.pr << ",\n";
    output << "  \"sp\": " << state.sp << ",\n";
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
    output << "  \"frCF\": " << boolText(state.fr.c) << ",\n";
    output << "  \"currentInstructionAddress\": " << nullableNumber(currentAddress ? std::optional<std::uint32_t>(*currentAddress) : std::nullopt) << ",\n";
    output << "  \"currentSourceLineIndex\": " << nullableNumber(currentLine) << ",\n";
    output << "  \"currentInstructionText\": " << nullableString(currentText) << ",\n";
    output << "  \"lastInstructionKind\": " << nullableString(lastKind) << ",\n";
    output << "  \"lastMemoryReadAddress\": " << nullableNumber(lastMemoryRead) << ",\n";
    output << "  \"lastMemoryWriteAddress\": " << nullableNumber(lastMemoryWrite) << ",\n";
    output << "  \"lastRegisterWriteIndex\": " << nullableNumber(lastRegisterWrite) << ",\n";
    output << "  \"effectiveAddress\": " << nullableNumber(effectiveAddress) << ",\n";
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

casl::AssembleOutput emptyAssembled(casl::RunState runState) {
    casl::AssembleOutput output;
    output.state.runState = runState;
    output.state.pr = casl::kDefaultStartAddress;
    output.state.mar = casl::kDefaultStartAddress;
    output.state.sp = casl::kDefaultStackPointer;
    return output;
}

std::string currentStateJson(WasmRuntime& rt) {
    if (rt.assembled.has_value()) {
        const auto& state = rt.loaded ? rt.vm.state() : rt.assembled->state;
        return dumpStateJson(*rt.assembled, state, rt.lastStep, rt.lastDiagnostics);
    }
    const auto empty = emptyAssembled(casl::RunState::Idle);
    return dumpStateJson(empty, empty.state, std::nullopt, rt.lastDiagnostics);
}

std::string stateErrorJson(const std::string& message) {
    const std::vector<casl::Diagnostic> diagnostics{{0, casl::Severity::Error, message}};
    auto empty = emptyAssembled(casl::RunState::Error);
    return dumpStateJson(empty, empty.state, std::nullopt, diagnostics);
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

EMSCRIPTEN_KEEPALIVE const char* stugx_casl_get_last_error() {
    return g_lastError.c_str();
}

}  // extern "C"
