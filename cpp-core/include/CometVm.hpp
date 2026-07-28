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
    [[nodiscard]] RunResult run(int maxSteps);
    void reset();
    void reload(std::optional<std::uint16_t> uninitializedValue);
    void enqueueInput(std::vector<std::uint16_t> characters, bool endOfFile = false);

    [[nodiscard]] const CometState& state() const;
    [[nodiscard]] std::optional<std::uint16_t> readMemory(std::uint32_t address) const;
    [[nodiscard]] bool writeMemory(std::uint32_t address, std::uint16_t value);
    [[nodiscard]] bool setProgramCounter(std::uint32_t address);

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

    [[nodiscard]] std::optional<Instruction> instructionAt(std::uint16_t address) const;
    void updateCurrentInstruction();
    void fail(StepResult& result, std::string message);
    void pushTrace(std::string event);
};

}  // namespace casl
