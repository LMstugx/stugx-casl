#include <cassert>
#include <cstdlib>
#include <iostream>
#include <memory>
#include <string>
#include <string_view>
#include <utility>
#include <vector>

#include "Assembler.hpp"
#include "CometVm.hpp"

namespace {

const std::string kSample = R"(MAIN START
     LD    GR1,A
     ADDA  GR1,B
     ST    GR1,C
     RET
A    DC    10
B    DC    20
C    DS    1
     END)";

void require(bool condition, const char* message) {
    if (!condition) {
        std::cerr << "FAILED: " << message << '\n';
        std::exit(1);
    }
}

casl::AssembleOutput assembleOrExit(const std::string& source) {
    casl::Assembler assembler;
    const auto result = assembler.assemble(source);
    if (!result.ok) {
        std::cerr << "FAILED: assembly should succeed\n";
        for (const auto& diagnostic : result.diagnostics) {
            std::cerr << "  line " << diagnostic.line << ": " << diagnostic.message << '\n';
        }
        std::exit(1);
    }
    return result.value;
}

casl::AssembleOutput assembleSample() {
    return assembleOrExit(kSample);
}

std::uint16_t symbolAddress(const casl::AssembleOutput& output, const std::string& label) {
    const auto found = output.symbols.find(label);
    require(found != output.symbols.end(), "symbol should exist");
    return found->second;
}

bool hasError(const casl::AssembleResult& result, std::string_view fragment) {
    for (const auto& diagnostic : result.diagnostics) {
        if (diagnostic.severity == casl::Severity::Error && diagnostic.message.find(fragment) != std::string::npos) {
            return true;
        }
    }
    return false;
}

bool hasCode(const casl::AssembleResult& result, std::string_view code) {
    for (const auto& diagnostic : result.diagnostics) {
        if (diagnostic.code == code) return true;
    }
    return false;
}

const casl::Diagnostic* findCode(const casl::AssembleResult& result, std::string_view code) {
    for (const auto& diagnostic : result.diagnostics) {
        if (diagnostic.code == code) return &diagnostic;
    }
    return nullptr;
}

bool assembleHasError(const casl::Assembler& assembler, std::string_view source, std::string_view fragment) {
    const auto result = assembler.assemble(std::string(source));
    return hasError(result, fragment);
}

void AssembleSimpleProgram() {
    const auto output = assembleSample();
    require(output.state.pr == 0x20, "PR should be 0020 after assemble");
    require(output.state.memory[0x20] == 0x1010, "Memory[0020]");
    require(output.state.memory[0x21] == 0x0027, "Memory[0021]");
    require(output.state.memory[0x22] == 0x2010, "Memory[0022]");
    require(output.state.memory[0x23] == 0x0028, "Memory[0023]");
    require(output.state.memory[0x24] == 0x1110, "Memory[0024]");
    require(output.state.memory[0x25] == 0x0029, "Memory[0025]");
    require(output.state.memory[0x26] == 0x8100, "Memory[0026]");
    require(output.state.memory[0x27] == 0x000a, "Memory[0027]");
    require(output.state.memory[0x28] == 0x0014, "Memory[0028]");
    require(output.state.memory[0x29] == 0x0000, "Memory[0029]");
    require(output.sourceMap.lineForAddress(0x20).value_or(-1) == 2, "SourceMapBasic");
}

void AssembleChangedConstants() {
    const auto output = assembleOrExit(R"(MAIN START
     LD    GR1,A
     ADDA  GR1,B
     ST    GR1,C
     RET
A    DC    100
B    DC    200
C    DS    1
     END)");
    require(output.state.memory[symbolAddress(output, "A")] == 0x0064, "A should assemble to 0064");
    require(output.state.memory[symbolAddress(output, "B")] == 0x00c8, "B should assemble to 00C8");
}

void AssembleChangedLabels() {
    const auto output = assembleOrExit(R"(MAIN START
     LD    GR1,X
     ADDA  GR1,Y
     ST    GR1,Z
     RET
X    DC    1
Y    DC    2
Z    DS    1
     END)");
    require(symbolAddress(output, "X") == 0x27, "X label address");
    require(symbolAddress(output, "Y") == 0x28, "Y label address");
    require(symbolAddress(output, "Z") == 0x29, "Z label address");
    require(output.state.memory[0x21] == 0x27, "LD operand should point to X");
    require(output.state.memory[0x23] == 0x28, "ADDA operand should point to Y");
    require(output.state.memory[0x25] == 0x29, "ST operand should point to Z");
    const auto entry = output.sourceMap.entryForAddress(0x27);
    require(entry.has_value() && entry->label == "X", "SourceMap should keep X label");
}

void DuplicateLabel_ShouldError() {
    casl::Assembler assembler;
    const auto result = assembler.assemble("MAIN START\nA DC 1\nA DC 2\n END");
    require(!result.ok, "duplicate label should fail");
    require(hasError(result, "Duplicate label"), "duplicate label diagnostic");
    require(hasCode(result, "assembler.duplicateLabel"), "duplicate label structured code");
    const auto* diagnostic = findCode(result, "assembler.duplicateLabel");
    require(diagnostic != nullptr && diagnostic->sourceRange.has_value(), "duplicate label source range");
    require(diagnostic->sourceRange->start.line == 3 && diagnostic->sourceRange->start.column == 1, "duplicate label primary location");
    require(diagnostic->relatedLocations.size() == 1, "duplicate label related location");
    require(diagnostic->relatedLocations.front().sourceRange.start.line == 2, "duplicate label first declaration location");
}

void AssembleInvalidRegister() {
    casl::Assembler assembler;
    const auto result = assembler.assemble("MAIN START\n LD GR8,A\nA DC 1\n END");
    require(!result.ok, "invalid register should fail");
    require(hasError(result, "Invalid register"), "invalid register diagnostic");
    require(hasCode(result, "assembler.invalidRegister"), "invalid register structured code");
    const auto* diagnostic = findCode(result, "assembler.invalidRegister");
    require(diagnostic != nullptr && diagnostic->sourceRange.has_value(), "invalid register source range");
    require(diagnostic->sourceRange->start.line == 2 && diagnostic->sourceRange->start.column == 5, "invalid register token location");
}

void AssembleUndefinedLabel() {
    casl::Assembler assembler;
    const auto result = assembler.assemble("MAIN START\n LD GR1,MISSING\n RET\n END");
    require(!result.ok, "undefined label should fail");
    require(hasError(result, "Undefined label"), "undefined label diagnostic");
    require(hasCode(result, "assembler.unknownSymbol"), "undefined label structured code");
    const auto* diagnostic = findCode(result, "assembler.unknownSymbol");
    require(diagnostic != nullptr && diagnostic->sourceRange.has_value(), "undefined label source range");
    require(diagnostic->sourceRange->start.line == 2 && diagnostic->sourceRange->start.column == 9, "undefined label token location");
}

void AssembleUnknownOpcode() {
    casl::Assembler assembler;
    const auto result = assembler.assemble("MAIN START\n BADOP GR1,A\nA DC 1\n END");
    require(!result.ok, "unknown opcode should fail");
    require(hasError(result, "Unknown opcode"), "unknown opcode diagnostic");
    require(hasCode(result, "assembler.unknownOpcode"), "unknown opcode structured code");
    const auto* diagnostic = findCode(result, "assembler.unknownOpcode");
    require(diagnostic != nullptr && diagnostic->sourceRange.has_value(), "unknown opcode source range");
    require(diagnostic->sourceRange->start.line == 2 && diagnostic->sourceRange->start.column == 8, "unknown opcode token location");
}

void AssembleInvalidNumericLiteral() {
    casl::Assembler assembler;
    const auto result = assembler.assemble("MAIN START\nA DC NOPE\n END");
    require(!result.ok, "invalid numeric literal should fail");
    require(hasError(result, "Invalid numeric literal"), "invalid numeric literal diagnostic");
    require(hasCode(result, "assembler.invalidLiteral"), "invalid literal structured code");
    const auto* diagnostic = findCode(result, "assembler.invalidLiteral");
    require(diagnostic != nullptr && diagnostic->producer == "assembler", "invalid literal producer");
    require(diagnostic->sourceRange.has_value() && diagnostic->sourceRange->start.line == 2, "invalid literal range");
}

void AssembleRequiredDirectivesBoundary() {
    casl::Assembler assembler;
    const auto empty = assembler.assemble("");
    require(!empty.ok, "empty source should fail");
    require(hasError(empty, "START directive"), "empty source START diagnostic");
    require(hasError(empty, "END directive"), "empty source END diagnostic");
    require(hasCode(empty, "assembler.missingStart"), "missing START structured code");
    require(hasCode(empty, "assembler.missingEnd"), "missing END structured code");
    const auto* missingEndDiagnostic = findCode(empty, "assembler.missingEnd");
    require(missingEndDiagnostic != nullptr && missingEndDiagnostic->sourceRange.has_value(), "missing END insertion range");
    require(missingEndDiagnostic->sourceRange->start.offset == missingEndDiagnostic->sourceRange->end.offset, "missing END empty range");

    const auto comments = assembler.assemble("; comment only\n ; another comment");
    require(!comments.ok, "comments-only source should fail");
    require(hasError(comments, "START directive"), "comments-only START diagnostic");
    require(hasError(comments, "END directive"), "comments-only END diagnostic");

    const auto missingStart = assembler.assemble(" RET\n END");
    require(!missingStart.ok, "missing START should fail");
    require(hasError(missingStart, "START directive"), "missing START diagnostic");

    const auto missingEnd = assembler.assemble("MAIN START\n RET");
    require(!missingEnd.ok, "missing END should fail");
    require(hasError(missingEnd, "END directive"), "missing END diagnostic");
}

