#include <algorithm>
#include <cctype>
#include <cstdint>
#include <iostream>
#include <optional>
#include <sstream>
#include <string>
#include <unordered_map>
#include <vector>

#include "Assembler.hpp"
#include "CometVm.hpp"

namespace {

const std::string kSimpleSource = R"(MAIN START
     LD    GR1,A
     ADDA  GR1,B
     ST    GR1,C
     RET
A    DC    10
B    DC    20
C    DS    1
     END)";

const std::string kGr2Source = R"(MAIN START
     LD    GR2,X
     ADDA  GR2,Y
     ST    GR2,Z
     RET
X    DC    3
Y    DC    4
Z    DS    1
     END)";

const std::string kLadSource = R"(MAIN START
     LAD   GR1,VALUE
     RET
VALUE DC   10
     END)";

const std::string kSubaSource = R"(MAIN START
     LD    GR1,A
     SUBA  GR1,B
     RET
A    DC    20
B    DC    5
     END)";

const std::string kCpaEqualSource = R"(MAIN START
     LD    GR1,A
     CPA   GR1,B
     RET
A    DC    10
B    DC    10
     END)";

const std::string kJumpSource = R"(MAIN START
     JUMP  TARGET
     LAD   GR1,0
TARGET LAD GR1,1
     RET
     END)";

const std::string kJzeTakenSource = R"(MAIN START
     LD    GR1,A
     CPA   GR1,B
     JZE   SAME
     LAD   GR2,0
     RET
SAME LAD   GR2,1
     RET
A    DC    10
B    DC    10
     END)";

const std::string kJzeNotTakenSource = R"(MAIN START
     LD    GR1,A
     CPA   GR1,B
     JZE   SAME
     LAD   GR2,0
     RET
SAME LAD   GR2,1
     RET
A    DC    10
B    DC    20
     END)";

const std::string kJmiTakenSource = R"(MAIN START
     LD    GR1,A
     CPA   GR1,B
     JMI   LESS
     LAD   GR2,0
     RET
LESS LAD   GR2,1
     RET
A    DC    5
B    DC    10
     END)";

const std::string kLogicOperationsSource = R"(MAIN START
     LD    GR1,A
     AND   GR1,MASK
     OR    GR1,B
     XOR   GR1,C
     ST    GR1,RESULT
     RET
A    DC    #00F0
MASK DC    #0F0F
B    DC    #0003
C    DC    #0001
RESULT DS  1
     END)";

const std::string kLogicalAddCompareSource = R"(MAIN START
     LD    GR1,A
     ADDL  GR1,B
     CPL   GR1,C
     JOV   OVER
     ST    GR1,RESULT
     RET
OVER LAD   GR1,999
     ST    GR1,RESULT
     RET
A    DC    1
B    DC    2
C    DC    3
RESULT DS  1
     END)";

const std::string kJovTakenSource = R"(MAIN START
     LD    GR1,A
     ADDL  GR1,B
     JOV   OVER
     LAD   GR2,0
     RET
OVER LAD   GR2,1
     RET
A    DC    #FFFF
B    DC    1
     END)";

const std::string kShiftOperationsSource = R"(MAIN START
     LD    GR1,A
     SLL   GR1,1
     RET
A    DC    3
     END)";

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
        output << pad << "  {\"line\": " << diagnostic.line << ", \"message\": \"" << jsonEscape(diagnostic.message) << "\", \"severity\": \"" << severityName(diagnostic.severity) << "\"";
        if (!diagnostic.code.empty()) output << ", \"code\": \"" << jsonEscape(diagnostic.code) << "\"";
        if (!diagnostic.params.empty()) {
            output << ", \"params\": {";
            std::size_t paramIndex = 0;
            for (const auto& [name, value] : diagnostic.params) {
                if (paramIndex++ != 0) output << ", ";
                output << "\"" << jsonEscape(name) << "\": \"" << jsonEscape(value) << "\"";
            }
            output << "}";
        }
        if (!diagnostic.rawContext.empty()) output << ", \"rawContext\": \"" << jsonEscape(diagnostic.rawContext) << "\"";
        if (!diagnostic.fallbackMessage.empty()) output << ", \"fallbackMessage\": \"" << jsonEscape(diagnostic.fallbackMessage) << "\"";
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
        output << "        \"indexRegister\": " << nullableNumber(instruction && instruction->indexRegister != 0 ? std::optional<std::uint32_t>(instruction->indexRegister) : std::nullopt) << ",\n";
        output << "        \"isCurrent\": " << boolText(currentAddress.has_value() && *currentAddress == entry.address) << "\n";
        output << "      }";
        if (index + 1 < entries.size()) output << ",";
        output << "\n";
    }
    output << "    ]";
}

