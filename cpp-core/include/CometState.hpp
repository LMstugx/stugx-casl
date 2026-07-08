#pragma once

#include <array>
#include <cstdint>
#include <string>
#include <vector>

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
};

template <typename T>
struct Result {
    bool ok = false;
    T value{};
    std::vector<Diagnostic> diagnostics;
};

enum class RunState {
    Idle,
    Ready,
    Finished,
    Error
};

enum class VisualPathKind {
    None,
    Ready_PrToMar,
    LD_MemoryToMdrToGr,
    ST_GrToMdrToMemory,
    ADDA_GrMdrToAluToGr,
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
    std::uint16_t ir = 0;
    std::uint16_t mar = kDefaultStartAddress;
    std::uint16_t mdr = 0;
    Flags fr{};
    RunState runState = RunState::Idle;
    VisualPathKind visualPath = VisualPathKind::None;
    int currentLine = -1;
    std::string currentInstruction;
};

struct StepResult {
    bool ok = false;
    bool finished = false;
    std::uint16_t executedAddress = 0;
    int executedLine = -1;
    std::string executedInstruction;
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
