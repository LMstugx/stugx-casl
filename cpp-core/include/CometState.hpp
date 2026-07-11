#pragma once

#include <array>
#include <cstdint>
#include <optional>
#include <string>
#include <unordered_map>
#include <vector>

#include "InstructionSet.hpp"

namespace casl {

constexpr std::uint32_t kMemorySize = 65536;
constexpr std::uint16_t kDefaultStartAddress = 0x0020;
constexpr std::uint16_t kDefaultStackPointer = 0xfffe;
constexpr std::size_t kGeneralRegisterCount = 8;

enum class Severity {
    Warning,
    Error
};

struct Diagnostic {
    int line = 0;
    Severity severity = Severity::Error;
    std::string message;
    std::string code;
    std::unordered_map<std::string, std::string> params;
    std::string rawContext;
    std::string fallbackMessage;
};

template <typename T>
struct Result {
    bool ok = false;
    T value{};
    std::vector<Diagnostic> diagnostics;
};

enum class RunState {
    Idle,
    Dirty,
    Ready,
    Running,
    Finished,
    Error
};

enum class VisualPathKind {
    None,
    Ready_PrToMar,
    LD_MemoryToMdrToGr,
    ST_GrToMdrToMemory,
    ADDA_GrMdrToAluToGr,
    LAD_AddressToGr,
    SUBA_GrMdrToAluToGr,
    CPA_GrMdrToAluToFr,
    Shift_AddressToAluToGr,
    PUSH_EffectiveAddressToStack,
    POP_StackToGr,
    CALL_ReturnAddressToStackAndPr,
    RET_StackToPr,
    Jump_AddressToPr,
    ConditionalJump_AddressToPr,
    ConditionalJump_NotTaken,
    Finished_None
};

struct Flags {
    bool z = false;
    bool c = false;
    bool n = false;
    bool o = false;

    [[nodiscard]] std::uint16_t packed() const {
        return static_cast<std::uint16_t>((z ? 0b100 : 0) | (c ? 0b010 : 0) | (n ? 0b001 : 0));
    }
};

struct CometState {
    std::array<std::uint16_t, kMemorySize> memory{};
    std::array<std::uint16_t, kGeneralRegisterCount> gr{};
    std::uint16_t pr = kDefaultStartAddress;
    std::uint16_t sp = kDefaultStackPointer;
    int callDepth = 0;
    std::uint16_t ir = 0;
    std::uint16_t mar = kDefaultStartAddress;
    std::uint16_t mdr = 0;
    Flags fr{};
    RunState runState = RunState::Idle;
    VisualPathKind visualPath = VisualPathKind::None;
    int stepCount = 0;
    int currentLine = -1;
    std::string currentInstruction;
    std::optional<InstructionKind> lastInstructionKind;
    std::optional<std::uint16_t> lastMemoryReadAddress;
    std::optional<std::uint16_t> lastMemoryWriteAddress;
    std::optional<std::uint8_t> lastRegisterWriteIndex;
    std::optional<std::uint16_t> lastBaseAddress;
    std::optional<std::uint8_t> lastIndexRegister;
    std::optional<std::uint16_t> lastIndexValue;
    std::optional<std::uint16_t> lastEffectiveAddress;
};

struct SourceRow {
    int line = 0;
    std::uint16_t address = 0;
    std::vector<std::uint16_t> machineWords;
    std::string source;
    std::string label;
    InstructionKind instruction = InstructionKind::DC;
};

struct MemoryRow {
    std::uint16_t address = 0;
    std::uint16_t value = 0;
    std::string label;
    bool changed = false;
    bool current = false;
};

struct StepResult {
    bool ok = false;
    bool finished = false;
    std::uint16_t executedAddress = 0;
    int executedLine = -1;
    std::string executedInstruction;
    std::optional<InstructionKind> instructionKind;
    VisualPathKind visualPath = VisualPathKind::None;
    std::vector<Diagnostic> diagnostics;
};

struct RunResult {
    bool ok = false;
    int steps = 0;
    bool stoppedAtMaxSteps = false;
    std::vector<Diagnostic> diagnostics;
};

}  // namespace casl
