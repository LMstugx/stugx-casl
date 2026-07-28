#include "CometVm.hpp"
#include "DiagnosticCatalog.hpp"

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
        (result & 0x8000) != 0,
        overflow
    };
}

Flags flagsForLogicalResult(std::uint16_t value) {
    return {
        value == 0,
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
        (result & 0x8000) != 0,
        carry
    };
}

Flags flagsForLogicalSub(std::uint16_t lhs, std::uint16_t rhs) {
    const auto result = static_cast<std::uint16_t>((static_cast<std::uint32_t>(lhs) - rhs) & 0xffff);
    const auto borrow = lhs < rhs;
    return {
        result == 0,
        (result & 0x8000) != 0,
        borrow
    };
}

Flags flagsForCompare(std::uint16_t lhs, std::uint16_t rhs) {
    const auto diff = toSigned16(lhs) - toSigned16(rhs);
    return {
        diff == 0,
        diff < 0,
        false
    };
}

Flags flagsForLogicalCompare(std::uint16_t lhs, std::uint16_t rhs) {
    return {
        lhs == rhs,
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

std::optional<Opcode> opcodeForMachineByte(std::uint8_t value) {
    switch (value) {
        case 0x00: return Opcode::NOP;
        case 0x10:
        case 0x14: return Opcode::LD;
        case 0x11: return Opcode::ST;
        case 0x12: return Opcode::LAD;
        case 0x20:
        case 0x24: return Opcode::ADDA;
        case 0x21:
        case 0x25: return Opcode::SUBA;
        case 0x22:
        case 0x26: return Opcode::ADDL;
        case 0x23:
        case 0x27: return Opcode::SUBL;
        case 0x30:
        case 0x34: return Opcode::AND;
        case 0x31:
        case 0x35: return Opcode::OR;
        case 0x32:
        case 0x36: return Opcode::XOR;
        case 0x40:
        case 0x44: return Opcode::CPA;
        case 0x41:
        case 0x45: return Opcode::CPL;
        case 0x50: return Opcode::SLA;
        case 0x51: return Opcode::SRA;
        case 0x52: return Opcode::SLL;
        case 0x53: return Opcode::SRL;
        case 0x61: return Opcode::JMI;
        case 0x62: return Opcode::JNZ;
        case 0x63: return Opcode::JZE;
        case 0x64: return Opcode::JUMP;
        case 0x65: return Opcode::JPL;
        case 0x66: return Opcode::JOV;
        case 0x70: return Opcode::PUSH;
        case 0x71: return Opcode::POP;
        case 0x80: return Opcode::CALL;
        case 0x81: return Opcode::RET;
        case 0xf0: return Opcode::SVC;
        default: return std::nullopt;
    }
}

bool isRegisterFormByte(std::uint8_t value) {
    return value == 0x14 || value == 0x24 || value == 0x25 || value == 0x26 || value == 0x27 ||
           value == 0x34 || value == 0x35 || value == 0x36 || value == 0x44 || value == 0x45;
}

bool isRegisterAddressByte(std::uint8_t value) {
    return value == 0x10 || value == 0x11 || value == 0x12 || value == 0x20 || value == 0x21 ||
           value == 0x22 || value == 0x23 || value == 0x30 || value == 0x31 || value == 0x32 ||
           value == 0x40 || value == 0x41 || value == 0x50 || value == 0x51 || value == 0x52 ||
           value == 0x53;
}

bool isAddressOnlyByte(std::uint8_t value) {
    return value == 0x61 || value == 0x62 || value == 0x63 || value == 0x64 || value == 0x65 ||
           value == 0x66 || value == 0x70 || value == 0x80 || value == 0xf0;
}

}  // namespace

void CometVm::load(const AssembleOutput& program) {
    initialState_ = program.state;
    state_ = program.state;
    sourceMap_ = program.sourceMap;
    instructions_.clear();
    trace_.clear();
    inputQueue_.clear();

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
    state_.mar = instruction->address;
    const auto effective = effectiveAddressFor(state_, *instruction);
    if (instruction->operandAddress.has_value()) {
        state_.mar = effective.effectiveAddress;
    }
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
            if (gr >= kGeneralRegisterCount ||
                (!instruction->operandAddress.has_value() && !instruction->sourceRegister.has_value())) {
                fail(result, "Invalid LD operands");
                return result;
            }
            const auto value = instruction->sourceRegister.has_value()
                ? state_.gr[*instruction->sourceRegister]
                : state_.memory[effective.effectiveAddress];
            if (!instruction->sourceRegister.has_value()) {
                state_.lastMemoryReadAddress = effective.effectiveAddress;
                state_.mdr = value;
            }
            state_.gr[gr] = value;
            state_.fr = flagsForLogicalResult(value);
            state_.lastRegisterWriteIndex = gr;
            state_.pr = static_cast<std::uint16_t>(state_.pr + instruction->size);
            state_.visualPath = instruction->sourceRegister.has_value()
                ? VisualPathKind::None
                : VisualPathKind::LD_MemoryToMdrToGr;
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
            if (gr >= kGeneralRegisterCount ||
                (!instruction->operandAddress.has_value() && !instruction->sourceRegister.has_value())) {
                fail(result, "Invalid ADDA operands");
                return result;
            }
            const auto lhs = state_.gr[gr];
            const auto rhs = instruction->sourceRegister.has_value()
                ? state_.gr[*instruction->sourceRegister]
                : state_.memory[effective.effectiveAddress];
            if (!instruction->sourceRegister.has_value()) {
                state_.lastMemoryReadAddress = effective.effectiveAddress;
                state_.mdr = rhs;
            }
            const auto sum = static_cast<std::uint32_t>(lhs) + rhs;
            state_.gr[gr] = static_cast<std::uint16_t>(sum & 0xffff);
            state_.lastRegisterWriteIndex = gr;
            state_.fr = flagsForArithmetic(static_cast<std::int32_t>(sum), signedAddOverflow(lhs, rhs, sum));
            state_.pr = static_cast<std::uint16_t>(state_.pr + instruction->size);
            state_.visualPath = instruction->sourceRegister.has_value()
                ? VisualPathKind::None
                : VisualPathKind::ADDA_GrMdrToAluToGr;
            result.visualPath = state_.visualPath;
            result.ok = true;
            pushTrace("ADDA");
            break;
        }
        case Opcode::SUBA: {
            const auto gr = instruction->gr;
            if (gr >= kGeneralRegisterCount ||
                (!instruction->operandAddress.has_value() && !instruction->sourceRegister.has_value())) {
                fail(result, "Invalid SUBA operands");
                return result;
            }
            const auto lhs = state_.gr[gr];
            const auto rhs = instruction->sourceRegister.has_value()
                ? state_.gr[*instruction->sourceRegister]
                : state_.memory[effective.effectiveAddress];
            if (!instruction->sourceRegister.has_value()) {
                state_.lastMemoryReadAddress = effective.effectiveAddress;
                state_.mdr = rhs;
            }
            const auto diff = static_cast<std::int32_t>(lhs) - static_cast<std::int32_t>(rhs);
            state_.gr[gr] = static_cast<std::uint16_t>(diff & 0xffff);
            state_.lastRegisterWriteIndex = gr;
            state_.fr = flagsForArithmetic(diff, signedSubOverflow(lhs, rhs, diff));
            state_.pr = static_cast<std::uint16_t>(state_.pr + instruction->size);
            state_.visualPath = instruction->sourceRegister.has_value()
                ? VisualPathKind::None
                : VisualPathKind::SUBA_GrMdrToAluToGr;
            result.visualPath = state_.visualPath;
            result.ok = true;
            pushTrace("SUBA");
            break;
        }
        case Opcode::ADDL: {
            const auto gr = instruction->gr;
            if (gr >= kGeneralRegisterCount ||
                (!instruction->operandAddress.has_value() && !instruction->sourceRegister.has_value())) {
                fail(result, "Invalid ADDL operands");
                return result;
            }
            const auto lhs = state_.gr[gr];
            const auto rhs = instruction->sourceRegister.has_value()
                ? state_.gr[*instruction->sourceRegister]
                : state_.memory[effective.effectiveAddress];
            if (!instruction->sourceRegister.has_value()) {
                state_.lastMemoryReadAddress = effective.effectiveAddress;
                state_.mdr = rhs;
            }
            const auto sum = static_cast<std::uint32_t>(lhs) + rhs;
            state_.gr[gr] = static_cast<std::uint16_t>(sum & 0xffff);
            state_.lastRegisterWriteIndex = gr;
            state_.fr = flagsForLogicalAdd(lhs, rhs);
            state_.pr = static_cast<std::uint16_t>(state_.pr + instruction->size);
            state_.visualPath = instruction->sourceRegister.has_value()
                ? VisualPathKind::None
                : VisualPathKind::ADDA_GrMdrToAluToGr;
            result.visualPath = state_.visualPath;
            result.ok = true;
            pushTrace("ADDL");
            break;
        }
        case Opcode::SUBL: {
            const auto gr = instruction->gr;
            if (gr >= kGeneralRegisterCount ||
                (!instruction->operandAddress.has_value() && !instruction->sourceRegister.has_value())) {
                fail(result, "Invalid SUBL operands");
                return result;
            }
            const auto lhs = state_.gr[gr];
            const auto rhs = instruction->sourceRegister.has_value()
                ? state_.gr[*instruction->sourceRegister]
                : state_.memory[effective.effectiveAddress];
            if (!instruction->sourceRegister.has_value()) {
                state_.lastMemoryReadAddress = effective.effectiveAddress;
                state_.mdr = rhs;
            }
            state_.gr[gr] = static_cast<std::uint16_t>((static_cast<std::uint32_t>(lhs) - rhs) & 0xffff);
            state_.lastRegisterWriteIndex = gr;
            state_.fr = flagsForLogicalSub(lhs, rhs);
            state_.pr = static_cast<std::uint16_t>(state_.pr + instruction->size);
            state_.visualPath = instruction->sourceRegister.has_value()
                ? VisualPathKind::None
                : VisualPathKind::SUBA_GrMdrToAluToGr;
            result.visualPath = state_.visualPath;
            result.ok = true;
            pushTrace("SUBL");
            break;
        }
        case Opcode::AND:
        case Opcode::OR:
        case Opcode::XOR: {
            const auto gr = instruction->gr;
            if (gr >= kGeneralRegisterCount ||
                (!instruction->operandAddress.has_value() && !instruction->sourceRegister.has_value())) {
                fail(result, "Invalid logical operands");
                return result;
            }
            const auto lhs = state_.gr[gr];
            const auto rhs = instruction->sourceRegister.has_value()
                ? state_.gr[*instruction->sourceRegister]
                : state_.memory[effective.effectiveAddress];
            if (!instruction->sourceRegister.has_value()) {
                state_.lastMemoryReadAddress = effective.effectiveAddress;
                state_.mdr = rhs;
            }
            std::uint16_t value = 0;
            if (instruction->opcode == Opcode::AND) value = static_cast<std::uint16_t>(lhs & rhs);
            if (instruction->opcode == Opcode::OR) value = static_cast<std::uint16_t>(lhs | rhs);
            if (instruction->opcode == Opcode::XOR) value = static_cast<std::uint16_t>(lhs ^ rhs);
            state_.gr[gr] = value;
            state_.lastRegisterWriteIndex = gr;
            state_.fr = flagsForLogicalResult(value);
            state_.pr = static_cast<std::uint16_t>(state_.pr + instruction->size);
            state_.visualPath = instruction->sourceRegister.has_value()
                ? VisualPathKind::None
                : VisualPathKind::ADDA_GrMdrToAluToGr;
            result.visualPath = state_.visualPath;
            result.ok = true;
            pushTrace(opcodeName(instruction->opcode));
            break;
        }
        case Opcode::CPA: {
            const auto gr = instruction->gr;
            if (gr >= kGeneralRegisterCount ||
                (!instruction->operandAddress.has_value() && !instruction->sourceRegister.has_value())) {
                fail(result, "Invalid CPA operands");
                return result;
            }
            const auto rhs = instruction->sourceRegister.has_value()
                ? state_.gr[*instruction->sourceRegister]
                : state_.memory[effective.effectiveAddress];
            if (!instruction->sourceRegister.has_value()) {
                state_.lastMemoryReadAddress = effective.effectiveAddress;
                state_.mdr = rhs;
            }
            state_.fr = flagsForCompare(state_.gr[gr], rhs);
            state_.pr = static_cast<std::uint16_t>(state_.pr + instruction->size);
            state_.visualPath = instruction->sourceRegister.has_value()
                ? VisualPathKind::None
                : VisualPathKind::CPA_GrMdrToAluToFr;
            result.visualPath = state_.visualPath;
            result.ok = true;
            pushTrace("CPA");
            break;
        }
        case Opcode::CPL: {
            const auto gr = instruction->gr;
            if (gr >= kGeneralRegisterCount ||
                (!instruction->operandAddress.has_value() && !instruction->sourceRegister.has_value())) {
                fail(result, "Invalid CPL operands");
                return result;
            }
            const auto rhs = instruction->sourceRegister.has_value()
                ? state_.gr[*instruction->sourceRegister]
                : state_.memory[effective.effectiveAddress];
            if (!instruction->sourceRegister.has_value()) {
                state_.lastMemoryReadAddress = effective.effectiveAddress;
                state_.mdr = rhs;
            }
            state_.fr = flagsForLogicalCompare(state_.gr[gr], rhs);
            state_.pr = static_cast<std::uint16_t>(state_.pr + instruction->size);
            state_.visualPath = instruction->sourceRegister.has_value()
                ? VisualPathKind::None
                : VisualPathKind::CPA_GrMdrToAluToFr;
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
        case Opcode::PUSH: {
            if (!instruction->operandAddress.has_value()) {
                fail(result, "Invalid PUSH operand");
                return result;
            }
            const auto newSp = static_cast<std::uint16_t>(state_.sp - 1);
            state_.sp = newSp;
            state_.mar = newSp;
            state_.mdr = effective.effectiveAddress;
            state_.memory[newSp] = state_.mdr;
            state_.lastMemoryWriteAddress = newSp;
            state_.pr = static_cast<std::uint16_t>(state_.pr + 2);
            state_.visualPath = VisualPathKind::PUSH_EffectiveAddressToStack;
            result.visualPath = state_.visualPath;
            result.ok = true;
            pushTrace("PUSH");
            break;
        }
        case Opcode::POP: {
            const auto gr = instruction->gr;
            if (gr >= kGeneralRegisterCount) {
                fail(result, "Invalid POP operand");
                return result;
            }
            const auto oldSp = state_.sp;
            state_.mar = oldSp;
            state_.lastMemoryReadAddress = oldSp;
            state_.mdr = state_.memory[oldSp];
            state_.gr[gr] = state_.mdr;
            state_.lastRegisterWriteIndex = gr;
            state_.sp = static_cast<std::uint16_t>(state_.sp + 1);
            state_.pr = static_cast<std::uint16_t>(state_.pr + 1);
            state_.visualPath = VisualPathKind::POP_StackToGr;
            result.visualPath = state_.visualPath;
            result.ok = true;
            pushTrace("POP");
            break;
        }
        case Opcode::CALL: {
            if (!instruction->operandAddress.has_value()) {
                fail(result, "Invalid CALL operand");
                return result;
            }
            const auto newSp = static_cast<std::uint16_t>(state_.sp - 1);
            const auto returnAddress = static_cast<std::uint16_t>(instruction->address + 2);
            state_.sp = newSp;
            state_.mar = newSp;
            state_.mdr = returnAddress;
            state_.memory[newSp] = returnAddress;
            state_.lastMemoryWriteAddress = newSp;
            state_.pr = effective.effectiveAddress;
            state_.callDepth += 1;
            state_.visualPath = VisualPathKind::CALL_ReturnAddressToStackAndPr;
            result.visualPath = state_.visualPath;
            result.ok = true;
            pushTrace("CALL");
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
            if (state_.callDepth > 0) {
                const auto oldSp = state_.sp;
                state_.mar = oldSp;
                state_.lastMemoryReadAddress = oldSp;
                state_.mdr = state_.memory[oldSp];
                state_.pr = state_.mdr;
                state_.sp = static_cast<std::uint16_t>(state_.sp + 1);
                state_.callDepth -= 1;
                state_.visualPath = VisualPathKind::RET_StackToPr;
                result.visualPath = state_.visualPath;
                result.ok = true;
                pushTrace("RET_STACK");
            } else {
                state_.runState = RunState::Finished;
                state_.visualPath = VisualPathKind::Finished_None;
                result.visualPath = state_.visualPath;
                result.ok = true;
                result.finished = true;
                pushTrace("RET");
            }
            break;
        case Opcode::SVC: {
            if (!instruction->operandAddress.has_value()) {
                fail(result, "Invalid SVC operand");
                return result;
            }
            const auto service = effective.effectiveAddress;
            if (service == 1) {
                if (inputQueue_.empty()) {
                    state_.runState = RunState::WaitingInput;
                    state_.visualPath = VisualPathKind::None;
                    result.visualPath = state_.visualPath;
                    result.ok = true;
                    pushTrace("SVC_INPUT_WAIT");
                    updateCurrentInstruction();
                    return result;
                }
                auto record = std::move(inputQueue_.front());
                inputQueue_.pop_front();
                const auto area = state_.gr[1];
                const auto lengthArea = state_.gr[2];
                if (record.endOfFile) {
                    state_.memory[lengthArea] = 0xffff;
                    state_.lastMemoryWriteAddress = lengthArea;
                    state_.mdr = 0xffff;
                } else {
                    const auto count = std::min<std::size_t>(256, record.characters.size());
                    for (std::size_t index = 0; index < count; ++index) {
                        state_.memory[static_cast<std::uint16_t>(area + index)] =
                            static_cast<std::uint16_t>(record.characters[index] & 0x00ff);
                    }
                    state_.memory[lengthArea] = static_cast<std::uint16_t>(count);
                    state_.lastMemoryWriteAddress = lengthArea;
                    state_.mdr = static_cast<std::uint16_t>(count);
                }
                state_.fr = {};
                state_.runState = RunState::Ready;
                pushTrace("SVC_INPUT");
            } else if (service == 2) {
                const auto area = state_.gr[1];
                const auto lengthArea = state_.gr[2];
                const auto count = std::min<std::uint16_t>(256, state_.memory[lengthArea]);
                std::vector<std::uint16_t> record;
                record.reserve(count);
                for (std::uint16_t index = 0; index < count; ++index) {
                    record.push_back(static_cast<std::uint16_t>(
                        state_.memory[static_cast<std::uint16_t>(area + index)] & 0x00ff
                    ));
                }
                state_.consoleOutput.push_back(std::move(record));
                if (state_.consoleOutput.size() > kMaxConsoleOutputRecords) {
                    state_.consoleOutput.erase(state_.consoleOutput.begin());
                }
                state_.lastMemoryReadAddress = lengthArea;
                state_.mdr = state_.memory[lengthArea];
                state_.fr = {};
                pushTrace("SVC_OUTPUT");
            } else {
                fail(result, "Unsupported SVC service");
                return result;
            }
            state_.pr = static_cast<std::uint16_t>(state_.pr + 2);
            state_.visualPath = VisualPathKind::None;
            result.visualPath = state_.visualPath;
            result.ok = true;
            break;
        }
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
        structureDiagnostic(result.diagnostics.back());
        result.diagnostics.back().params["stepLimit"] = maxSteps;
        return result;
    }

    for (int stepCount = 0; stepCount < maxSteps; stepCount += 1) {
        if (state_.runState == RunState::Finished || state_.runState == RunState::WaitingInput) {
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

    if (state_.runState == RunState::WaitingInput) {
        result.ok = true;
        return result;
    }
    if (state_.runState != RunState::Finished) {
        state_.runState = RunState::Error;
        result.stoppedAtMaxSteps = true;
        result.diagnostics.push_back({0, Severity::Error, "Max steps reached"});
        structureDiagnostic(result.diagnostics.back());
        result.diagnostics.back().params["stepLimit"] = maxSteps;
    }

    return result;
}

void CometVm::reset() {
    state_ = initialState_;
    trace_.clear();
    inputQueue_.clear();
    updateCurrentInstruction();
}

void CometVm::reload(std::optional<std::uint16_t> uninitializedValue) {
    reset();
    if (!uninitializedValue.has_value()) return;

    for (const auto& entry : sourceMap_.entries()) {
        if (entry.instruction != Opcode::DS) continue;
        for (std::size_t offset = 0; offset < entry.machineWords.size(); ++offset) {
            const auto address = static_cast<std::uint32_t>(entry.address) + static_cast<std::uint32_t>(offset);
            if (address >= kMemorySize) break;
            state_.memory[address] = *uninitializedValue;
        }
    }
    updateCurrentInstruction();
}

void CometVm::enqueueInput(std::vector<std::uint16_t> characters, bool endOfFile) {
    if (characters.size() > 256) characters.resize(256);
    inputQueue_.push_back({std::move(characters), endOfFile});
    if (state_.runState == RunState::WaitingInput) {
        state_.runState = RunState::Ready;
    }
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
    if (!hasProgram_) return false;
    state_.memory[address] = value;
    prepareAfterManualMutation();
    return true;
}

bool CometVm::writeGeneralRegister(std::uint32_t index, std::uint16_t value) {
    if (index >= kGeneralRegisterCount || !hasProgram_) return false;
    state_.gr[index] = value;
    prepareAfterManualMutation();
    return true;
}

bool CometVm::setProgramCounter(std::uint32_t address) {
    if (address >= kMemorySize) {
        state_.runState = RunState::Error;
        return false;
    }
    if (!hasProgram_) return false;
    state_.pr = static_cast<std::uint16_t>(address);
    prepareAfterManualMutation();
    return true;
}

bool CometVm::setStackPointer(std::uint32_t address) {
    if (address >= kMemorySize || !hasProgram_) return false;
    state_.sp = static_cast<std::uint16_t>(address);
    prepareAfterManualMutation();
    return true;
}

void CometVm::setFlagsPacked(std::uint16_t value) {
    if (!hasProgram_) return;
    state_.fr = {
        (value & 0b0001) != 0,
        (value & 0b0010) != 0,
        (value & 0b0100) != 0
    };
    prepareAfterManualMutation();
}

void CometVm::fullClear() {
    initialState_ = CometState{};
    state_ = CometState{};
    sourceMap_ = SourceMap{};
    instructions_.clear();
    trace_.clear();
    inputQueue_.clear();
    hasProgram_ = false;
}

std::optional<Instruction> CometVm::instructionAt(std::uint16_t address) const {
    const auto original = instructions_.find(address);
    if (original == instructions_.end()) return std::nullopt;
    const auto machineWord = state_.memory[address];
    const auto opcodeByte = static_cast<std::uint8_t>((machineWord >> 8) & 0xff);
    const auto opcode = opcodeForMachineByte(opcodeByte);
    if (!opcode.has_value()) return std::nullopt;

    const auto registerField = static_cast<std::uint8_t>((machineWord >> 4) & 0x0f);
    const auto lowRegister = static_cast<std::uint8_t>(machineWord & 0x0f);
    Instruction decoded;
    decoded.address = address;
    decoded.line = original->second.line;
    decoded.opcode = *opcode;
    decoded.source = original->second.source;
    decoded.operandLabel = original->second.operandLabel;

    if (opcodeByte == 0x00 || opcodeByte == 0x81) {
        if ((machineWord & 0x00ff) != 0) return std::nullopt;
        decoded.size = 1;
        return decoded;
    }
    if (opcodeByte == 0x71) {
        if (registerField >= kGeneralRegisterCount || lowRegister != 0) return std::nullopt;
        decoded.gr = registerField;
        decoded.size = 1;
        return decoded;
    }
    if (isRegisterFormByte(opcodeByte)) {
        if (registerField >= kGeneralRegisterCount || lowRegister >= kGeneralRegisterCount) return std::nullopt;
        decoded.gr = registerField;
        decoded.sourceRegister = lowRegister;
        decoded.size = 1;
        return decoded;
    }
    if (isRegisterAddressByte(opcodeByte)) {
        if (registerField >= kGeneralRegisterCount || lowRegister >= kGeneralRegisterCount) return std::nullopt;
        decoded.gr = registerField;
        decoded.indexRegister = lowRegister;
        decoded.operandAddress = state_.memory[static_cast<std::uint16_t>(address + 1)];
        decoded.size = 2;
        return decoded;
    }
    if (isAddressOnlyByte(opcodeByte)) {
        if (registerField != 0 || lowRegister >= kGeneralRegisterCount) return std::nullopt;
        decoded.indexRegister = lowRegister;
        decoded.operandAddress = state_.memory[static_cast<std::uint16_t>(address + 1)];
        decoded.size = 2;
        return decoded;
    }
    return std::nullopt;
}

void CometVm::prepareAfterManualMutation() {
    state_.runState = RunState::Ready;
    state_.visualPath = VisualPathKind::None;
    state_.lastInstructionKind.reset();
    state_.lastMemoryReadAddress.reset();
    state_.lastMemoryWriteAddress.reset();
    state_.lastRegisterWriteIndex.reset();
    state_.lastBaseAddress.reset();
    state_.lastIndexRegister.reset();
    state_.lastIndexValue.reset();
    state_.lastEffectiveAddress.reset();
    updateCurrentInstruction();
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
    structureDiagnostic(result.diagnostics.back());
}

void CometVm::pushTrace(std::string event) {
    trace_.push_back(std::move(event));
    if (trace_.size() > kMaxTraceEvents) {
        trace_.erase(trace_.begin(), trace_.begin() + static_cast<std::ptrdiff_t>(trace_.size() - kMaxTraceEvents));
    }
}

}  // namespace casl