void AssembleMalformedOperandBoundary() {
    casl::Assembler assembler;
    require(assembleHasError(assembler, "MAIN START\n LD GR1\n END", "LD requires register and address operands"), "LD missing operand diagnostic");
    require(assembleHasError(assembler, "MAIN START\n LD GR1,A,GR2,EXTRA\nA DC 1\n END", "LD has too many operands"), "LD extra operand diagnostic");
    require(assembleHasError(assembler, "MAIN START\n ST ,A\nA DC 1\n END", "ST requires register and address operands"), "ST missing register diagnostic");
    require(assembleHasError(assembler, "MAIN START\n CALL\n END", "CALL requires an address operand"), "CALL missing operand diagnostic");
    require(assembleHasError(assembler, "MAIN START\n POP\n END", "POP requires a register operand"), "POP missing register diagnostic");
    require(assembleHasError(assembler, "MAIN START\n POP GR1,GR2\n END", "POP does not support index operands"), "POP index diagnostic");
    require(assembleHasError(assembler, "MAIN START\n LD GR1,A,\nA DC 1\n END", "Malformed operand list near comma"), "trailing comma diagnostic");

    const auto missing = assembler.assemble("MAIN START\n LD GR1\n END");
    const auto* missingDiagnostic = findCode(missing, "assembler.missingOperand");
    require(missingDiagnostic != nullptr && missingDiagnostic->producer == "assembler", "missing operand structured producer");
    require(missingDiagnostic->sourceRange.has_value() && missingDiagnostic->sourceRange->start.offset == missingDiagnostic->sourceRange->end.offset, "missing operand insertion range");

    const auto trailing = assembler.assemble("MAIN START\n LD GR1,A,GR2,EXTRA\nA DC 1\n END");
    const auto* trailingDiagnostic = findCode(trailing, "assembler.unexpectedTrailingOperand");
    require(trailingDiagnostic != nullptr && trailingDiagnostic->sourceRange.has_value(), "trailing operand structured range");
    const auto operand = trailingDiagnostic->params.find("operand");
    require(operand != trailingDiagnostic->params.end() && std::get<std::string>(operand->second) == "EXTRA", "trailing operand rejected value");
}

void AssembleStorageBoundaryDiagnostics() {
    casl::Assembler assembler;
    const auto signedDc = assembler.assemble("MAIN START\nNEG DC -1\nWRAP DC 65536\n END");
    require(signedDc.ok, "signed and wrapping decimal DC should assemble");
    require(signedDc.value.state.memory.at(signedDc.value.symbols.at("NEG")) == 0xffff, "negative DC low 16 bits");
    require(signedDc.value.state.memory.at(signedDc.value.symbols.at("WRAP")) == 0x0000, "large DC low 16 bits");
    require(hasError(assembler.assemble("MAIN START\nA DS 65505\n END"), "Program memory exceeds 0xFFFF"), "large DS range diagnostic");

    const auto zero = assembler.assemble("MAIN START\nA DS 0\n RET\n END");
    require(zero.ok, "DS zero should assemble");
}

void StepLd() {
    casl::CometVm vm;
    vm.load(assembleSample());
    const auto step = vm.step();
    require(step.ok, "LD step should succeed");
    require(step.instructionKind.has_value() && *step.instructionKind == casl::InstructionKind::LD, "StepResult LD kind");
    require(vm.state().pr == 0x22, "PR after LD");
    require(vm.state().mar == 0x27, "MAR after LD");
    require(vm.state().mdr == 0x000a, "MDR after LD");
    require(vm.state().gr[1] == 0x000a, "GR1 after LD");
    require(vm.state().lastInstructionKind.has_value() && *vm.state().lastInstructionKind == casl::InstructionKind::LD, "state last LD kind");
    require(vm.state().lastMemoryReadAddress.has_value() && *vm.state().lastMemoryReadAddress == 0x27, "LD read address");
    require(vm.state().lastRegisterWriteIndex.has_value() && *vm.state().lastRegisterWriteIndex == 1, "LD write register");
    require(vm.state().visualPath == casl::VisualPathKind::LD_MemoryToMdrToGr, "LD visual path");
}

void StepAdda() {
    casl::CometVm vm;
    vm.load(assembleSample());
    (void)vm.step();
    const auto step = vm.step();
    require(step.ok, "ADDA step should succeed");
    require(step.instructionKind.has_value() && *step.instructionKind == casl::InstructionKind::ADDA, "StepResult ADDA kind");
    require(vm.state().pr == 0x24, "PR after ADDA");
    require(vm.state().gr[1] == 0x001e, "GR1 after ADDA");
    require(!vm.state().fr.z && !vm.state().fr.n && !vm.state().fr.o, "FR after ADDA");
    require(vm.state().fr.packed() == 0, "FR packed after ADDA");
    require(vm.state().lastInstructionKind.has_value() && *vm.state().lastInstructionKind == casl::InstructionKind::ADDA, "state last ADDA kind");
    require(vm.state().lastMemoryReadAddress.has_value() && *vm.state().lastMemoryReadAddress == 0x28, "ADDA read address");
    require(vm.state().lastRegisterWriteIndex.has_value() && *vm.state().lastRegisterWriteIndex == 1, "ADDA write register");
    require(vm.state().visualPath == casl::VisualPathKind::ADDA_GrMdrToAluToGr, "ADDA visual path");
}

void AssembleLad() {
    const auto output = assembleOrExit(R"(MAIN START
     LAD   GR1,VALUE
     RET
VALUE DC   10
     END)");
    require(output.state.memory[0x20] == 0x1210, "LAD machine word");
    require(output.state.memory[0x21] == symbolAddress(output, "VALUE"), "LAD operand address");
    require(output.sourceMap.lineForAddress(0x20).value_or(-1) == 2, "LAD source map");
}

void StepLad() {
    const auto output = assembleOrExit(R"(MAIN START
     LAD   GR1,VALUE
     RET
VALUE DC   10
     END)");
    casl::CometVm vm;
    vm.load(output);
    const auto step = vm.step();
    require(step.ok, "LAD step should succeed");
    require(vm.state().gr[1] == symbolAddress(output, "VALUE"), "LAD should load effective address");
    require(vm.state().pr == 0x22, "PR after LAD");
    require(vm.state().lastRegisterWriteIndex.has_value() && *vm.state().lastRegisterWriteIndex == 1, "LAD write register");
    require(!vm.state().lastMemoryReadAddress.has_value(), "LAD should not read memory");
    require(vm.state().visualPath == casl::VisualPathKind::LAD_AddressToGr, "LAD visual path");
}

void StepSuba() {
    const auto output = assembleOrExit(R"(MAIN START
     LD    GR1,A
     SUBA  GR1,B
     RET
A    DC    20
B    DC    5
     END)");
    casl::CometVm vm;
    vm.load(output);
    (void)vm.step();
    const auto step = vm.step();
    require(step.ok, "SUBA step should succeed");
    require(vm.state().gr[1] == 0x000f, "GR1 after SUBA");
    require(vm.state().pr == 0x24, "PR after SUBA");
    require(!vm.state().fr.z && !vm.state().fr.n && !vm.state().fr.o, "FR after SUBA positive");
    require(vm.state().lastMemoryReadAddress.has_value() && *vm.state().lastMemoryReadAddress == symbolAddress(output, "B"), "SUBA read address");
    require(vm.state().lastRegisterWriteIndex.has_value() && *vm.state().lastRegisterWriteIndex == 1, "SUBA write register");
    require(vm.state().visualPath == casl::VisualPathKind::SUBA_GrMdrToAluToGr, "SUBA visual path");
}

void StepCpaEqual() {
    const auto output = assembleOrExit(R"(MAIN START
     LD    GR1,A
     CPA   GR1,B
     RET
A    DC    10
B    DC    10
     END)");
    casl::CometVm vm;
    vm.load(output);
    (void)vm.step();
    const auto step = vm.step();
    require(step.ok, "CPA equal should succeed");
    require(vm.state().gr[1] == 0x000a, "CPA should not modify GR1");
    require(vm.state().fr.z && !vm.state().fr.n && !vm.state().fr.o, "CPA equal flags");
    require(!vm.state().lastRegisterWriteIndex.has_value(), "CPA should not write register");
    require(vm.state().visualPath == casl::VisualPathKind::CPA_GrMdrToAluToFr, "CPA visual path");
}

void StepCpaNegative() {
    const auto output = assembleOrExit(R"(MAIN START
     LD    GR1,A
     CPA   GR1,B
     RET
A    DC    5
B    DC    10
     END)");
    casl::CometVm vm;
    vm.load(output);
    (void)vm.step();
    const auto step = vm.step();
    require(step.ok, "CPA negative should succeed");
    require(vm.state().fr.n && !vm.state().fr.z && !vm.state().fr.o, "CPA negative flags");
}

void StepJump() {
    const auto output = assembleOrExit(R"(MAIN START
     JUMP  TARGET
     LAD   GR1,0
TARGET LAD GR1,1
     RET
     END)");
    casl::CometVm vm;
    vm.load(output);
    const auto step = vm.step();
    require(step.ok, "JUMP step should succeed");
    require(vm.state().pr == symbolAddress(output, "TARGET"), "JUMP target PR");
    require(vm.state().visualPath == casl::VisualPathKind::Jump_AddressToPr, "JUMP visual path");
}

void StepJzeTaken() {
    const auto output = assembleOrExit(R"(MAIN START
     LD    GR1,A
     CPA   GR1,B
     JZE   SAME
     LAD   GR2,0
     RET
SAME LAD   GR2,1
     RET
A    DC    10
B    DC    10
     END)");
    casl::CometVm vm;
    vm.load(output);
    (void)vm.step();
    (void)vm.step();
    const auto step = vm.step();
    require(step.ok, "JZE taken should succeed");
    require(vm.state().pr == symbolAddress(output, "SAME"), "JZE should jump to SAME");
    require(vm.state().visualPath == casl::VisualPathKind::ConditionalJump_AddressToPr, "JZE taken visual path");
    (void)vm.step();
    require(vm.state().gr[2] == 0x0001, "GR2 after taken branch LAD");
}

void StepJzeNotTaken() {
    const auto output = assembleOrExit(R"(MAIN START
     LD    GR1,A
     CPA   GR1,B
     JZE   SAME
     LAD   GR2,0
     RET
SAME LAD   GR2,1
     RET
A    DC    10
B    DC    20
     END)");
    casl::CometVm vm;
    vm.load(output);
    (void)vm.step();
    (void)vm.step();
    const auto step = vm.step();
    require(step.ok, "JZE not taken should succeed");
    require(vm.state().pr == 0x26, "JZE should advance to next instruction");
    require(vm.state().visualPath == casl::VisualPathKind::ConditionalJump_NotTaken, "JZE not taken visual path");
    (void)vm.step();
    require(vm.state().gr[2] == 0x0000, "GR2 after not-taken branch LAD");
}

void StepJmiTaken() {
    const auto output = assembleOrExit(R"(MAIN START
     LD    GR1,A
     CPA   GR1,B
     JMI   LESS
     LAD   GR2,0
     RET
LESS LAD   GR2,1
     RET
A    DC    5
B    DC    10
     END)");
    casl::CometVm vm;
    vm.load(output);
    (void)vm.step();
    (void)vm.step();
    const auto step = vm.step();
    require(step.ok, "JMI taken should succeed");
    require(vm.state().pr == symbolAddress(output, "LESS"), "JMI should jump to LESS");
    require(vm.state().visualPath == casl::VisualPathKind::ConditionalJump_AddressToPr, "JMI taken visual path");
    (void)vm.step();
    require(vm.state().gr[2] == 0x0001, "GR2 after JMI taken branch LAD");
}

