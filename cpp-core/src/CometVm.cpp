#include "CometVm.hpp"

#include <utility>

namespace casl {
namespace {

std::int32_t toSigned16(std::uint16_t value) {
    return (value & 0x8000) != 0 ? static_cast<std::int32_t>(value) - 0x10000 : static_cast<std::int32_t>(value);
}

bool signedAddOverflow(std::uint16_t lhs, std::uint16_t rhs, std::uint32_t result) {
    const auto left = toSigned16(lhs);
    const auto right = toSigned16(rhs);
    const auto signedResult = toSigned16(static_cast<std::uint16_t>(result & 0xffff));
    return (left >= 0 && right >= 0 && signedResult < 0) || (left < 0 && right < 0 && signedResult >= 0);
}

bool signedSubOverflow(std::uint16_t lhs, std::uint16_t rhs, std::int32_t result) {
    const auto left = toSigned16(lhs);
    const auto right = toSigned16(rhs);
    const auto signedResult = toSigned16(static_cast<std::uint16_t>(result & 0xffff));
    return (left >= 0 && right < 0 && signedResult < 0) || (left < 0 && right >= 0 && signedResult >= 0);
}

Flags flagsForArithmetic(std::int32_t value, bool overflow) {
    const auto result = static_cast<std::uint16_t>(value & 0xffff);
    return {
        result == 0,
        value > 0xffff || value < 0,
        (result & 0x8000) != 0,
        overflow
    };
}

Flags flagsForLogicalResult(std::uint16_t value) {
    return {
        value == 0,
        false,
        (value & 0x8000) != 0,
        false
    };
}

Flags flagsForLogicalAdd(std::uint16_t lhs, std::uint16_t rhs) {
    const auto sum = static_cast<std::uint32_t>(lhs) + rhs;
    const auto result = static_cast<std::uint16_t>(sum & 0xffff);
    const auto carry = sum > 0xffff;
    return {
        result == 0,
        carry,
        (result & 0x8000) != 0,
        carry
    };
}

Flags flagsForLogicalSub(std::uint16_t lhs, std::uint16_t rhs) {
    const auto result = static_cast<std::uint16_t>((static_cast<std::uint32_t>(lhs) - rhs) & 0xffff);
    const auto borrow = lhs < rhs;
    return {
        result == 0,
        borrow,
        (result & 0x8000) != 0,
        borrow
    };
}

Flags flagsForCompare(std::uint16_t lhs, std::uint16_t rhs) {
    const auto diff = toSigned16(lhs) - toSigned16(rhs);
    return {
        diff == 0,
        false,
        diff < 0,
        false
    };
}

Flags flagsForLogicalCompare(std::uint16_t lhs, std::uint16_t rhs) {
    return {
        lhs == rhs,
        false,
        lhs < rhs,
        false
    };
}

struct ShiftResult {
    std::uint16_t value = 0;
    bool shiftedOut = false;
};

Flags flagsForShift(std::uint16_t value, bool shiftedOut) {
    return {
        value == 0,
        false,
        (value & 0x8000) != 0,
        shiftedOut
    };
}

bool bitAt(std::uint16_t value, std::uint16_t index) {
    return ((static_cast<std::uint32_t>(value) >> index) & 1U) == 1U;
}

ShiftResult shiftValue(Opcode opcode, std::uint16_t value, std::uint16_t count) {
    if (count == 0) return {value, false};

    switch (opcode) {
        case Opcode::SLA: {
            const auto sign = static_cast<std::uint16_t>(value & 0x8000);
            const auto magnitude = static_cast<std::uint16_t>(value & 0x7fff);
            const auto shiftedOut = count <= 15 ? bitAt(magnitude, static_cast<std::uint16_t>(15 - count)) : false;
            const auto shifted = count >= 15 ? 0U : ((static_cast<std::uint32_t>(magnitude) << count) & 0x7fffU);
            return {static_cast<std::uint16_t>(sign | shifted), shiftedOut};
        }
        case Opcode::SRA: {
            const auto sign = static_cast<std::uint16_t>(value & 0x8000);
            const auto shiftedOut = count <= 16 ? bitAt(value, static_cast<std::uint16_t>(count - 1)) : false;
            if (count >= 16) return {static_cast<std::uint16_t>(sign ? 0xffff : 0x0000), shiftedOut};
            const auto fill = sign ? (0xffffU << (16 - count)) : 0U;
            return {static_cast<std::uint16_t>((static_cast<std::uint32_t>(value) >> count) | fill), shiftedOut};
        }
        case Opcode::SLL: {
            const auto shiftedOut = count <= 16 ? bitAt(value, static_cast<std::uint16_t>(16 - count)) : false;
            return {static_cast<std::uint16_t>(count >= 16 ? 0 : ((static_cast<std::uint32_t>(value) << count) & 0xffffU)), shiftedOut};
        }
        case Opcode::SRL: {
            const auto shiftedOut = count <= 16 ? bitAt(value, static_cast<std::uint16_t>(count - 1)) : false;
            return {static_cast<std::uint16_t>(count >= 16 ? 0 : (static_cast<std::uint32_t>(value) >> count)), shiftedOut};
        }
        default:
            return {value, false};
    }
}

bool isJumpTaken(Opcode opcode, const Flags& flags) {
    switch (opcode) {
        case Opcode::JUMP: return true;
        case Opcode::JZE: return flags.z;
        case Opcode::JNZ: return !flags.z;
        case Opcode::JPL: return !flags.n && !flags.z;
        case Opcode::JMI: return flags.n;
        case Opcode::JOV: return flags.o;
        default: return false;
    }
}

struct EffectiveAddressInfo {
    std::uint16_t baseAddress = 0;
    std::optional<std::uint8_t> indexRegister;
    std::optional<std::uint16_t> indexValue;
    std::uint16_t effectiveAddress = 0;
};

EffectiveAddressInfo effectiveAddressFor(const CometState& state, const Instruction& instruction) {
    const auto baseAddress = instruction.operandAddress.value_or(instruction.address);
    const auto indexRegister = instruction.indexRegister == 0 ? std::optional<std::uint8_t>{} : std::optional<std::uint8_t>{instruction.indexRegister};
    const auto indexValue = indexRegister.has_value() ? std::optional<std::uint16_t>{state.gr[*indexRegister]} : std::optional<std::uint16_t>{};
    return {
        baseAddress,
        indexRegister,
        indexValue,
        static_cast<std::uint16_t>((static_cast<std::uint32_t>(baseAddress) + indexValue.value_or(0)) & 0xffffU)
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
    const auto effective = effectiveAddressFor(state_, *instruction);
    state_.mar = effective.effectiveAddress;
    state_.lastInstructionKind = instruction->opcode;
    state_.lastMemoryReadAddress.reset();
    state_.lastMemoryWriteAddress.reset();
    state_.lastRegisterWriteIndex.reset();
    state_.lastBaseAddress.reset();
    state_.lastIndexRegister.reset();
    state_.lastIndexValue.reset();
    state_.lastEffectiveAddress.reset();
    if (instruction->operandAddress.has_value()) {
        state_.lastBaseAddress = effective.baseAddress;
        state_.lastIndexRegister = effective.indexRegister;
        state_.lastIndexValue = effective.indexValue;
        state_.lastEffectiveAddress = effective.effectiveAddress;
    }

    switch (instruction->opcode) {
        case Opcode::NOP:
            state_.pr = static_cast<std::uint16_t>(state_.pr + 1);
            state_.visualPath = VisualPathKind::None;
            result.visualPath = state_.visualPath;
            result.ok = true;
            pushTrace("NOP");
            break;
        case Opcode::LD: {
            const auto gr = instruction->gr;
            if (gr >= kGeneralRegisterCount || !instruction->operandAddress.has_value()) {
                fail(result, "Invalid LD operands");
                return result;
            }
            state_.lastMemoryReadAddress = effective.effectiveAddress;
            state_.mdr = state_.memory[effective.effectiveAddress];
            state_.gr[gr] = state_.mdr;
            state_.lastRegisterWriteIndex = gr;
            state_.pr = static_cast<std::uint16_t>(state_.pr + 2);
            state_.visualPath = VisualPathKind::LD_MemoryToMdrToGr;
            result.visualPath = state_.visualPath;
            result.ok = true;
            pushTrace("LD");
            break;
        }
        case Opcode::LAD: {
            const auto gr = instruction->gr;
            if (gr >= kGeneralRegisterCount || !instruction->operandAddress.has_value()) {
                fail(result, "Invalid LAD operands");
                return result;
            }
            state_.gr[gr] = effective.effectiveAddress;
            state_.lastRegisterWriteIndex = gr;
            state_.pr = static_cast<std::uint16_t>(state_.pr + 2);
            state_.visualPath = VisualPathKind::LAD_AddressToGr;
            result.visualPath = state_.visualPath;
            result.ok = true;
            pushTrace("LAD");
            break;
        }
        case Opcode::ADDA: {
            const auto gr = instruction->gr;
            if (gr >= kGeneralRegisterCount || !instruction->operandAddress.has_value()) {
                fail(result, "Invalid ADDA operands");
                return result;
            }
            const auto lhs = state_.gr[gr];
            state_.lastMemoryReadAddress = effective.effectiveAddress;
            state_.mdr = state_.memory[effective.effectiveAddress];
            const auto sum = static_cast<std::uint32_t>(lhs) + state_.mdr;
            state_.gr[gr] = static_cast<std::uint16_t>(sum & 0xffff);
            state_.lastRegisterWriteIndex = gr;
            state_.fr = flagsForArithmetic(static_cast<std::int32_t>(sum), signedAddOverflow(lhs, state_.mdr, sum));
            state_.pr = static_cast<std::uint16_t>(state_.pr + 2);
            state_.visualPath = VisualPathKind::ADDA_GrMdrToAluToGr;
            result.visualPath = state_.visualPath;
            result.ok = true;
            pushTrace("ADDA");
            break;
        }
        case Opcode::SUBA: {
            const auto gr = instruction->gr;
            if (gr >= kGeneralRegisterCount || !instruction->operandAddress.has_value()) {
                fail(result, "Invalid SUBA operands");
                return result;
            }
            const auto lhs = state_.gr[gr];
            state_.lastMemoryReadAddress = effective.effectiveAddress;
            state_.mdr = state_.memory[effective.effectiveAddress];
            const auto diff = static_cast<std::int32_t>(lhs) - static_cast<std::int32_t>(state_.mdr);
            state_.gr[gr] = static_cast<std::uint16_t>(diff & 0xffff);
            state_.lastRegisterWriteIndex = gr;
            state_.fr = flagsForArithmetic(diff, signedSubOverflow(lhs, state_.mdr, diff));
            state_.pr = static_cast<std::uint16_t>(state_.pr + 2);
            state_.visualPath = VisualPathKind::SUBA_GrMdrToAluToGr;
            result.visualPath = state_.visualPath;
            result.ok = true;
            pushTrace("SUBA");
            break;
        }
        case Opcode::ADDL: {
            const auto gr = instruction->gr;
            if (gr >= kGeneralRegisterCount || !instruction->operandAddress.has_value()) {
                fail(result, "Invalid ADDL operands");
                return result;
            }
            const auto lhs = state_.gr[gr];
            state_.lastMemoryReadAddress = effective.effectiveAddress;
            state_.mdr = state_.memory[effective.effectiveAddress];
            const auto sum = static_cast<std::uint32_t>(lhs) + state_.mdr;
            state_.gr[gr] = static_cast<std::uint16_t>(sum & 0xffff);
            state_.lastRegisterWriteIndex = gr;
            state_.fr = flagsForLogicalAdd(lhs, state_.mdr);
            state_.pr = static_cast<std::uint16_t>(state_.pr + 2);
            state_.visualPath = VisualPathKind::ADDA_GrMdrToAluToGr;
            result.visualPath = state_.visualPath;
            result.ok = true;
            pushTrace("ADDL");
            break;
        }
        case Opcode::SUBL: {
            const auto gr = instruction->gr;
            if (gr >= kGeneralRegisterCount || !instruction->operandAddress.has_value()) {
                fail(result, "Invalid SUBL operands");
                return result;
            }
            const auto lhs = state_.gr[gr];
            state_.lastMemoryReadAddress = effective.effectiveAddress;
            state_.mdr = state_.memory[effective.effectiveAddress];
            state_.gr[gr] = static_cast<std::uint16_t>((static_cast<std::uint32_t>(lhs) - state_.mdr) & 0xffff);
            state_.lastRegisterWriteIndex = gr;
            state_.fr = flagsForLogicalSub(lhs, state_.mdr);
            state_.pr = static_cast<std::uint16_t>(state_.pr + 2);
            state_.visualPath = VisualPathKind::SUBA_GrMdrToAluToGr;
            result.visualPath = state_.visualPath;
            result.ok = true;
            pushTrace("SUBL");
            break;
        }
        case Opcode::AND:
        case Opcode::OR:
        case Opcode::XOR: {
            const auto gr = instruction->gr;
            if (gr >= kGeneralRegisterCount || !instruction->operandAddress.has_value()) {
                fail(result, "Invalid logical operands");
                return result;
            }
            const auto lhs = state_.gr[gr];
            state_.lastMemoryReadAddress = effective.effectiveAddress;
            state_.mdr = state_.memory[effective.effectiveAddress];
            std::uint16_t value = 0;
            if (instruction->opcode == Opcode::AND) value = static_cast<std::uint16_t>(lhs & state_.mdr);
            if (instruction->opcode == Opcode::OR) value = static_cast<std::uint16_t>(lhs | state_.mdr);
            if (instruction->opcode == Opcode::XOR) value = static_cast<std::uint16_t>(lhs ^ state_.mdr);
            state_.gr[gr] = value;
            state_.lastRegisterWriteIndex = gr;
            state_.fr = flagsForLogicalResult(value);
            state_.pr = static_cast<std::uint16_t>(state_.pr + 2);
            state_.visualPath = VisualPathKind::ADDA_GrMdrToAluToGr;
            result.visualPath = state_.visualPath;
            result.ok = true;
            pushTrace(opcodeName(instruction->opcode));
            break;
        }
        case Opcode::CPA: {
            const auto gr = instruction->gr;
            if (gr >= kGeneralRegisterCount || !instruction->operandAddress.has_value()) {
                fail(result, "Invalid CPA operands");
                return result;
            }
            state_.lastMemoryReadAddress = effective.effectiveAddress;
            state_.mdr = state_.memory[effective.effectiveAddress];
            state_.fr = flagsForCompare(state_.gr[gr], state_.mdr);
            state_.pr = static_cast<std::uint16_t>(state_.pr + 2);
            state_.visualPath = VisualPathKind::CPA_GrMdrToAluToFr;
            result.visualPath = state_.visualPath;
            result.ok = true;
            pushTrace("CPA");
            break;
        }
        case Opcode::CPL: {
            const auto gr = instruction->gr;
            if (gr >= kGeneralRegisterCount || !instruction->operandAddress.has_value()) {
                fail(result, "Invalid CPL operands");
                return result;
            }
            state_.lastMemoryReadAddress = effective.effectiveAddress;
            state_.mdr = state_.memory[effective.effectiveAddress];
            state_.fr = flagsForLogicalCompare(state_.gr[gr], state_.mdr);
            state_.pr = static_cast<std::uint16_t>(state_.pr + 2);
            state_.visualPath = VisualPathKind::CPA_GrMdrToAluToFr;
            result.visualPath = state_.visualPath;
            result.ok = true;
            pushTrace("CPL");
            break;
        }
        case Opcode::SLA:
        case Opcode::SRA:
        case Opcode::SLL:
        case Opcode::SRL: {
            const auto gr = instruction->gr;
            if (gr >= kGeneralRegisterCount || !instruction->operandAddress.has_value()) {
                fail(result, "Invalid shift operands");
                return result;
            }
            const auto shifted = shiftValue(instruction->opcode, state_.gr[gr], effective.effectiveAddress);
            state_.gr[gr] = shifted.value;
            state_.lastRegisterWriteIndex = gr;
            state_.fr = flagsForShift(shifted.value, shifted.shiftedOut);
            state_.pr = static_cast<std::uint16_t>(state_.pr + 2);
            state_.visualPath = VisualPathKind::Shift_AddressToAluToGr;
            result.visualPath = state_.visualPath;
            result.ok = true;
            pushTrace(opcodeName(instruction->opcode));
            break;
        }
        case Opcode::ST: {
            const auto gr = instruction->gr;
            if (gr >= kGeneralRegisterCount || !instruction->operandAddress.has_value()) {
                fail(result, "Invalid ST operands");
                return result;
            }
            state_.mdr = state_.gr[gr];
            state_.memory[effective.effectiveAddress] = state_.mdr;
            state_.lastMemoryWriteAddress = effective.effectiveAddress;
            state_.pr = static_cast<std::uint16_t>(state_.pr + 2);
            state_.visualPath = VisualPathKind::ST_GrToMdrToMemory;
            result.visualPath = state_.visualPath;
            result.ok = true;
            pushTrace("ST");
            break;
        }
        case Opcode::JUMP:
        case Opcode::JZE:
        case Opcode::JNZ:
        case Opcode::JPL:
        case Opcode::JMI:
        case Opcode::JOV: {
            if (!instruction->operandAddress.has_value()) {
                fail(result, "Invalid jump operand");
                return result;
            }
            const auto taken = isJumpTaken(instruction->opcode, state_.fr);
            state_.pr = taken ? effective.effectiveAddress : static_cast<std::uint16_t>(state_.pr + 2);
            state_.visualPath = instruction->opcode == Opcode::JUMP
                ? VisualPathKind::Jump_AddressToPr
                : taken
                    ? VisualPathKind::ConditionalJump_AddressToPr
                    : VisualPathKind::ConditionalJump_NotTaken;
            result.visualPath = state_.visualPath;
            result.ok = true;
            pushTrace(opcodeName(instruction->opcode));
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