std::string dumpStateJson(const casl::AssembleOutput& assembled, const casl::CometState& state, const std::optional<casl::StepResult>& lastStep) {
    const auto currentInstruction = findInstruction(assembled, state.pr);
    const auto lastInstruction = lastStep.has_value() ? findInstruction(assembled, lastStep->executedAddress) : std::nullopt;
    const auto instructionForIr1 = lastInstruction.has_value() ? lastInstruction : currentInstruction;
    const auto ir1Address = secondWordAddress(instructionForIr1);
    const auto currentAddress = currentInstruction.has_value() ? std::optional<std::uint16_t>(currentInstruction->address) : std::nullopt;
    const auto currentLine = currentInstruction.has_value() ? std::optional<std::uint32_t>(static_cast<std::uint32_t>(currentInstruction->line)) : std::nullopt;
    const auto currentText = currentInstruction.has_value() ? std::optional<std::string>(normalizeInstructionText(currentInstruction->source)) : std::nullopt;
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
    output << "  \"frCF\": " << boolText(state.fr.c) << ",\n";
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
    output << "  \"memoryWindow\": ";
    writeMemoryWindow(output, state, assembled, currentAddress);
    output << ",\n";
    output << "  \"sourceRows\": ";
    writeSourceRows(output, assembled, currentAddress);
    output << ",\n";
    output << "  \"diagnostics\": ";
    writeDiagnostics(output, std::vector<casl::Diagnostic>{}, 2);
    output << "\n";
    output << "}\n";
    return output.str();
}

casl::AssembleOutput assembleOrExit(const std::string& source) {
    casl::Assembler assembler;
    auto result = assembler.assemble(source);
    if (!result.ok) {
        std::cerr << "Assembly failed\n";
        for (const auto& diagnostic : result.diagnostics) {
            std::cerr << "line " << diagnostic.line << ": " << diagnostic.message << '\n';
        }
        std::exit(1);
    }
    return result.value;
}

std::string dumpScenario(const std::string& scenario) {
    const std::unordered_map<std::string, std::string> sources{
        {"simple-ready", kSimpleSource},
        {"simple-step1", kSimpleSource},
        {"simple-step2", kSimpleSource},
        {"simple-step3", kSimpleSource},
        {"simple-finished", kSimpleSource},
        {"gr2-step1", kGr2Source},
        {"lada-step1", kLadSource},
        {"suba-step1", kSubaSource},
        {"cpa-equal", kCpaEqualSource},
        {"jump-taken", kJumpSource},
        {"jze-taken", kJzeTakenSource},
        {"jze-not-taken", kJzeNotTakenSource},
        {"jmi-taken", kJmiTakenSource},
        {"logic-and", kLogicOperationsSource},
        {"logical-add-compare-jov", kLogicalAddCompareSource},
        {"jov-taken", kJovTakenSource},
        {"shift-sll", kShiftOperationsSource},
    };
    const auto sourceEntry = sources.find(scenario);
    if (sourceEntry == sources.end()) {
        std::cerr << "Unknown scenario: " << scenario << '\n';
        std::exit(2);
    }

    const auto& source = sourceEntry->second;
    auto assembled = assembleOrExit(source);
    casl::CometVm vm;
    vm.load(assembled);
    std::optional<casl::StepResult> lastStep;

    if (scenario == "simple-ready") {
        return dumpStateJson(assembled, vm.state(), lastStep);
    }

    int steps = 0;
    if (scenario == "simple-step1" || scenario == "gr2-step1" || scenario == "lada-step1" || scenario == "jump-taken") {
        steps = 1;
    } else if (scenario == "simple-step2" || scenario == "suba-step1" || scenario == "cpa-equal") {
        steps = 2;
    } else if (scenario == "simple-step3" || scenario == "jze-taken" || scenario == "jze-not-taken" || scenario == "jmi-taken") {
        steps = 3;
    } else if (scenario == "logic-and") {
        steps = 2;
    } else if (scenario == "logical-add-compare-jov") {
        steps = 4;
    } else if (scenario == "jov-taken") {
        steps = 3;
    } else if (scenario == "shift-sll") {
        steps = 2;
    } else if (scenario == "simple-finished") {
        steps = 4;
    } else {
        std::cerr << "Unknown scenario: " << scenario << '\n';
        std::exit(2);
    }

    for (int index = 0; index < steps; index += 1) {
        lastStep = vm.step();
        if (!lastStep->ok) {
            std::cerr << "Step failed in scenario: " << scenario << '\n';
            std::exit(1);
        }
    }

    return dumpStateJson(assembled, vm.state(), lastStep);
}

}  // namespace

int main(int argc, char** argv) {
    std::string scenario = "simple-ready";
    for (int index = 1; index < argc; index += 1) {
        const std::string arg = argv[index];
        if (arg == "--scenario" && index + 1 < argc) {
            scenario = argv[index + 1];
            index += 1;
            continue;
        }
        std::cerr << "Usage: core_dump --scenario <simple-ready|simple-step1|simple-step2|simple-step3|simple-finished|gr2-step1|lada-step1|suba-step1|cpa-equal|jump-taken|jze-taken|jze-not-taken|jmi-taken|logic-and|logical-add-compare-jov|jov-taken|shift-sll>\n";
        return 2;
    }

    std::cout << dumpScenario(scenario);
    return 0;
}