void AssembleNop() {
    const auto output = assembleOrExit(R"(MAIN START
     NOP
     RET
     END)");
    require(output.state.memory[0x20] == 0x0000, "NOP machine word");
    require(output.state.memory[0x21] == 0x8100, "RET should follow NOP");
    const auto entry = output.sourceMap.entryForAddress(0x20);
    require(entry.has_value() && entry->instruction == casl::InstructionKind::NOP, "NOP source map");
}

void ExecuteNopAdvancesPr() {
    const auto output = assembleOrExit(R"(MAIN START
     NOP
     RET
     END)");
    casl::CometVm vm;
    vm.load(output);
    const auto step = vm.step();
    require(step.ok, "NOP step should succeed");
    require(vm.state().pr == 0x21, "NOP should advance PR by one");
    require(vm.state().gr[1] == 0, "NOP should not modify GR");
    require(!vm.state().fr.z && !vm.state().fr.n && !vm.state().fr.o, "NOP should not modify FR");
    require(vm.state().visualPath == casl::VisualPathKind::None, "NOP visual path");
}

void AssembleAddlSubl() {
    const auto output = assembleOrExit(R"(MAIN START
     LD    GR1,A
     ADDL  GR1,B
     SUBL  GR1,C
     RET
A    DC    1
B    DC    2
C    DC    1
     END)");
    require(output.state.memory[0x22] == 0x2210, "ADDL machine word");
    require(output.state.memory[0x24] == 0x2310, "SUBL machine word");
}

void ExecuteAddlUnsigned() {
    const auto output = assembleOrExit(R"(MAIN START
     LD    GR1,A
     ADDL  GR1,B
     RET
A    DC    #FFFF
B    DC    1
     END)");
    casl::CometVm vm;
    vm.load(output);
    (void)vm.step();
    const auto step = vm.step();
    require(step.ok, "ADDL step should succeed");
    require(vm.state().gr[1] == 0x0000, "ADDL should wrap to zero");
    require(vm.state().fr.z && !vm.state().fr.n && vm.state().fr.o, "ADDL overflow flag");
    require(vm.state().lastRegisterWriteIndex.has_value() && *vm.state().lastRegisterWriteIndex == 1, "ADDL write register");
    require(vm.state().visualPath == casl::VisualPathKind::ADDA_GrMdrToAluToGr, "ADDL visual path");
}

void ExecuteSublUnsigned() {
    const auto output = assembleOrExit(R"(MAIN START
     LD    GR1,A
     SUBL  GR1,B
     RET
A    DC    0
B    DC    1
     END)");
    casl::CometVm vm;
    vm.load(output);
    (void)vm.step();
    const auto step = vm.step();
    require(step.ok, "SUBL step should succeed");
    require(vm.state().gr[1] == 0xffff, "SUBL should wrap to FFFF");
    require(!vm.state().fr.z && vm.state().fr.n && vm.state().fr.o, "SUBL overflow flag");
    require(vm.state().visualPath == casl::VisualPathKind::SUBA_GrMdrToAluToGr, "SUBL visual path");
}

void ExecuteAnd() {
    const auto output = assembleOrExit(R"(MAIN START
     LD    GR1,A
     AND   GR1,MASK
     RET
A    DC    #00F0
MASK DC    #0F0F
     END)");
    casl::CometVm vm;
    vm.load(output);
    (void)vm.step();
    const auto step = vm.step();
    require(step.ok, "AND step should succeed");
    require(vm.state().gr[1] == 0x0000, "AND result");
    require(vm.state().fr.z && !vm.state().fr.n && !vm.state().fr.o, "AND flags");
}

void ExecuteOr() {
    const auto output = assembleOrExit(R"(MAIN START
     LD    GR1,A
     OR    GR1,B
     RET
A    DC    #0001
B    DC    #0002
     END)");
    casl::CometVm vm;
    vm.load(output);
    (void)vm.step();
    const auto step = vm.step();
    require(step.ok, "OR step should succeed");
    require(vm.state().gr[1] == 0x0003, "OR result");
    require(!vm.state().fr.z && !vm.state().fr.n && !vm.state().fr.o, "OR flags");
}

void ExecuteXor() {
    const auto output = assembleOrExit(R"(MAIN START
     LD    GR1,A
     XOR   GR1,B
     RET
A    DC    #0003
B    DC    #0001
     END)");
    casl::CometVm vm;
    vm.load(output);
    (void)vm.step();
    const auto step = vm.step();
    require(step.ok, "XOR step should succeed");
    require(vm.state().gr[1] == 0x0002, "XOR result");
    require(!vm.state().fr.z && !vm.state().fr.n && !vm.state().fr.o, "XOR flags");
}

void ExecuteCplEqual() {
    const auto output = assembleOrExit(R"(MAIN START
     LD    GR1,A
     CPL   GR1,B
     RET
A    DC    #FFFF
B    DC    #FFFF
     END)");
    casl::CometVm vm;
    vm.load(output);
    (void)vm.step();
    const auto step = vm.step();
    require(step.ok, "CPL equal should succeed");
    require(vm.state().gr[1] == 0xffff, "CPL should not modify GR");
    require(vm.state().fr.z && !vm.state().fr.n && !vm.state().fr.o, "CPL equal flags");
    require(!vm.state().lastRegisterWriteIndex.has_value(), "CPL should not write register");
}

void ExecuteCplLess() {
    const auto output = assembleOrExit(R"(MAIN START
     LD    GR1,A
     CPL   GR1,B
     RET
A    DC    1
B    DC    2
     END)");
    casl::CometVm vm;
    vm.load(output);
    (void)vm.step();
    (void)vm.step();
    require(vm.state().fr.n && !vm.state().fr.z, "CPL less should set sign flag");
}

void ExecuteCplGreater() {
    const auto output = assembleOrExit(R"(MAIN START
     LD    GR1,A
     CPL   GR1,B
     RET
A    DC    #FFFF
B    DC    2
     END)");
    casl::CometVm vm;
    vm.load(output);
    (void)vm.step();
    (void)vm.step();
    require(!vm.state().fr.n && !vm.state().fr.z, "CPL greater should clear sign and zero flags");
}

void ExecuteJovTaken() {
    const auto output = assembleOrExit(R"(MAIN START
     LD    GR1,A
     ADDL  GR1,B
     JOV   OVER
     LAD   GR2,0
     RET
OVER LAD   GR2,1
     RET
A    DC    #FFFF
B    DC    1
     END)");
    casl::CometVm vm;
    vm.load(output);
    (void)vm.step();
    (void)vm.step();
    const auto step = vm.step();
    require(step.ok, "JOV taken should succeed");
    require(vm.state().pr == symbolAddress(output, "OVER"), "JOV should jump when OF is set");
    require(vm.state().visualPath == casl::VisualPathKind::ConditionalJump_AddressToPr, "JOV taken visual path");
}

void ExecuteJovNotTaken() {
    const auto output = assembleOrExit(R"(MAIN START
     LD    GR1,A
     ADDL  GR1,B
     JOV   OVER
     ST    GR1,RESULT
     RET
OVER LAD   GR1,999
     ST    GR1,RESULT
     RET
A    DC    1
B    DC    2
RESULT DS  1
     END)");
    casl::CometVm vm;
    vm.load(output);
    (void)vm.step();
    (void)vm.step();
    const auto step = vm.step();
    require(step.ok, "JOV not taken should succeed");
    require(vm.state().pr == 0x26, "JOV should fall through when OF is clear");
    require(vm.state().visualPath == casl::VisualPathKind::ConditionalJump_NotTaken, "JOV not taken visual path");
}

void AssembleShiftInstructions() {
    const auto output = assembleOrExit(R"(MAIN START
     LD    GR1,A
     SLL   GR1,1
     SRL   GR1,1
     SLA   GR1,1
     SRA   GR1,1
     RET
A    DC    3
     END)");
    require(output.state.memory[0x22] == 0x5210, "SLL machine word");
    require(output.state.memory[0x24] == 0x5310, "SRL machine word");
    require(output.state.memory[0x26] == 0x5010, "SLA machine word");
    require(output.state.memory[0x28] == 0x5110, "SRA machine word");
}

void ExecuteSllBasic() {
    const auto output = assembleOrExit(R"(MAIN START
     LD    GR1,A
     SLL   GR1,1
     RET
A    DC    3
     END)");
    casl::CometVm vm;
    vm.load(output);
    (void)vm.step();
    const auto step = vm.step();
    require(step.ok, "SLL step should succeed");
    require(vm.state().gr[1] == 0x0006, "SLL result");
    require(!vm.state().fr.z && !vm.state().fr.n && !vm.state().fr.o, "SLL flags");
    require(vm.state().lastRegisterWriteIndex.has_value() && *vm.state().lastRegisterWriteIndex == 1, "SLL write register");
    require(!vm.state().lastMemoryReadAddress.has_value(), "SLL should not read memory");
    require(vm.state().visualPath == casl::VisualPathKind::Shift_AddressToAluToGr, "SLL visual path");
}

void ExecuteSrlBasic() {
    const auto output = assembleOrExit(R"(MAIN START
     LD    GR1,A
     SRL   GR1,1
     RET
A    DC    6
     END)");
    casl::CometVm vm;
    vm.load(output);
    (void)vm.step();
    (void)vm.step();
    require(vm.state().gr[1] == 0x0003, "SRL result");
}

void ExecuteSlaBasic() {
    const auto output = assembleOrExit(R"(MAIN START
     LD    GR1,A
     SLA   GR1,1
     RET
A    DC    #8001
     END)");
    casl::CometVm vm;
    vm.load(output);
    (void)vm.step();
    (void)vm.step();
    require(vm.state().gr[1] == 0x8002, "SLA should preserve sign bit");
    require(!vm.state().fr.z && vm.state().fr.n && !vm.state().fr.o, "SLA flags");
}

void ExecuteSraPreservesSign() {
    const auto output = assembleOrExit(R"(MAIN START
     LD    GR1,A
     SRA   GR1,1
     RET
A    DC    #8002
     END)");
    casl::CometVm vm;
    vm.load(output);
    (void)vm.step();
    (void)vm.step();
    require(vm.state().gr[1] == 0xc001, "SRA should preserve sign bit");
    require(!vm.state().fr.z && vm.state().fr.n && !vm.state().fr.o, "SRA flags");
}

void ShiftUpdatesOverflowWhenBitShiftedOut() {
    const auto output = assembleOrExit(R"(MAIN START
     LD    GR1,A
     SLL   GR1,1
     RET
A    DC    #8000
     END)");
    casl::CometVm vm;
    vm.load(output);
    (void)vm.step();
    (void)vm.step();
    require(vm.state().gr[1] == 0x0000, "SLL shifted out result");
    require(vm.state().fr.z && !vm.state().fr.n && vm.state().fr.o, "SLL should set OF");
}

