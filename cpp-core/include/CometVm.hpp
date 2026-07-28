#pragma once

#include <cstdint>
#include <optional>
#include <deque>
#include <string>
#include <unordered_map>
#include <vector>

#include "Assembler.hpp"
#include "CometState.hpp"
#include "SourceMap.hpp"

namespace casl {

class CometVm {
public:
    void load(const AssembleOutput& program);
    [[nodiscard]] StepResult step();
    [[nodiscard]] MicrocycleStepResult stepMicrocycle();
    [[nodiscard]] RunResult run(int maxSteps);
    [[nodiscard]] RunResult runMicrocycles(int maxMicrosteps);
    void reset();
    void reload(std::optional<std::uint16_t> uninitializedValue);
    void enqueueInput(std::vector<std::uint16_t> characters, bool endOfFile = false);

    [[nodiscard]] const CometState& state() const;
    [[nodiscard]] std::optional<std::uint16_t> readMemory(std::uint32_t address) const;
    [[nodiscard]] bool writeMemory(std::uint32_t address, std::uint16_t value);
    [[nodiscard]] bool writeGeneralRegister(std::uint32_t index, std::uint16_t value);
    [[nodiscard]] bool setProgramCounter(std::uint32_t address);
    [[nodiscard]] bool setStackPointer(std::uint32_t address);
    void setFlagsPacked(std::uint16_t value);
    void fullClear();

private:
    static constexpr std::size_t kMaxTraceEvents = 1000;
    static constexpr std::size_t kMaxConsoleOutputRecords = 256;

    CometState initialState_{};
    CometState state_{};
    SourceMap sourceMap_{};
    std::unordered_map<std::uint16_t, Instruction> instructions_;
    std::vector<std::string> trace_;
    struct InputRecord {
        std::vector<std::uint16_t> characters;
        bool endOfFile = false;
    };
    std::deque<InputRecord> inputQueue_;
    bool hasProgram_ = false;

    struct MicrocycleContext {
        Instruction instruction{};
        std::vector<MicrocyclePhase> phases;
        std::size_t nextPhaseIndex = 0;
        std::uint16_t operand = 0;
        std::uint16_t result = 0;
        Flags pendingFlags{};
        bool hasOperand = false;
        bool hasResult = false;
        bool hasPendingFlags = false;
        bool branchTaken = false;
        bool stackReturn = false;
        VisualPathKind instructionVisualPath = VisualPathKind::None;
        std::uint16_t instructionAddress = 0;
        std::uint16_t sequentialPr = 0;
        std::uint16_t effectiveAddress = 0;
        std::uint16_t stackAddress = 0;
        std::uint16_t instructionStartMdr = 0;
    };

    struct MicrocycleHistoryEntry {
        struct MemoryChange {
            std::uint16_t address = 0;
            std::uint16_t before = 0;
            std::uint16_t after = 0;
        };

        std::uint64_t sequence = 0;
        MicrocyclePhase phase = MicrocyclePhase::None;
        std::uint16_t instructionAddress = 0;
        std::uint16_t prBefore = 0;
        std::uint16_t prAfter = 0;
        std::uint16_t spBefore = 0;
        std::uint16_t spAfter = 0;
        std::uint16_t marBefore = 0;
        std::uint16_t marAfter = 0;
        std::uint16_t mdrBefore = 0;
        std::uint16_t mdrAfter = 0;
        std::uint16_t irBefore = 0;
        std::uint16_t irAfter = 0;
        int callDepthBefore = 0;
        int callDepthAfter = 0;
        Flags flagsBefore{};
        Flags flagsAfter{};
        RunState runStateBefore = RunState::Idle;
        RunState runStateAfter = RunState::Idle;
        std::array<std::uint16_t, kGeneralRegisterCount> grBefore{};
        std::array<std::uint16_t, kGeneralRegisterCount> grAfter{};
        std::vector<MemoryChange> memoryChanges;
    };

    std::optional<MicrocycleContext> microcycleContext_;
    std::vector<MicrocycleHistoryEntry> microcycleHistory_;
    std::uint64_t microcycleSequence_ = 0;

    [[nodiscard]] std::optional<Instruction> instructionAt(std::uint16_t address) const;
    [[nodiscard]] std::vector<MicrocyclePhase> phasesFor(const Instruction& instruction) const;
    [[nodiscard]] bool beginMicrocycle(MicrocycleStepResult& result);
    void executeMicrocyclePhase(MicrocycleContext& context, MicrocyclePhase phase, MicrocycleStepResult& result);
    void completeMicrocycleInstruction(MicrocycleContext& context, MicrocycleStepResult& result);
    void clearMicrocycleRuntime();
    [[nodiscard]] StepResult stepReference();
    void prepareAfterManualMutation();
    void updateCurrentInstruction();
    void fail(StepResult& result, std::string message);
    void pushTrace(std::string event);
};

}  // namespace casl
