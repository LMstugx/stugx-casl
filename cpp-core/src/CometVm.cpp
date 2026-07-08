#include "CometVm.hpp"

#include <utility>

namespace casl {
namespace {

Flags flagsForAdd(std::uint16_t, std::uint16_t, std::uint32_t unsignedResult) {
    const auto result = static_cast<std::uint16_t>(unsignedResult & 0xffff);
    return {
        result == 0,
        unsignedResult > 0xffff,
        (result & 0x8000) != 0,
        false
    };
}

}  // namespace

void CometVm::load(const AssembleOutput& program) {
    initialState_ = program.state;
    state_ = program.state;
    sourceMap_ = program.sourceMap;
    instructions_.clear();
    trace_.clear();

    for (const auto& instruction : program.instructions) {
        instructions_.emplace(instruction.address, instruction);
    }

    hasProgram_ = true;
    updateCurrentInstruction();
}

StepResult CometVm::step() {
    StepResult result;
    if (!hasProgram_) {
        fail(result, "No program loaded");
        return result;
    }

    if (state_.runState == RunState::Finished) {
        result.ok = true;
        result.finished = true;
        return result;
    }

    const auto instruction = instructionAt(state_.pr);
    if (!instruction.has_value()) {
        fail(result, "No instruction at PR");
        return result;
    }

    result.executedAddress = instruction->address;
    result.executedLine = instruction->line;
    result.executedInstruction = instruction->source;
    result.instructionKind = instruction->opcode;
    state_.ir = state_.memory[instruction->address];
    state_.mar = instruction->operandAddress.value_or(instruction->address);
    state_.lastInstructionKind = instruction->opcode;
    state_.lastMemoryReadAddress.reset();
    state_.lastMemoryWriteAddress.reset();
    state_.lastRegisterWriteIndex.reset();

    switch (instruction->opcode) {
        case Opcode::LD: {
            const auto gr = instruction->gr;
            if (gr >= kGeneralRegisterCount || !instruction->operandAddress.has_value()) {
                fail(result, "Invalid LD operands");
                return result;
            }
            state_.lastMemoryReadAddress = *instruction->operandAddress;
            state_.mdr = state_.memory[*instruction->operandAddress];
            state_.gr[gr] = state_.mdr;
            state_.lastRegisterWriteIndex = gr;
            state_.pr = static_cast<std::uint16_t>(state_.pr + 2);
            state_.visualPath = VisualPathKind::LD_MemoryToMdrToGr;
            result.visualPath = state_.visualPath;
            result.ok = true;
            pushTrace("LD");
            break;
        }
        case Opcode::ADDA: {
            const auto gr = instruction->gr;
            if (gr >= kGeneralRegisterCount || !instruction->operandAddress.has_value()) {
                fail(result, "Invalid ADDA operands");
                return result;
            }
            const auto lhs = state_.gr[gr];
            state_.lastMemoryReadAddress = *instruction->operandAddress;
            state_.mdr = state_.memory[*instruction->operandAddress];
            const auto sum = static_cast<std::uint32_t>(lhs) + state_.mdr;
            state_.gr[gr] = static_cast<std::uint16_t>(sum & 0xffff);
            state_.lastRegisterWriteIndex = gr;
            state_.fr = flagsForAdd(lhs, state_.mdr, sum);
            state_.pr = static_cast<std::uint16_t>(state_.pr + 2);
            state_.visualPath = VisualPathKind::ADDA_GrMdrToAluToGr;
            result.visualPath = state_.visualPath;
            result.ok = true;
            pushTrace("ADDA");
            break;
        }
        case Opcode::ST: {
            const auto gr = instruction->gr;
            if (gr >= kGeneralRegisterCount || !instruction->operandAddress.has_value()) {
                fail(result, "Invalid ST operands");
                return result;
            }
            state_.mdr = state_.gr[gr];
            state_.memory[*instruction->operandAddress] = state_.mdr;
            state_.lastMemoryWriteAddress = *instruction->operandAddress;
            state_.pr = static_cast<std::uint16_t>(state_.pr + 2);
            state_.visualPath = VisualPathKind::ST_GrToMdrToMemory;
            result.visualPath = state_.visualPath;
            result.ok = true;
            pushTrace("ST");
            break;
        }
        case Opcode::RET:
            state_.runState = RunState::Finished;
            state_.visualPath = VisualPathKind::Finished_None;
            result.visualPath = state_.visualPath;
            result.ok = true;
            result.finished = true;
            pushTrace("RET");
            break;
        default:
            fail(result, "Illegal opcode");
            return result;
    }

    state_.stepCount += 1;
    updateCurrentInstruction();
    return result;
}

RunResult CometVm::run(int maxSteps) {
    RunResult result;
    if (maxSteps <= 0) {
        state_.runState = RunState::Error;
        result.stoppedAtMaxSteps = true;
        result.diagnostics.push_back({0, Severity::Error, "Max steps reached before execution"});
        return result;
    }

    for (int stepCount = 0; stepCount < maxSteps; stepCount += 1) {
        if (state_.runState == RunState::Finished) {
            result.ok = true;
            result.steps = stepCount;
            return result;
        }
        auto stepResult = step();
        if (!stepResult.ok) {
            result.diagnostics = std::move(stepResult.diagnostics);
            result.steps = stepCount;
            return result;
        }
        result.steps = stepCount + 1;
        if (stepResult.finished) {
            result.ok = true;
            return result;
        }
    }

    if (state_.runState != RunState::Finished) {
        state_.runState = RunState::Error;
        result.stoppedAtMaxSteps = true;
        result.diagnostics.push_back({0, Severity::Error, "Max steps reached"});
    }

    return result;
}

void CometVm::reset() {
    state_ = initialState_;
    trace_.clear();
    updateCurrentInstruction();
}

const CometState& CometVm::state() const {
    return state_;
}

std::optional<std::uint16_t> CometVm::readMemory(std::uint32_t address) const {
    if (address >= kMemorySize) return std::nullopt;
    return state_.memory[address];
}

bool CometVm::writeMemory(std::uint32_t address, std::uint16_t value) {
    if (address >= kMemorySize) {
        state_.runState = RunState::Error;
        return false;
    }
    state_.memory[address] = value;
    return true;
}

bool CometVm::setProgramCounter(std::uint32_t address) {
    if (address >= kMemorySize) {
        state_.runState = RunState::Error;
        return false;
    }
    state_.pr = static_cast<std::uint16_t>(address);
    updateCurrentInstruction();
    return true;
}

std::optional<Instruction> CometVm::instructionAt(std::uint16_t address) const {
    const auto found = instructions_.find(address);
    if (found == instructions_.end()) return std::nullopt;
    return found->second;
}

void CometVm::updateCurrentInstruction() {
    const auto instruction = instructionAt(state_.pr);
    if (!instruction.has_value() || state_.runState == RunState::Finished || state_.runState == RunState::Error) {
        state_.currentLine = -1;
        state_.currentInstruction.clear();
        return;
    }
    state_.currentLine = instruction->line;
    state_.currentInstruction = instruction->source;
}

void CometVm::fail(StepResult& result, std::string message) {
    state_.runState = RunState::Error;
    state_.visualPath = VisualPathKind::None;
    result.ok = false;
    result.diagnostics.push_back({0, Severity::Error, std::move(message)});
}

void CometVm::pushTrace(std::string event) {
    trace_.push_back(std::move(event));
    if (trace_.size() > kMaxTraceEvents) {
        trace_.erase(trace_.begin(), trace_.begin() + static_cast<std::ptrdiff_t>(trace_.size() - kMaxTraceEvents));
    }
}

}  // namespace casl
