#pragma once

#include <cstdint>
#include <optional>
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

    [[nodiscard]] const CometState& state() const;
    [[nodiscard]] std::optional<std::uint16_t> readMemory(std::uint32_t address) const;
    [[nodiscard]] bool writeMemory(std::uint32_t address, std::uint16_t value);
    [[nodiscard]] bool setProgramCounter(std::uint32_t address);

private:
    static constexpr std::size_t kMaxTraceEvents = 1000;

    CometState initialState_{};
    CometState state_{};
    SourceMap sourceMap_{};
    std::unordered_map<std::uint16_t, Instruction> instructions_;
    std::vector<std::string> trace_;
    bool hasProgram_ = false;

    [[nodiscard]] std::optional<Instruction> instructionAt(std::uint16_t address) const;
    void updateCurrentInstruction();
    void fail(StepResult& result, std::string message);
    void pushTrace(std::string event);
};

}  // namespace casl
