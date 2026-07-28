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
    [[nodiscard]] ReverseMicrostepResult reverseMicrocycle(
        std::uint64_t expectedHistoryEpoch,
        std::uint64_t expectedTimelineRevision
    );
    [[nodiscard]] ReverseInstructionResult reverseInstruction(
        std::uint64_t expectedHistoryEpoch,
        std::uint64_t expectedTimelineRevision
    );
    [[nodiscard]] ReverseAvailability reverseAvailability() const;
    [[nodiscard]] ReverseInstructionAvailability reverseInstructionAvailability() const;
    [[nodiscard]] MicrocycleHistorySummary historySummary() const;
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
        std::uint64_t instructionId = 0;
    };

    struct MicrocycleHistoryEntry {
        struct MemoryChange {
            std::uint16_t address = 0;
            std::uint16_t before = 0;
            std::uint16_t after = 0;
        };

        struct StateSnapshot {
            std::array<std::uint16_t, kGeneralRegisterCount> gr{};
            std::uint16_t pr = 0;
            std::uint16_t sp = 0;
            int callDepth = 0;
            std::uint16_t ir = 0;
            std::uint16_t mar = 0;
            std::uint16_t mdr = 0;
            Flags fr{};
            RunState runState = RunState::Idle;
            VisualPathKind visualPath = VisualPathKind::None;
            ExecutionGranularity executionGranularity = ExecutionGranularity::Instruction;
            MicrocycleState microcycle{};
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

        std::uint64_t sequence = 0;
        std::uint64_t historyEpoch = 0;
        std::uint64_t timelineRevisionBefore = 0;
        std::uint64_t timelineRevisionAfter = 0;
        MicrocyclePhase phase = MicrocyclePhase::None;
        std::uint64_t instructionId = 0;
        std::uint16_t instructionAddress = 0;
        std::optional<InstructionKind> instructionKind;
        int sourceLine = -1;
        bool startsAtFetch = false;
        bool endsAtInstructionComplete = false;
        StateSnapshot before{};
        StateSnapshot after{};
        std::optional<MicrocycleContext> contextBefore;
        std::optional<MicrocycleContext> contextAfter;
        std::size_t traceSizeBefore = 0;
        std::size_t traceSizeAfter = 0;
        std::vector<std::string> traceRemovedFromFront;
        std::vector<std::string> traceAppended;
        std::vector<MemoryChange> memoryChanges;
    };

    std::optional<MicrocycleContext> microcycleContext_;
    std::vector<MicrocycleHistoryEntry> microcycleHistory_;
    std::uint64_t microcycleSequence_ = 0;
    std::uint64_t historyEpoch_ = 0;
    std::uint64_t timelineRevision_ = 0;
    std::uint64_t droppedHistoryEntries_ = 0;
    std::optional<std::uint64_t> historyFloorEntryId_;
    HistoryBarrierReason lastHistoryBarrier_ = HistoryBarrierReason::None;

    [[nodiscard]] std::optional<Instruction> instructionAt(std::uint16_t address) const;
    [[nodiscard]] std::vector<MicrocyclePhase> phasesFor(const Instruction& instruction) const;
    [[nodiscard]] bool beginMicrocycle(MicrocycleStepResult& result);
    void executeMicrocyclePhase(MicrocycleContext& context, MicrocyclePhase phase, MicrocycleStepResult& result);
    void completeMicrocycleInstruction(MicrocycleContext& context, MicrocycleStepResult& result);
    void clearMicrocycleRuntime(
        HistoryBarrierReason reason = HistoryBarrierReason::None,
        bool advanceEpoch = false
    );
    void establishHistoryBarrier(HistoryBarrierReason reason);
    void syncHistoryState();
    [[nodiscard]] MicrocycleHistoryEntry::StateSnapshot captureStateSnapshot() const;
    void restoreStateSnapshot(const MicrocycleHistoryEntry::StateSnapshot& snapshot);
    [[nodiscard]] bool stateMatchesSnapshot(const MicrocycleHistoryEntry::StateSnapshot& snapshot) const;
    [[nodiscard]] bool contextMatches(const std::optional<MicrocycleContext>& expected) const;
    [[nodiscard]] ReverseUnavailableReason unavailableReasonFromBarrier() const;
    [[nodiscard]] StepResult stepReference();
    void prepareAfterManualMutation();
    void updateCurrentInstruction();
    void fail(StepResult& result, std::string message);
    void pushTrace(std::string event);
};

}  // namespace casl
