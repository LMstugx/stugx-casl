#include <cassert>
#include <cstdlib>
#include <iostream>
#include <string>

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

casl::AssembleOutput assembleSample() {
    casl::Assembler assembler;
    const auto result = assembler.assemble(kSample);
    require(result.ok, "sample assembly should succeed");
    return result.value;
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

void DuplicateLabel_ShouldError() {
    casl::Assembler assembler;
    const auto result = assembler.assemble("MAIN START\nA DC 1\nA DC 2\n END");
    require(!result.ok, "duplicate label should fail");
}

void UndefinedLabel_ShouldError() {
    casl::Assembler assembler;
    const auto result = assembler.assemble("MAIN START\n LD GR1,MISSING\n RET\n END");
    require(!result.ok, "undefined label should fail");
}

void InvalidRegister_ShouldError() {
    casl::Assembler assembler;
    const auto result = assembler.assemble("MAIN START\n LD GR8,A\nA DC 1\n END");
    require(!result.ok, "invalid register should fail");
}

void StepLd_ShouldSetGR1() {
    casl::CometVm vm;
    vm.load(assembleSample());
    const auto step = vm.step();
    require(step.ok, "LD step should succeed");
    require(vm.state().pr == 0x22, "PR after LD");
    require(vm.state().gr[1] == 0x000a, "GR1 after LD");
    require(vm.state().visualPath == casl::VisualPathKind::LD_MemoryToMdrToGr, "LD visual path");
}

void StepAdda_ShouldSetFR() {
    casl::CometVm vm;
    vm.load(assembleSample());
    (void)vm.step();
    const auto step = vm.step();
    require(step.ok, "ADDA step should succeed");
    require(vm.state().pr == 0x24, "PR after ADDA");
    require(vm.state().gr[1] == 0x001e, "GR1 after ADDA");
    require(!vm.state().fr.z && !vm.state().fr.c && !vm.state().fr.n && !vm.state().fr.o, "FR after ADDA");
    require(vm.state().visualPath == casl::VisualPathKind::ADDA_GrMdrToAluToGr, "ADDA visual path");
}

void StepStore_ShouldWriteMemory() {
    casl::CometVm vm;
    vm.load(assembleSample());
    (void)vm.step();
    (void)vm.step();
    const auto step = vm.step();
    require(step.ok, "ST step should succeed");
    require(vm.state().pr == 0x26, "PR after ST");
    require(vm.state().memory[0x29] == 0x001e, "Memory[0029] after ST");
    require(vm.state().visualPath == casl::VisualPathKind::ST_GrToMdrToMemory, "ST visual path");
}

void Run_ShouldStopAtMaxSteps() {
    casl::CometVm vm;
    vm.load(assembleSample());
    const auto result = vm.run(0);
    require(!result.ok, "run with zero max steps should fail");
    require(result.stoppedAtMaxSteps, "run should report max step guard");
    require(vm.state().runState == casl::RunState::Error, "run max step state");
}

void MemoryAccess_OutOfRange_ShouldError() {
    casl::CometVm vm;
    vm.load(assembleSample());
    require(!vm.readMemory(0x10000).has_value(), "read beyond memory should fail");
    require(!vm.setProgramCounter(0x10000), "setting PR beyond memory should fail");
    require(vm.state().runState == casl::RunState::Error, "out-of-range PR should enter error");
}

}  // namespace

int main() {
    AssembleSimpleProgram();
    DuplicateLabel_ShouldError();
    UndefinedLabel_ShouldError();
    InvalidRegister_ShouldError();
    StepLd_ShouldSetGR1();
    StepAdda_ShouldSetFR();
    StepStore_ShouldWriteMemory();
    Run_ShouldStopAtMaxSteps();
    MemoryAccess_OutOfRange_ShouldError();
    std::cout << "CoreSmokeTest passed\n";
    return 0;
}