void ShiftCountZeroNoChange() {
    const auto output = assembleOrExit(R"(MAIN START
     LD    GR1,A
     SLL   GR1,0
     RET
A    DC    #8001
     END)");
    casl::CometVm vm;
    vm.load(output);
    (void)vm.step();
    (void)vm.step();
    require(vm.state().gr[1] == 0x8001, "SLL count zero no value change");
    require(!vm.state().fr.z && vm.state().fr.n && !vm.state().fr.o, "SLL count zero flags");
}

void ShiftCountLargeLogicalStableBehavior() {
    const auto logical = assembleOrExit(R"(MAIN START
     LD    GR1,A
     SLL   GR1,16
     RET
A    DC    #0001
     END)");
    casl::CometVm logicalVm;
    logicalVm.load(logical);
    (void)logicalVm.step();
    (void)logicalVm.step();
    require(logicalVm.state().gr[1] == 0x0000, "SLL count 16 should be stable zero");
}

void ShiftCountLargeArithmeticStableBehavior() {
    const auto arithmetic = assembleOrExit(R"(MAIN START
     LD    GR1,A
     SRA   GR1,16
     RET
A    DC    #8000
     END)");
    casl::CometVm arithmeticVm;
    arithmeticVm.load(arithmetic);
    (void)arithmeticVm.step();
    (void)arithmeticVm.step();
    require(arithmeticVm.state().gr[1] == 0xffff, "SRA count 16 should preserve sign");
}

void AssembleIndexAddressing() {
    const auto output = assembleOrExit(R"(MAIN START
     LD    GR1,A,GR2
     ST    GR1,A,GR3
     JUMP  MAIN,GR4
     SLL   GR1,1,GR2
A    DC    10
     END)");

    require(output.state.memory[0x20] == 0x1012, "LD indexed machine word");
    require(output.state.memory[0x22] == 0x1113, "ST indexed machine word");
    require(output.state.memory[0x24] == 0x6404, "JUMP indexed machine word");
    require(output.state.memory[0x26] == 0x5212, "SLL indexed machine word");
    require(output.instructions[0].indexRegister == 2, "LD index register");
}

void RejectGr0AsIndexRegister() {
    casl::Assembler assembler;
    auto result = assembler.assemble(R"(MAIN START
     LD    GR1,A,GR0
A    DC    10
     END)");
    require(!result.ok, "GR0 index should fail");
    require(!result.diagnostics.empty(), "GR0 index diagnostic");
}

void ExecuteLdStWithIndex() {
    const auto output = assembleOrExit(R"(MAIN START
     LAD   GR2,1
     LD    GR1,A,GR2
     ST    GR1,RESULT,GR2
     RET
A    DC    10
B    DC    20
RESULT DS  2
     END)");
    casl::CometVm vm;
    vm.load(output);
    (void)vm.step();
    (void)vm.step();
    require(vm.state().gr[1] == 20, "LD should read effective address B");
    require(vm.state().lastBaseAddress.has_value() && *vm.state().lastBaseAddress == symbolAddress(output, "A"), "LD base address");
    require(vm.state().lastIndexRegister.has_value() && *vm.state().lastIndexRegister == 2, "LD index register");
    require(vm.state().lastIndexValue.has_value() && *vm.state().lastIndexValue == 1, "LD index value");
    require(vm.state().lastEffectiveAddress.has_value() && *vm.state().lastEffectiveAddress == symbolAddress(output, "B"), "LD effective address");
    require(vm.state().lastMemoryReadAddress.has_value() && *vm.state().lastMemoryReadAddress == symbolAddress(output, "B"), "LD effective read address");

    (void)vm.step();
    require(vm.state().lastMemoryWriteAddress.has_value() && *vm.state().lastMemoryWriteAddress == static_cast<std::uint16_t>(symbolAddress(output, "RESULT") + 1), "ST effective write address");
    require(vm.state().memory[static_cast<std::uint16_t>(symbolAddress(output, "RESULT") + 1)] == 20, "ST indexed write value");
}

void ExecuteLadJumpShiftWithIndex() {
    const auto output = assembleOrExit(R"(MAIN START
     LAD   GR2,1
     LAD   GR1,A,GR2
     SLL   GR1,0,GR2
     JUMP  DONE,GR2
SKIP RET
DONE RET
A    DC    10
     END)");
    casl::CometVm vm;
    vm.load(output);
    (void)vm.step();
    (void)vm.step();
    require(vm.state().gr[1] == static_cast<std::uint16_t>(symbolAddress(output, "A") + 1), "LAD should load effective address");
    require(!vm.state().lastMemoryReadAddress.has_value(), "LAD indexed should not read memory");

    (void)vm.step();
    require(vm.state().gr[1] == static_cast<std::uint16_t>((symbolAddress(output, "A") + 1) << 1), "SLL indexed effective count");
    require(!vm.state().lastMemoryReadAddress.has_value(), "SLL indexed should not read memory");

    (void)vm.step();
    require(vm.state().pr == static_cast<std::uint16_t>(symbolAddress(output, "DONE") + 1), "JUMP indexed effective target");
}

void AssemblePushPop() {
    const auto output = assembleOrExit(R"(MAIN START
     LAD   GR2,1
     PUSH  A,GR2
     POP   GR1
     RET
A    DC    10
B    DC    20
     END)");
    require(output.state.memory[0x22] == 0x7002, "PUSH machine word");
    require(output.state.memory[0x23] == symbolAddress(output, "A"), "PUSH operand word");
    require(output.state.memory[0x24] == 0x7110, "POP machine word");
}

void RejectInvalidPushPopOperands() {
    casl::Assembler assembler;
    const auto missingPush = assembler.assemble("MAIN START\n PUSH\n END");
    const auto missingPop = assembler.assemble("MAIN START\n POP\n END");
    const auto indexedPop = assembler.assemble("MAIN START\n POP GR1,GR2\n END");
    require(!missingPush.ok && hasError(missingPush, "PUSH requires an address operand"), "PUSH missing operand should fail");
    require(!missingPop.ok && hasError(missingPop, "POP requires a register operand"), "POP missing register should fail");
    require(!indexedPop.ok && hasError(indexedPop, "POP does not support index operands"), "POP index should fail");
}

void ExecutePushPopStack() {
    const auto output = assembleOrExit(R"(MAIN START
     LAD   GR2,1
     PUSH  A,GR2
     POP   GR1
     ST    GR1,RESULT
     RET
A    DC    10
B    DC    20
RESULT DS  1
     END)");
    casl::CometVm vm;
    vm.load(output);
    (void)vm.step();
    const auto pushStep = vm.step();
    require(pushStep.instructionKind.has_value() && *pushStep.instructionKind == casl::InstructionKind::PUSH, "PUSH step kind");
    require(vm.state().sp == 0xfffd, "PUSH decrements SP");
    require(vm.state().mdr == symbolAddress(output, "B"), "PUSH MDR effective address");
    require(vm.state().memory[0xfffd] == symbolAddress(output, "B"), "PUSH stack write value");
    require(vm.state().lastMemoryWriteAddress.has_value() && *vm.state().lastMemoryWriteAddress == 0xfffd, "PUSH write address");
    require(!vm.state().lastMemoryReadAddress.has_value(), "PUSH should not read memory data");
    require(vm.state().visualPath == casl::VisualPathKind::PUSH_EffectiveAddressToStack, "PUSH visual path");

    const auto popStep = vm.step();
    require(popStep.instructionKind.has_value() && *popStep.instructionKind == casl::InstructionKind::POP, "POP step kind");
    require(vm.state().gr[1] == symbolAddress(output, "B"), "POP loads target register");
    require(vm.state().sp == 0xfffe, "POP increments SP");
    require(vm.state().lastMemoryReadAddress.has_value() && *vm.state().lastMemoryReadAddress == 0xfffd, "POP read address");
    require(vm.state().lastRegisterWriteIndex.has_value() && *vm.state().lastRegisterWriteIndex == 1, "POP write index");
    require(vm.state().visualPath == casl::VisualPathKind::POP_StackToGr, "POP visual path");
}

void PushPopStackPointerWrap() {
    auto output = assembleOrExit(R"(MAIN START
     PUSH  VALUE
     POP   GR1
     RET
VALUE DC   1
     END)");
    output.state.sp = 0x0000;
    casl::CometVm vm;
    vm.load(output);
    (void)vm.step();
    require(vm.state().sp == 0xffff, "PUSH SP wrap");
    require(vm.state().lastMemoryWriteAddress.has_value() && *vm.state().lastMemoryWriteAddress == 0xffff, "PUSH wrapped write address");
    (void)vm.step();
    require(vm.state().sp == 0x0000, "POP SP wrap");
    require(vm.state().gr[1] == symbolAddress(output, "VALUE"), "POP wrapped stack value");
}

void AssembleCall() {
    const auto output = assembleOrExit(R"(MAIN START
     CALL  SUB
     RET
SUB  RET
     END)");
    require(output.state.memory[0x20] == 0x8000, "CALL machine word");
    require(output.state.memory[0x21] == symbolAddress(output, "SUB"), "CALL operand word");
}

void AssembleCallWithIndex() {
    const auto output = assembleOrExit(R"(MAIN START
     LAD   GR2,1
     CALL  SUB,GR2
     RET
SUB  RET
NEXT RET
     END)");
    require(output.state.memory[0x22] == 0x8002, "CALL indexed machine word");
}

void RejectCallWithoutAddress() {
    casl::Assembler assembler;
    const auto missingCall = assembler.assemble("MAIN START\n CALL\n END");
    require(!missingCall.ok && hasError(missingCall, "CALL requires an address operand"), "CALL missing operand should fail");
}

void ExecuteCallReturnStack() {
    const auto output = assembleOrExit(R"(MAIN START
     LAD   GR1,5
     CALL  SUB
     ST    GR1,RESULT
     RET
SUB  ADDA  GR1,ONE
     RET
ONE  DC    1
RESULT DS  1
     END)");
    casl::CometVm vm;
    vm.load(output);
    (void)vm.step();
    const auto callStep = vm.step();
    require(callStep.instructionKind.has_value() && *callStep.instructionKind == casl::InstructionKind::CALL, "CALL step kind");
    require(vm.state().sp == 0xfffd, "CALL decrements SP");
    require(vm.state().memory[0xfffd] == 0x0024, "CALL pushes return address");
    require(vm.state().pr == symbolAddress(output, "SUB"), "CALL jumps to subroutine");
    require(vm.state().callDepth == 1, "CALL increments call depth");
    require(vm.state().visualPath == casl::VisualPathKind::CALL_ReturnAddressToStackAndPr, "CALL visual path");

    (void)vm.step();
    const auto retStep = vm.step();
    require(retStep.instructionKind.has_value() && *retStep.instructionKind == casl::InstructionKind::RET, "RET stack step kind");
    require(!retStep.finished, "RET inside call frame should not finish");
    require(vm.state().pr == 0x0024, "RET returns to caller ST");
    require(vm.state().sp == 0xfffe, "RET stack return increments SP");
    require(vm.state().callDepth == 0, "RET stack return decrements call depth");
    require(vm.state().lastMemoryReadAddress.has_value() && *vm.state().lastMemoryReadAddress == 0xfffd, "RET stack read address");
    require(vm.state().visualPath == casl::VisualPathKind::RET_StackToPr, "RET stack visual path");

    (void)vm.step();
    (void)vm.step();
    require(vm.state().runState == casl::RunState::Finished, "Final top-level RET finishes");
    require(vm.state().memory[symbolAddress(output, "RESULT")] == 0x0006, "CALL return result");
}

void ExecuteCallWithIndex() {
    const auto output = assembleOrExit(R"(MAIN START
     LAD   GR2,1
     CALL  BASE,GR2
     RET
BASE RET
NEXT LAD   GR1,7
     RET
     END)");
    casl::CometVm vm;
    vm.load(output);
    (void)vm.step();
    (void)vm.step();
    require(vm.state().pr == symbolAddress(output, "BASE") + 1, "CALL indexed effective target");
    require(vm.state().callDepth == 1, "CALL indexed call depth");
}

void NestedCallReturnOrder() {
    const auto output = assembleOrExit(R"(MAIN START
     CALL  SUB
     ST    GR1,RESULT
     RET
SUB  CALL  INNER
     RET
INNER LAD   GR1,7
     RET
RESULT DS  1
     END)");
    casl::CometVm vm;
    vm.load(output);
    for (int step = 0; step < 12 && vm.state().runState != casl::RunState::Finished; ++step) {
        (void)vm.step();
    }
    require(vm.state().runState == casl::RunState::Finished, "Nested CALL program finishes");
    require(vm.state().callDepth == 0, "Nested CALL callDepth returns to zero");
    require(vm.state().memory[symbolAddress(output, "RESULT")] == 7, "Nested CALL result");
}

void ManualPushPopDoesNotChangeCallDepth() {
    casl::CometVm vm;
    vm.load(assembleOrExit(R"(MAIN START
     PUSH  VALUE
     POP   GR1
     RET
VALUE DC   1
     END)"));
    (void)vm.step();
    (void)vm.step();
    require(vm.state().callDepth == 0, "Manual PUSH/POP does not change callDepth");
}

void StepStore() {
    casl::CometVm vm;
    vm.load(assembleSample());
    (void)vm.step();
    (void)vm.step();
    const auto step = vm.step();
    require(step.ok, "ST step should succeed");
    require(step.instructionKind.has_value() && *step.instructionKind == casl::InstructionKind::ST, "StepResult ST kind");
    require(vm.state().pr == 0x26, "PR after ST");
    require(vm.state().memory[0x29] == 0x001e, "Memory[0029] after ST");
    require(vm.state().lastInstructionKind.has_value() && *vm.state().lastInstructionKind == casl::InstructionKind::ST, "state last ST kind");
    require(vm.state().lastMemoryWriteAddress.has_value() && *vm.state().lastMemoryWriteAddress == 0x29, "ST write address");
    require(!vm.state().lastMemoryReadAddress.has_value(), "ST should not report a memory read");
    require(vm.state().visualPath == casl::VisualPathKind::ST_GrToMdrToMemory, "ST visual path");
}

void StepRetFinished() {
    casl::CometVm vm;
    vm.load(assembleSample());
    (void)vm.step();
    (void)vm.step();
    (void)vm.step();
    const auto step = vm.step();
    require(step.ok, "RET step should succeed");
    require(step.finished, "RET should finish");
    require(vm.state().runState == casl::RunState::Finished, "RunState after RET");
    require(vm.state().visualPath == casl::VisualPathKind::Finished_None, "RET visual path");
    require(vm.state().lastInstructionKind.has_value() && *vm.state().lastInstructionKind == casl::InstructionKind::RET, "state last RET kind");
}

void ExecuteGr2Program() {
    const auto output = assembleOrExit(R"(MAIN START
     LD    GR2,X
     ADDA  GR2,Y
     ST    GR2,Z
     RET
X    DC    3
Y    DC    4
Z    DS    1
     END)");

    casl::CometVm vm;
    vm.load(output);

    (void)vm.step();
    require(vm.state().gr[2] == 0x0003, "GR2 after LD");
    require(vm.state().gr[1] == 0x0000, "GR1 should stay zero after GR2 LD");
    require(vm.state().lastRegisterWriteIndex.has_value() && *vm.state().lastRegisterWriteIndex == 2, "GR2 LD write index");

    (void)vm.step();
    require(vm.state().gr[2] == 0x0007, "GR2 after ADDA");
    require(vm.state().lastRegisterWriteIndex.has_value() && *vm.state().lastRegisterWriteIndex == 2, "GR2 ADDA write index");

    (void)vm.step();
    require(vm.state().memory[symbolAddress(output, "Z")] == 0x0007, "Z after ST");
    require(vm.state().lastMemoryWriteAddress.has_value() && *vm.state().lastMemoryWriteAddress == symbolAddress(output, "Z"), "GR2 ST write address");
}

void Run_ShouldStopAtMaxSteps() {
    casl::CometVm vm;
    vm.load(assembleSample());
    const auto result = vm.run(0);
    require(!result.ok, "run with zero max steps should fail");
    require(result.stoppedAtMaxSteps, "run should report max step guard");
    require(vm.state().runState == casl::RunState::Error, "run max step state");
    require(!result.diagnostics.empty() && result.diagnostics.front().code == "vm.stepLimitReached", "run max step structured code");
}

void VmStructuredDiagnostics() {
    casl::CometVm unloaded;
    const auto notLoaded = unloaded.step();
    require(!notLoaded.ok, "unloaded step should fail");
    require(!notLoaded.diagnostics.empty() && notLoaded.diagnostics.front().code == "vm.notLoaded", "not-loaded structured code");

    casl::CometVm invalidInstruction;
    invalidInstruction.load(assembleSample());
    require(invalidInstruction.setProgramCounter(0x0100), "set unused in-range PR");
    const auto invalid = invalidInstruction.step();
    require(!invalid.ok, "missing instruction should fail");
    require(!invalid.diagnostics.empty() && invalid.diagnostics.front().code == "vm.invalidInstruction", "invalid-instruction structured code");
}

void MemoryAccess_OutOfRange_ShouldError() {
    casl::CometVm vm;
    vm.load(assembleSample());
    require(!vm.readMemory(0x10000).has_value(), "read beyond memory should fail");
    require(!vm.setProgramCounter(0x10000), "setting PR beyond memory should fail");
    require(vm.state().runState == casl::RunState::Error, "out-of-range PR should enter error");
}

void AssemblePhase20RegisterFormsAndLiterals() {
    const auto output = assembleOrExit(R"(MAIN START
STL00001 DC 9
 LD GR1,GR2
 ADDA GR1,GR2
 SUBA GR1,GR2
 ADDL GR1,GR2
 SUBL GR1,GR2
 AND GR1,GR2
 OR GR1,GR2
 XOR GR1,GR2
 CPA GR1,GR2
 CPL GR1,GR2
 LD GR3,=10
 LD GR4,=#1234
 LD GR5,='A'
 RET
 END)");
    const std::array<std::uint16_t, 10> expected{
        0x1412, 0x2412, 0x2512, 0x2612, 0x2712,
        0x3412, 0x3512, 0x3612, 0x4412, 0x4512
    };
    for (std::size_t index = 0; index < expected.size(); ++index) {
        require(output.state.memory[0x21 + index] == expected[index], "register form machine word");
        require(output.instructions[index].size == 1, "register form size");
        require(output.instructions[index].sourceRegister.has_value() && *output.instructions[index].sourceRegister == 2, "register source metadata");
    }
    require(output.symbols.contains("STL00002"), "generated literal avoids user label");
    require(output.state.memory[symbolAddress(output, "STL00002")] == 10, "decimal literal");
    require(output.state.memory[symbolAddress(output, "STL00003")] == 0x1234, "hex literal");
    require(output.state.memory[symbolAddress(output, "STL00004")] == 0x0041, "character literal");
}

void ExecutePhase20StandardMacrosAndIo() {
    const auto output = assembleOrExit(R"(MAIN START
 IN BUF,LEN
 OUT BUF,LEN
 RET
BUF DS 256
LEN DS 1
 END)");
    require(output.instructions.size() == 15, "IN/OUT expansion count plus RET");
    require(output.instructions[4].opcode == casl::Opcode::SVC, "IN expansion uses real SVC");
    require(output.instructions[11].opcode == casl::Opcode::SVC, "OUT expansion uses real SVC");

    casl::CometVm vm;
    vm.load(output);
    for (int step = 0; step < 5; ++step) (void)vm.step();
    require(vm.state().runState == casl::RunState::WaitingInput, "IN waits without blocking");
    vm.enqueueInput({0x41, 0x42, 0x43});
    const auto input = vm.step();
    require(input.ok, "queued input resumes SVC");
    require(vm.state().memory[symbolAddress(output, "LEN")] == 3, "IN stores length");
    require(vm.state().memory[symbolAddress(output, "BUF")] == 0x41, "IN stores first byte");

    const auto run = vm.run(32);
    require(run.ok, "I/O macro program should finish");
    require(vm.state().runState == casl::RunState::Finished, "I/O macro program finished");
    require(vm.state().consoleOutput.size() == 1, "OUT emitted one record");
    require(vm.state().consoleOutput.front() == std::vector<std::uint16_t>({0x41, 0x42, 0x43}), "OUT record bytes");
    require(vm.state().sp == casl::kDefaultStackPointer, "IN/OUT preserve SP");
}

void ReloadPhase20DsInitialization() {
    const auto output = assembleOrExit(R"(MAIN START
 LAD GR1,#4321
 ST GR1,SPACE
 RET
CONST DC #1234
SPACE DS 2
 END)");
    casl::CometVm vm;
    vm.load(output);
    (void)vm.step();
    (void)vm.step();
    require(vm.state().memory[symbolAddress(output, "SPACE")] == 0x4321, "pre-reload write");

    vm.reload(0xffff);
    require(vm.state().memory[symbolAddress(output, "CONST")] == 0x1234, "reload preserves DC");
    require(vm.state().memory[symbolAddress(output, "SPACE")] == 0xffff, "reload fills first DS word");
    require(vm.state().memory[symbolAddress(output, "SPACE") + 1] == 0xffff, "reload fills second DS word");
    require(vm.state().pr == output.entryPoint, "reload restores entry point");
    require(vm.state().sp == casl::kDefaultStackPointer, "reload restores SP");
    require(vm.state().consoleOutput.empty(), "reload clears console output");
}

void DebuggerMutationChangesOnlyTarget() {
    const auto output = assembleSample();
    casl::CometVm vm;
    vm.load(output);
    const auto initialMemory = vm.state().memory;
    const auto initialPr = vm.state().pr;

    require(vm.writeGeneralRegister(2, 0x0042), "GR2 debugger write applies");
    require(vm.state().gr[2] == 0x0042, "GR2 debugger value");
    require(vm.state().gr[1] == 0x0000, "other GR unchanged");
    require(vm.state().pr == initialPr, "register edit does not advance PR");
    require(vm.state().stepCount == 0, "register edit does not increment step count");
    require(vm.state().memory == initialMemory, "register edit does not change memory");

    require(vm.setProgramCounter(0x0022), "PR debugger write applies");
    require(vm.state().pr == 0x0022, "PR debugger value");
    require(vm.setStackPointer(0x8123), "SP debugger write applies");
    require(vm.state().sp == 0x8123, "SP debugger value");
    vm.setFlagsPacked(0x0007);
    require(vm.state().fr.packed() == 0x0007, "FR debugger write uses the three official flag bits");
}

void RuntimeProgramOverrideExecutesAndInvalidFails() {
    const auto output = assembleOrExit(R"(MAIN START
 LAD GR2,#0003
 RET
 END)");
    casl::CometVm vm;
    vm.load(output);
    const auto start = output.entryPoint;
    const auto originalWord = vm.state().memory[start];

    require(vm.writeMemory(start, 0x0000), "program word override applies");
    const auto nop = vm.step();
    require(nop.ok, "runtime NOP override executes");
    require(vm.state().lastInstructionKind == casl::Opcode::NOP, "runtime decoder reports NOP");
    require(vm.state().gr[2] == 0x0000, "overridden LAD does not execute");
    require(vm.state().pr == static_cast<std::uint16_t>(start + 1), "runtime NOP advances one word");

    vm.reload(std::nullopt);
    require(vm.state().memory[start] == originalWord, "reload restores assembled program word");
    require(vm.writeMemory(start, 0xffff), "invalid runtime opcode write applies");
    const auto invalid = vm.step();
    require(!invalid.ok, "invalid runtime opcode fails at execution");
    require(vm.state().runState == casl::RunState::Error, "invalid runtime opcode uses VM Error state");
    require(vm.state().stepCount == 0, "invalid runtime opcode does not increment step count");
}

void FullClearUnloadsVm() {
    const auto output = assembleSample();
    casl::CometVm vm;
    vm.load(output);
    require(vm.writeGeneralRegister(1, 0x0042), "pre-clear mutation applies");
    require(vm.writeMemory(output.entryPoint, 0x0000), "pre-clear program override applies");

    vm.fullClear();
    require(vm.state().runState == casl::RunState::Idle, "full clear returns Idle state");
    require(vm.state().stepCount == 0, "full clear resets step count");
    require(vm.state().gr == std::array<std::uint16_t, casl::kGeneralRegisterCount>{}, "full clear zeroes GRs");
    require(vm.state().fr.packed() == 0, "full clear zeroes FR");
    require(!vm.writeGeneralRegister(1, 0x0001), "full clear removes loaded ownership");
    require(!vm.step().ok, "full-cleared VM cannot execute");
}

std::vector<casl::MicrocyclePhase> completeOneMicroInstruction(casl::CometVm& vm) {
    std::vector<casl::MicrocyclePhase> phases;
    for (int guard = 0; guard < 16; ++guard) {
        const auto micro = vm.stepMicrocycle();
        require(micro.ok, "microcycle should execute");
        phases.push_back(micro.phase);
        if (micro.instructionComplete) return phases;
    }
    require(false, "microcycle instruction should complete within the phase bound");
    return phases;
}

void MicrocycleAllOfficialInstructions() {
    const std::vector<std::pair<std::string, std::string>> instructions{
        {"NOP", "NOP"}, {"LD", "LD GR1,DATA"}, {"ST", "ST GR1,DATA"}, {"LAD", "LAD GR1,DATA"},
        {"ADDA", "ADDA GR1,DATA"}, {"SUBA", "SUBA GR1,DATA"}, {"ADDL", "ADDL GR1,DATA"},
        {"SUBL", "SUBL GR1,DATA"}, {"AND", "AND GR1,DATA"}, {"OR", "OR GR1,DATA"},
        {"XOR", "XOR GR1,DATA"}, {"CPA", "CPA GR1,DATA"}, {"CPL", "CPL GR1,DATA"},
        {"SLA", "SLA GR1,1"}, {"SRA", "SRA GR1,1"}, {"SLL", "SLL GR1,1"}, {"SRL", "SRL GR1,1"},
        {"JMI", "JMI TARGET"}, {"JNZ", "JNZ TARGET"}, {"JZE", "JZE TARGET"}, {"JUMP", "JUMP TARGET"},
        {"JPL", "JPL TARGET"}, {"JOV", "JOV TARGET"}, {"PUSH", "PUSH 0,GR1"}, {"POP", "POP GR1"},
        {"CALL", "CALL TARGET"}, {"RET", "RET"}, {"SVC", "SVC 2"}
    };

    for (const auto& [name, sourceLine] : instructions) {
        const auto output = assembleOrExit(
            "MAIN START\n     " + sourceLine + "\nTARGET RET\nDATA DC 1\n     END"
        );
        casl::CometVm vm;
        vm.load(output);
        const auto phases = completeOneMicroInstruction(vm);
        require(!phases.empty(), "official instruction should have microcycle phases");
        require(phases.front() == casl::MicrocyclePhase::Fetch, "official instruction starts with fetch");
        require(phases.back() == casl::MicrocyclePhase::Complete, "official instruction ends with complete");
        require(vm.state().stepCount == 1, "one completed microcycle instruction increments instruction count once");
        require(vm.state().microcycle.instructionComplete, "complete phase marks instruction complete");
        require(vm.state().lastInstructionKind.has_value(), "microcycle keeps decoded instruction kind");
        (void)name;
    }
}

void MicrocycleLdPhaseBoundaries() {
    const auto output = assembleOrExit(R"(MAIN START
     LD GR1,DATA
     RET
DATA DC #8000
     END)");
    casl::CometVm vm;
    vm.load(output);
    const auto data = symbolAddress(output, "DATA");
    const auto initialPr = vm.state().pr;

    require(vm.stepMicrocycle().phase == casl::MicrocyclePhase::Fetch, "LD fetch phase");
    require(vm.state().ir == vm.state().memory[initialPr], "fetch loads IR from instruction memory");
    require(vm.state().gr[1] == 0, "fetch does not write destination GR");

    require(vm.stepMicrocycle().phase == casl::MicrocyclePhase::Decode, "LD decode phase");
    require(vm.state().gr[1] == 0, "decode does not write destination GR");

    require(vm.stepMicrocycle().phase == casl::MicrocyclePhase::EffectiveAddress, "LD EA phase");
    require(vm.state().mar == data, "EA commits data address to MAR");

    require(vm.stepMicrocycle().phase == casl::MicrocyclePhase::OperandRead, "LD operand-read phase");
    require(vm.state().mdr == 0x8000, "operand read commits data to MDR");
    require(vm.state().gr[1] == 0, "operand read does not write destination GR");

    require(vm.stepMicrocycle().phase == casl::MicrocyclePhase::Execute, "LD execute phase");
    require(vm.state().gr[1] == 0, "execute stages result without architectural GR write");

    require(vm.stepMicrocycle().phase == casl::MicrocyclePhase::WriteBack, "LD write-back phase");
    require(vm.state().gr[1] == 0x8000, "write-back updates destination GR");
    require(vm.state().fr.packed() == 0, "write-back does not update FR");

    require(vm.stepMicrocycle().phase == casl::MicrocyclePhase::FlagUpdate, "LD flag phase");
    require(vm.state().fr.n && !vm.state().fr.o && !vm.state().fr.z, "flag phase updates official OF/SF/ZF");

    const auto complete = vm.stepMicrocycle();
    require(complete.phase == casl::MicrocyclePhase::Complete, "LD complete phase");
    require(complete.instructionComplete, "LD complete marks instruction boundary");
    require(vm.state().pr == static_cast<std::uint16_t>(initialPr + 2), "complete advances PR");
}

void MicrocycleCallRetAndBranch() {
    const auto output = assembleOrExit(R"(MAIN START
     CALL SUB
     RET
SUB  JUMP DONE
DONE RET
     END)");
    casl::CometVm vm;
    vm.load(output);
    const auto initialSp = vm.state().sp;

    const auto callPhases = completeOneMicroInstruction(vm);
    require(callPhases == std::vector<casl::MicrocyclePhase>({
        casl::MicrocyclePhase::Fetch,
        casl::MicrocyclePhase::Decode,
        casl::MicrocyclePhase::EffectiveAddress,
        casl::MicrocyclePhase::Execute,
        casl::MicrocyclePhase::WriteBack,
        casl::MicrocyclePhase::Complete
    }), "CALL phase order");
    require(vm.state().sp == static_cast<std::uint16_t>(initialSp - 1), "CALL decrements SP");
    require(vm.state().callDepth == 1, "CALL increments depth");

    const auto branchTarget = symbolAddress(output, "DONE");
    for (int index = 0; index < 3; ++index) {
        require(vm.stepMicrocycle().ok, "JUMP pre-execute phase");
    }
    require(vm.state().pr != branchTarget, "branch target is not committed before execute");
    const auto branchExecute = vm.stepMicrocycle();
    require(branchExecute.phase == casl::MicrocyclePhase::Execute, "JUMP execute phase");
    require(vm.state().pr == branchTarget, "JUMP commits PR during execute");
    while (!vm.state().microcycle.instructionComplete) {
        require(vm.stepMicrocycle().ok, "JUMP completion");
    }

    const auto retPhases = completeOneMicroInstruction(vm);
    require(retPhases == std::vector<casl::MicrocyclePhase>({
        casl::MicrocyclePhase::Fetch,
        casl::MicrocyclePhase::Decode,
        casl::MicrocyclePhase::OperandRead,
        casl::MicrocyclePhase::Execute,
        casl::MicrocyclePhase::WriteBack,
        casl::MicrocyclePhase::Complete
    }), "RET phase order");
    require(vm.state().sp == initialSp, "RET restores SP");
    require(vm.state().callDepth == 0, "RET decrements depth");
}

void InstructionAndMicrocycleParity() {
    const auto output = assembleSample();
    casl::CometVm instructionVm;
    casl::CometVm microcycleVm;
    instructionVm.load(output);
    microcycleVm.load(output);

    for (int instruction = 0; instruction < 4; ++instruction) {
        require(instructionVm.step().ok, "instruction mode step");
        completeOneMicroInstruction(microcycleVm);
        const auto& expected = instructionVm.state();
        const auto& actual = microcycleVm.state();
        require(actual.pr == expected.pr, "microcycle PR parity");
        require(actual.sp == expected.sp, "microcycle SP parity");
        require(actual.callDepth == expected.callDepth, "microcycle call-depth parity");
        require(actual.ir == expected.ir && actual.mar == expected.mar && actual.mdr == expected.mdr, "microcycle register parity");
        require(actual.gr == expected.gr, "microcycle GR parity");
        require(actual.fr.packed() == expected.fr.packed(), "microcycle FR parity");
        require(actual.memory == expected.memory, "microcycle memory parity");
        require(actual.stepCount == expected.stepCount, "microcycle instruction-count parity");
        require(actual.runState == expected.runState, "microcycle run-state parity");
    }
}

casl::ReverseMicrostepResult reverseLatest(casl::CometVm& vm) {
    return vm.reverseMicrocycle(vm.state().historyEpoch, vm.state().timelineRevision);
}

void ReverseMicrocycleRestoresFetchAndWriteBack() {
    const auto output = assembleOrExit(R"(MAIN START
     LD GR1,DATA
     RET
DATA DC #8000
     END)");
    casl::CometVm vm;
    vm.load(output);
    const auto initial = vm.state();

    require(vm.stepMicrocycle().phase == casl::MicrocyclePhase::Fetch, "forward fetch");
    const auto reversedFetch = reverseLatest(vm);
    require(reversedFetch.status == casl::ReverseMicrostepStatus::Reversed, "fetch reverses");
    require(vm.state().pr == initial.pr && vm.state().ir == initial.ir, "fetch restores PR and IR");
    require(vm.state().mar == initial.mar && vm.state().mdr == initial.mdr, "fetch restores MAR and MDR");
    require(vm.state().microcycle.phase == casl::MicrocyclePhase::None, "fetch restores pre-fetch phase");

    for (int index = 0; index < 6; ++index) require(vm.stepMicrocycle().ok, "advance through LD write-back");
    require(vm.state().gr[1] == 0x8000, "LD write-back applied");
    const auto reversedWriteBack = reverseLatest(vm);
    require(reversedWriteBack.status == casl::ReverseMicrostepStatus::Reversed, "write-back reverses");
    require(vm.state().gr[1] == 0, "write-back restores destination register");
    require(vm.state().microcycle.phase == casl::MicrocyclePhase::Execute, "write-back restores execute phase");
}

void ReverseMicrocycleRestoresMemoryAndStack() {
    const auto output = assembleOrExit(R"(MAIN START
     LAD GR1,#0042
     ST GR1,DATA
     PUSH 0,GR1
     RET
DATA DS 1
     END)");
    casl::CometVm vm;
    vm.load(output);
    completeOneMicroInstruction(vm);
    const auto data = symbolAddress(output, "DATA");
    const auto dataBefore = vm.state().memory[data];
    while (vm.state().lastInstructionKind != casl::Opcode::ST || vm.state().microcycle.phase != casl::MicrocyclePhase::WriteBack) {
        require(vm.stepMicrocycle().ok, "advance to ST write-back");
    }
    require(vm.state().memory[data] == 0x0042, "ST committed memory");
    require(reverseLatest(vm).status == casl::ReverseMicrostepStatus::Reversed, "ST memory write reverses");
    require(vm.state().memory[data] == dataBefore, "ST reverse restores memory word");

    completeOneMicroInstruction(vm);
    const auto spBeforePush = vm.state().sp;
    while (vm.state().lastInstructionKind != casl::Opcode::PUSH || vm.state().microcycle.phase != casl::MicrocyclePhase::WriteBack) {
        require(vm.stepMicrocycle().ok, "advance to PUSH write-back");
    }
    const auto stackAddress = vm.state().sp;
    require(vm.state().memory[stackAddress] == 0x0042, "PUSH committed stack word");
    require(reverseLatest(vm).status == casl::ReverseMicrostepStatus::Reversed, "PUSH write reverses");
    require(vm.state().memory[stackAddress] == 0, "PUSH reverse restores stack memory");
    require(vm.state().sp == static_cast<std::uint16_t>(spBeforePush - 1), "PUSH write-back reverse keeps execute-phase SP");
    require(reverseLatest(vm).status == casl::ReverseMicrostepStatus::Reversed, "PUSH execute reverses");
    require(vm.state().sp == spBeforePush, "PUSH execute reverse restores SP");
}

void ReverseMicrocycleRejectsStaleAndMutationBoundary() {
    const auto output = assembleSample();
    casl::CometVm vm;
    vm.load(output);
    require(vm.stepMicrocycle().ok, "history exists");
    const auto stale = vm.reverseMicrocycle(vm.state().historyEpoch, vm.state().timelineRevision + 1);
    require(stale.status == casl::ReverseMicrostepStatus::Stale, "timeline mismatch is stale");
    require(vm.state().microcycleHistorySummary.retainedEntries == 1, "stale reverse preserves history");

    require(vm.writeGeneralRegister(1, 0x1234), "mutation applies");
    require(!vm.state().reverseAvailability.available, "mutation clears availability");
    require(
        vm.state().reverseAvailability.reason == casl::ReverseUnavailableReason::MutationBoundary,
        "mutation exposes stable boundary reason"
    );
    const auto blocked = reverseLatest(vm);
    require(blocked.status == casl::ReverseMicrostepStatus::Blocked, "mutation boundary blocks reverse");
}

void ReverseMicrocycleSvcAndCapacityBoundaries() {
    const auto svcOutput = assembleOrExit(R"(MAIN START
     SVC 2
     RET
     END)");
    auto svcVm = std::make_unique<casl::CometVm>();
    svcVm->load(svcOutput);
    for (int index = 0; index < 4; ++index) require(svcVm->stepMicrocycle().ok, "advance through SVC execute");
    require(!svcVm->state().reverseAvailability.available, "SVC commit blocks reverse");
    require(
        svcVm->state().reverseAvailability.reason == casl::ReverseUnavailableReason::SvcBoundary,
        "SVC boundary reason"
    );

    const auto loopOutput = assembleOrExit(R"(MAIN START
LOOP JUMP LOOP
     END)");
    auto loopVm = std::make_unique<casl::CometVm>();
    loopVm->load(loopOutput);
    for (int index = 0; index < 1001; ++index) require(loopVm->stepMicrocycle().ok, "fill bounded history");
    require(loopVm->state().microcycleHistorySummary.retainedEntries == 1000, "history remains bounded");
    require(loopVm->state().microcycleHistorySummary.droppedEntryCount == 1, "capacity drop counted");
    for (int index = 0; index < 1000; ++index) {
        const auto reversed = reverseLatest(*loopVm);
        require(reversed.status == casl::ReverseMicrostepStatus::Reversed, "retained history reverses");
    }
    require(
        loopVm->state().reverseAvailability.reason == casl::ReverseUnavailableReason::HistoryCapacityBoundary,
        "capacity floor blocks earlier reverse"
    );
}

void ReverseMicrocycleRestoresControlFlowAndFlags() {
    const auto branchOutput = assembleOrExit(R"(MAIN START
     JUMP TARGET
     NOP
TARGET RET
     END)");
    auto branchVm = std::make_unique<casl::CometVm>();
    branchVm->load(branchOutput);
    const auto initialPr = branchVm->state().pr;
    for (int index = 0; index < 4; ++index) require(branchVm->stepMicrocycle().ok, "advance through JUMP execute");
    require(branchVm->state().pr == symbolAddress(branchOutput, "TARGET"), "JUMP commits branch target");
    require(reverseLatest(*branchVm).status == casl::ReverseMicrostepStatus::Reversed, "JUMP execute reverses");
    require(branchVm->state().pr == initialPr, "JUMP reverse restores PR");

    const auto shiftOutput = assembleOrExit(R"(MAIN START
     LAD GR1,#8000
     SLL GR1,1
     RET
     END)");
    auto shiftVm = std::make_unique<casl::CometVm>();
    shiftVm->load(shiftOutput);
    completeOneMicroInstruction(*shiftVm);
    const auto beforeShift = shiftVm->state().gr[1];
    while (shiftVm->state().lastInstructionKind != casl::Opcode::SLL ||
           shiftVm->state().microcycle.phase != casl::MicrocyclePhase::FlagUpdate) {
        require(shiftVm->stepMicrocycle().ok, "advance through SLL flag update");
    }
    require(shiftVm->state().gr[1] == 0, "SLL write-back committed");
    require(shiftVm->state().fr.o && shiftVm->state().fr.z, "SLL flag update committed OF/ZF");
    require(reverseLatest(*shiftVm).status == casl::ReverseMicrostepStatus::Reversed, "SLL flag update reverses");
    require(!shiftVm->state().fr.o && !shiftVm->state().fr.z, "SLL reverse restores OF/SF/ZF");
    require(reverseLatest(*shiftVm).status == casl::ReverseMicrostepStatus::Reversed, "SLL write-back reverses");
    require(shiftVm->state().gr[1] == beforeShift, "SLL reverse restores register");
}

void ReverseMicrocycleRestoresCallRetAndPop() {
    const auto callOutput = assembleOrExit(R"(MAIN START
     CALL SUB
     RET
SUB  RET
     END)");
    auto callVm = std::make_unique<casl::CometVm>();
    callVm->load(callOutput);
    const auto initialPr = callVm->state().pr;
    const auto initialSp = callVm->state().sp;
    while (callVm->state().lastInstructionKind != casl::Opcode::CALL ||
           callVm->state().microcycle.phase != casl::MicrocyclePhase::WriteBack) {
        require(callVm->stepMicrocycle().ok, "advance through CALL write-back");
    }
    const auto returnSlot = callVm->state().sp;
    require(callVm->state().memory[returnSlot] == static_cast<std::uint16_t>(initialPr + 2), "CALL stores return address");
    require(reverseLatest(*callVm).status == casl::ReverseMicrostepStatus::Reversed, "CALL write-back reverses");
    require(callVm->state().memory[returnSlot] == 0, "CALL reverse restores stack memory");
    require(callVm->state().pr == initialPr && callVm->state().callDepth == 0, "CALL reverse restores PR/depth");
    require(reverseLatest(*callVm).status == casl::ReverseMicrostepStatus::Reversed, "CALL execute reverses");
    require(callVm->state().sp == initialSp, "CALL execute reverse restores SP");

    completeOneMicroInstruction(*callVm);
    const auto spBeforeRet = callVm->state().sp;
    const auto prBeforeRet = callVm->state().pr;
    while (callVm->state().lastInstructionKind != casl::Opcode::RET ||
           callVm->state().microcycle.phase != casl::MicrocyclePhase::WriteBack) {
        require(callVm->stepMicrocycle().ok, "advance through RET write-back");
    }
    require(callVm->state().sp == static_cast<std::uint16_t>(spBeforeRet + 1), "RET increments SP");
    require(reverseLatest(*callVm).status == casl::ReverseMicrostepStatus::Reversed, "RET write-back reverses");
    require(callVm->state().sp == spBeforeRet && callVm->state().callDepth == 1, "RET reverse restores SP/depth");
    require(reverseLatest(*callVm).status == casl::ReverseMicrostepStatus::Reversed, "RET execute reverses");
    require(callVm->state().pr == prBeforeRet, "RET execute reverse restores PR");

    const auto popOutput = assembleOrExit(R"(MAIN START
     LAD GR1,#0042
     PUSH 0,GR1
     POP GR2
     RET
     END)");
    auto popVm = std::make_unique<casl::CometVm>();
    popVm->load(popOutput);
    completeOneMicroInstruction(*popVm);
    completeOneMicroInstruction(*popVm);
    const auto spBeforePop = popVm->state().sp;
    while (popVm->state().lastInstructionKind != casl::Opcode::POP ||
           popVm->state().microcycle.phase != casl::MicrocyclePhase::WriteBack) {
        require(popVm->stepMicrocycle().ok, "advance through POP write-back");
    }
    require(popVm->state().gr[2] == 0x0042, "POP writes destination register");
    require(reverseLatest(*popVm).status == casl::ReverseMicrostepStatus::Reversed, "POP write-back reverses");
    require(popVm->state().gr[2] == 0, "POP reverse restores register");
    require(reverseLatest(*popVm).status == casl::ReverseMicrostepStatus::Reversed, "POP execute reverses");
    require(popVm->state().sp == spBeforePop, "POP execute reverse restores SP");
}

void ReverseMicrocycleClearsDeterministicRuntimeError() {
    const auto output = assembleOrExit(R"(MAIN START
     NOP
     RET
     END)");
    casl::CometVm vm;
    vm.load(output);
    const auto start = output.entryPoint;
    require(vm.writeMemory(start, 0xffff), "invalid runtime word override applies");

    const auto failed = vm.stepMicrocycle();
    require(!failed.ok, "invalid runtime word fails");
    require(vm.state().runState == casl::RunState::Error, "deterministic failure enters Error");
    require(vm.state().reverseAvailability.available, "deterministic failure is reversible");

    const auto reversed = reverseLatest(vm);
    require(reversed.status == casl::ReverseMicrostepStatus::Reversed, "deterministic failure reverses");
    require(vm.state().runState == casl::RunState::Ready, "reverse clears reversible Error");
    require(vm.state().memory[start] == 0xffff, "reverse does not cross program override barrier");
    require(
        vm.state().reverseAvailability.reason == casl::ReverseUnavailableReason::MutationBoundary,
        "program override remains the history floor"
    );
}

using TestFunction = void (*)();

const std::vector<std::pair<std::string_view, TestFunction>>& tests() {
    static const std::vector<std::pair<std::string_view, TestFunction>> cases{
        {"AssembleSimpleProgram", AssembleSimpleProgram},
        {"AssembleChangedConstants", AssembleChangedConstants},
        {"AssembleChangedLabels", AssembleChangedLabels},
        {"DuplicateLabel_ShouldError", DuplicateLabel_ShouldError},
        {"AssembleInvalidRegister", AssembleInvalidRegister},
        {"AssembleUndefinedLabel", AssembleUndefinedLabel},
        {"AssembleUnknownOpcode", AssembleUnknownOpcode},
        {"AssembleInvalidNumericLiteral", AssembleInvalidNumericLiteral},
        {"AssembleRequiredDirectivesBoundary", AssembleRequiredDirectivesBoundary},
        {"AssembleMalformedOperandBoundary", AssembleMalformedOperandBoundary},
        {"AssembleStorageBoundaryDiagnostics", AssembleStorageBoundaryDiagnostics},
        {"AssembleLad", AssembleLad},
        {"StepLd", StepLd},
        {"StepAdda", StepAdda},
        {"StepLad", StepLad},
        {"StepSuba", StepSuba},
        {"StepCpaEqual", StepCpaEqual},
        {"StepCpaNegative", StepCpaNegative},
        {"StepJump", StepJump},
        {"StepJzeTaken", StepJzeTaken},
        {"StepJzeNotTaken", StepJzeNotTaken},
        {"StepJmiTaken", StepJmiTaken},
        {"AssembleNop", AssembleNop},
        {"ExecuteNopAdvancesPr", ExecuteNopAdvancesPr},
        {"AssembleAddlSubl", AssembleAddlSubl},
        {"ExecuteAddlUnsigned", ExecuteAddlUnsigned},
        {"ExecuteSublUnsigned", ExecuteSublUnsigned},
        {"ExecuteAnd", ExecuteAnd},
        {"ExecuteOr", ExecuteOr},
        {"ExecuteXor", ExecuteXor},
        {"ExecuteCplEqual", ExecuteCplEqual},
        {"ExecuteCplLess", ExecuteCplLess},
        {"ExecuteCplGreater", ExecuteCplGreater},
        {"ExecuteJovTaken", ExecuteJovTaken},
        {"ExecuteJovNotTaken", ExecuteJovNotTaken},
        {"AssembleShiftInstructions", AssembleShiftInstructions},
        {"ExecuteSllBasic", ExecuteSllBasic},
        {"ExecuteSrlBasic", ExecuteSrlBasic},
        {"ExecuteSlaBasic", ExecuteSlaBasic},
        {"ExecuteSraPreservesSign", ExecuteSraPreservesSign},
        {"ShiftUpdatesOverflowWhenBitShiftedOut", ShiftUpdatesOverflowWhenBitShiftedOut},
        {"ShiftCountZeroNoChange", ShiftCountZeroNoChange},
        {"ShiftCountLargeLogicalStableBehavior", ShiftCountLargeLogicalStableBehavior},
        {"ShiftCountLargeArithmeticStableBehavior", ShiftCountLargeArithmeticStableBehavior},
        {"AssembleIndexAddressing", AssembleIndexAddressing},
        {"RejectGr0AsIndexRegister", RejectGr0AsIndexRegister},
        {"ExecuteLdStWithIndex", ExecuteLdStWithIndex},
        {"ExecuteLadJumpShiftWithIndex", ExecuteLadJumpShiftWithIndex},
        {"AssemblePushPop", AssemblePushPop},
        {"RejectInvalidPushPopOperands", RejectInvalidPushPopOperands},
        {"ExecutePushPopStack", ExecutePushPopStack},
        {"PushPopStackPointerWrap", PushPopStackPointerWrap},
        {"AssembleCall", AssembleCall},
        {"AssembleCallWithIndex", AssembleCallWithIndex},
        {"RejectCallWithoutAddress", RejectCallWithoutAddress},
        {"ExecuteCallReturnStack", ExecuteCallReturnStack},
        {"ExecuteCallWithIndex", ExecuteCallWithIndex},
        {"NestedCallReturnOrder", NestedCallReturnOrder},
        {"ManualPushPopDoesNotChangeCallDepth", ManualPushPopDoesNotChangeCallDepth},
        {"StepStore", StepStore},
        {"StepRetFinished", StepRetFinished},
        {"ExecuteGr2Program", ExecuteGr2Program},
        {"Run_ShouldStopAtMaxSteps", Run_ShouldStopAtMaxSteps},
        {"VmStructuredDiagnostics", VmStructuredDiagnostics},
        {"MemoryAccess_OutOfRange_ShouldError", MemoryAccess_OutOfRange_ShouldError},
        {"AssemblePhase20RegisterFormsAndLiterals", AssemblePhase20RegisterFormsAndLiterals},
        {"ExecutePhase20StandardMacrosAndIo", ExecutePhase20StandardMacrosAndIo},
        {"ReloadPhase20DsInitialization", ReloadPhase20DsInitialization},
        {"DebuggerMutationChangesOnlyTarget", DebuggerMutationChangesOnlyTarget},
        {"RuntimeProgramOverrideExecutesAndInvalidFails", RuntimeProgramOverrideExecutesAndInvalidFails},
        {"FullClearUnloadsVm", FullClearUnloadsVm},
        {"MicrocycleAllOfficialInstructions", MicrocycleAllOfficialInstructions},
        {"MicrocycleLdPhaseBoundaries", MicrocycleLdPhaseBoundaries},
        {"MicrocycleCallRetAndBranch", MicrocycleCallRetAndBranch},
        {"InstructionAndMicrocycleParity", InstructionAndMicrocycleParity},
        {"ReverseMicrocycleRestoresFetchAndWriteBack", ReverseMicrocycleRestoresFetchAndWriteBack},
        {"ReverseMicrocycleRestoresMemoryAndStack", ReverseMicrocycleRestoresMemoryAndStack},
        {"ReverseMicrocycleRejectsStaleAndMutationBoundary", ReverseMicrocycleRejectsStaleAndMutationBoundary},
        {"ReverseMicrocycleSvcAndCapacityBoundaries", ReverseMicrocycleSvcAndCapacityBoundaries},
        {"ReverseMicrocycleRestoresControlFlowAndFlags", ReverseMicrocycleRestoresControlFlowAndFlags},
        {"ReverseMicrocycleRestoresCallRetAndPop", ReverseMicrocycleRestoresCallRetAndPop},
        {"ReverseMicrocycleClearsDeterministicRuntimeError", ReverseMicrocycleClearsDeterministicRuntimeError},
    };
    return cases;
}

void runTest(std::string_view name) {
    for (const auto& [testName, testFunction] : tests()) {
        if (testName == name) {
            testFunction();
            return;
        }
    }
    std::cerr << "Unknown test: " << name << '\n';
    std::exit(1);
}

}  // namespace

int main(int argc, char** argv) {
    if (argc > 1) {
        runTest(argv[1]);
        std::cout << argv[1] << " passed\n";
        return 0;
    }

    for (const auto& [testName, testFunction] : tests()) {
        testFunction();
        std::cout << testName << " passed\n";
    }
    return 0;
}
