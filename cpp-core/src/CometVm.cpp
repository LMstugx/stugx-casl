#include "CometVm.hpp"
#include "DiagnosticCatalog.hpp"

#include <algorithm>
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

std::string microcyclePhaseName(MicrocyclePhase phase) {
    switch (phase) {
        case MicrocyclePhase::Fetch: return "fetch";
        case MicrocyclePhase::Decode: return "decode";
        case MicrocyclePhase::EffectiveAddress: return "effective-address";
        case MicrocyclePhase::OperandRead: return "operand-read";
        case MicrocyclePhase::Execute: return "execute";
        case MicrocyclePhase::WriteBack: return "write-back";
        case MicrocyclePhase::FlagUpdate: return "flag-update";
        case MicrocyclePhase::Complete: return "complete";
        default: return "none";
    }
}

bool isArithmeticOrLogical(Opcode opcode) {
    return opcode == Opcode::ADDA || opcode == Opcode::SUBA || opcode == Opcode::ADDL ||
           opcode == Opcode::SUBL || opcode == Opcode::AND || opcode == Opcode::OR ||
           opcode == Opcode::XOR;
}

bool isCompare(Opcode opcode) {
    return opcode == Opcode::CPA || opcode == Opcode::CPL;
}

bool isShift(Opcode opcode) {
    return opcode == Opcode::SLA || opcode == Opcode::SRA ||
           opcode == Opcode::SLL || opcode == Opcode::SRL;
}

bool isBranch(Opcode opcode) {
    return opcode == Opcode::JUMP || opcode == Opcode::JZE || opcode == Opcode::JNZ ||
           opcode == Opcode::JPL || opcode == Opcode::JMI || opcode == Opcode::JOV;
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
    clearMicrocycleRuntime();
    updateCurrentInstruction();
}

StepResult CometVm::step() {
    if (!microcycleContext_.has_value()) {
        auto result = stepReference();
        state_.executionGranularity = ExecutionGranularity::Instruction;
        state_.microcycle = {};
        return result;
    }

    StepResult result;
    state_.executionGranularity = ExecutionGranularity::Instruction;
    do {
        auto microResult = stepMicrocycle();
        state_.executionGranularity = ExecutionGranularity::Instruction;
        result.ok = microResult.ok;
        result.finished = microResult.finished;
        result.executedAddress = microResult.executedAddress;
        result.executedLine = microResult.executedLine;
        result.executedInstruction = microResult.executedInstruction;
        result.instructionKind = microResult.instructionKind;
        result.visualPath = microResult.visualPath;
        result.diagnostics = std::move(microResult.diagnostics);
        if (!result.ok || result.finished || microResult.instructionComplete || state_.runState == RunState::WaitingInput) break;
    } while (true);

    if (result.ok && result.instructionKind.has_value()) {
        if (state_.executionGranularity == ExecutionGranularity::Instruction) {
            if (result.instructionKind == Opcode::NOP || result.instructionKind == Opcode::SVC) {
                state_.visualPath = VisualPathKind::None;
            } else if (result.instructionKind == Opcode::LD) {
                state_.visualPath = state_.lastMemoryReadAddress.has_value()
                    ? VisualPathKind::LD_MemoryToMdrToGr
                    : VisualPathKind::None;
            } else if (result.instructionKind == Opcode::ST) {
                state_.visualPath = VisualPathKind::ST_GrToMdrToMemory;
            } else if (result.instructionKind == Opcode::LAD) {
                state_.visualPath = VisualPathKind::LAD_AddressToGr;
            } else if (result.instructionKind == Opcode::ADDA || result.instructionKind == Opcode::ADDL ||
                       result.instructionKind == Opcode::AND || result.instructionKind == Opcode::OR ||
                       result.instructionKind == Opcode::XOR) {
                state_.visualPath = state_.lastMemoryReadAddress.has_value()
                    ? VisualPathKind::ADDA_GrMdrToAluToGr
                    : VisualPathKind::None;
            } else if (result.instructionKind == Opcode::SUBA || result.instructionKind == Opcode::SUBL) {
                state_.visualPath = state_.lastMemoryReadAddress.has_value()
                    ? VisualPathKind::SUBA_GrMdrToAluToGr
                    : VisualPathKind::None;
            } else if (result.instructionKind == Opcode::CPA || result.instructionKind == Opcode::CPL) {
                state_.visualPath = state_.lastMemoryReadAddress.has_value()
                    ? VisualPathKind::CPA_GrMdrToAluToFr
                    : VisualPathKind::None;
            } else if (isShift(*result.instructionKind)) {
                state_.visualPath = VisualPathKind::Shift_AddressToAluToGr;
            } else if (result.instructionKind == Opcode::PUSH) {
                state_.visualPath = VisualPathKind::PUSH_EffectiveAddressToStack;
            } else if (result.instructionKind == Opcode::POP) {
                state_.visualPath = VisualPathKind::POP_StackToGr;
            } else if (result.instructionKind == Opcode::CALL) {
                state_.visualPath = VisualPathKind::CALL_ReturnAddressToStackAndPr;
            } else if (result.instructionKind == Opcode::RET) {
                state_.visualPath = state_.lastMemoryReadAddress.has_value()
                    ? VisualPathKind::RET_StackToPr
                    : VisualPathKind::Finished_None;
            } else if (result.instructionKind == Opcode::JUMP) {
                state_.visualPath = VisualPathKind::Jump_AddressToPr;
            } else if (isBranch(*result.instructionKind)) {
                state_.visualPath = state_.pr == state_.lastEffectiveAddress
                    ? VisualPathKind::ConditionalJump_AddressToPr
                    : VisualPathKind::ConditionalJump_NotTaken;
            }
            result.visualPath = state_.visualPath;
        }
    }
    state_.microcycle = {};
    return result;
}

std::vector<MicrocyclePhase> CometVm::phasesFor(const Instruction& instruction) const {
    if (instruction.opcode == Opcode::NOP) {
        return {MicrocyclePhase::Fetch, MicrocyclePhase::Decode, MicrocyclePhase::Execute, MicrocyclePhase::Complete};
    }
    if (instruction.opcode == Opcode::POP || instruction.opcode == Opcode::RET) {
        return {
            MicrocyclePhase::Fetch,
            MicrocyclePhase::Decode,
            MicrocyclePhase::OperandRead,
            MicrocyclePhase::Execute,
            MicrocyclePhase::WriteBack,
            MicrocyclePhase::Complete
        };
    }
    if (isBranch(instruction.opcode) || instruction.opcode == Opcode::SVC) {
        return {
            MicrocyclePhase::Fetch,
            MicrocyclePhase::Decode,
            MicrocyclePhase::EffectiveAddress,
            MicrocyclePhase::Execute,
            MicrocyclePhase::Complete
        };
    }
    if (isShift(instruction.opcode)) {
        return {
            MicrocyclePhase::Fetch,
            MicrocyclePhase::Decode,
            MicrocyclePhase::EffectiveAddress,
            MicrocyclePhase::Execute,
            MicrocyclePhase::WriteBack,
            MicrocyclePhase::FlagUpdate,
            MicrocyclePhase::Complete
        };
    }
    if (instruction.opcode == Opcode::ST || instruction.opcode == Opcode::LAD ||
        instruction.opcode == Opcode::PUSH || instruction.opcode == Opcode::CALL) {
        return {
            MicrocyclePhase::Fetch,
            MicrocyclePhase::Decode,
            MicrocyclePhase::EffectiveAddress,
            MicrocyclePhase::Execute,
            MicrocyclePhase::WriteBack,
            MicrocyclePhase::Complete
        };
    }

    std::vector<MicrocyclePhase> phases{
        MicrocyclePhase::Fetch,
        MicrocyclePhase::Decode,
        MicrocyclePhase::EffectiveAddress,
        MicrocyclePhase::OperandRead,
        MicrocyclePhase::Execute
    };
    if (!isCompare(instruction.opcode)) phases.push_back(MicrocyclePhase::WriteBack);
    phases.push_back(MicrocyclePhase::FlagUpdate);
    phases.push_back(MicrocyclePhase::Complete);
    if (instruction.sourceRegister.has_value()) {
        phases.erase(std::remove(phases.begin(), phases.end(), MicrocyclePhase::EffectiveAddress), phases.end());
    }
    return phases;
}

bool CometVm::beginMicrocycle(MicrocycleStepResult& result) {
    if (!hasProgram_) {
        result.ok = false;
        result.diagnostics.push_back({0, Severity::Error, "No program loaded"});
        structureDiagnostic(result.diagnostics.back());
        return false;
    }
    if (state_.runState == RunState::Finished || state_.runState == RunState::WaitingInput || state_.runState == RunState::Error) {
        result.ok = state_.runState == RunState::Finished;
        result.finished = state_.runState == RunState::Finished;
        return false;
    }
    const auto instruction = instructionAt(state_.pr);
    if (!instruction.has_value()) {
        state_.runState = RunState::Error;
        result.ok = false;
        result.diagnostics.push_back({0, Severity::Error, "No instruction at PR"});
        structureDiagnostic(result.diagnostics.back());
        return false;
    }

    MicrocycleContext context;
    context.instruction = *instruction;
    context.phases = phasesFor(*instruction);
    context.instructionAddress = instruction->address;
    context.sequentialPr = static_cast<std::uint16_t>(instruction->address + instruction->size);
    context.instructionStartMdr = state_.mdr;
    microcycleContext_ = std::move(context);
    state_.lastInstructionKind = instruction->opcode;
    state_.lastMemoryReadAddress.reset();
    state_.lastMemoryWriteAddress.reset();
    state_.lastRegisterWriteIndex.reset();
    state_.lastBaseAddress.reset();
    state_.lastIndexRegister.reset();
    state_.lastIndexValue.reset();
    state_.lastEffectiveAddress.reset();
    return true;
}

void CometVm::executeMicrocyclePhase(
    MicrocycleContext& context,
    MicrocyclePhase phase,
    MicrocycleStepResult& result
) {
    const auto& instruction = context.instruction;
    const auto effective = effectiveAddressFor(state_, instruction);
    const auto gr = instruction.gr;

    state_.visualPath = VisualPathKind::None;
    switch (phase) {
        case MicrocyclePhase::Fetch:
            state_.mar = instruction.address;
            state_.mdr = state_.memory[instruction.address];
            state_.ir = state_.mdr;
            state_.visualPath = VisualPathKind::Microcycle_Fetch;
            state_.microcycle.detail = "PR -> MAR; Memory[MAR] -> MDR -> IR";
            break;
        case MicrocyclePhase::Decode:
            if (instruction.size > 1) {
                state_.mar = static_cast<std::uint16_t>(instruction.address + 1);
                state_.mdr = state_.memory[state_.mar];
            }
            state_.visualPath = VisualPathKind::Microcycle_Decode;
            state_.microcycle.detail = opcodeName(instruction.opcode) + " decoded from IR";
            break;
        case MicrocyclePhase::EffectiveAddress:
            context.effectiveAddress = effective.effectiveAddress;
            state_.mar = effective.effectiveAddress;
            state_.lastBaseAddress = effective.baseAddress;
            state_.lastIndexRegister = effective.indexRegister;
            state_.lastIndexValue = effective.indexValue;
            state_.lastEffectiveAddress = effective.effectiveAddress;
            state_.visualPath = VisualPathKind::Microcycle_EffectiveAddress;
            state_.microcycle.detail = "Effective address resolved into MAR";
            break;
        case MicrocyclePhase::OperandRead:
            if (instruction.opcode == Opcode::POP || instruction.opcode == Opcode::RET) {
                if (instruction.opcode == Opcode::RET && state_.callDepth == 0) {
                    state_.microcycle.detail = "Top-level RET has no stack operand";
                    state_.visualPath = VisualPathKind::Microcycle_OperandReadRegister;
                    break;
                }
                context.stackAddress = state_.sp;
                context.stackReturn = instruction.opcode == Opcode::RET;
                state_.mar = context.stackAddress;
                state_.mdr = state_.memory[context.stackAddress];
                context.operand = state_.mdr;
                context.hasOperand = true;
                state_.lastMemoryReadAddress = context.stackAddress;
                state_.visualPath = VisualPathKind::Microcycle_OperandReadMemory;
                state_.microcycle.detail = "Memory[SP] -> MDR";
                break;
            }
            if (instruction.sourceRegister.has_value()) {
                context.operand = state_.gr[*instruction.sourceRegister];
                context.hasOperand = true;
                state_.visualPath = VisualPathKind::Microcycle_OperandReadRegister;
                state_.microcycle.detail = "Source GR operand read";
                break;
            }
            context.operand = state_.memory[context.effectiveAddress];
            context.hasOperand = true;
            state_.mar = context.effectiveAddress;
            state_.mdr = context.operand;
            state_.lastMemoryReadAddress = context.effectiveAddress;
            state_.visualPath = VisualPathKind::Microcycle_OperandReadMemory;
            state_.microcycle.detail = "Memory[EA] -> MDR";
            break;
        case MicrocyclePhase::Execute:
            state_.visualPath = VisualPathKind::Microcycle_Execute;
            if (instruction.opcode == Opcode::NOP) {
                state_.microcycle.detail = "No operation";
            } else if (instruction.opcode == Opcode::LD) {
                context.result = context.operand;
                context.hasResult = true;
                context.pendingFlags = flagsForLogicalResult(context.result);
                context.hasPendingFlags = true;
                state_.microcycle.detail = "Transfer operand prepared";
            } else if (instruction.opcode == Opcode::LAD) {
                context.result = context.effectiveAddress;
                context.hasResult = true;
                state_.microcycle.detail = "Effective address prepared as value";
            } else if (isArithmeticOrLogical(instruction.opcode)) {
                const auto lhs = state_.gr[gr];
                const auto rhs = context.operand;
                if (instruction.opcode == Opcode::ADDA) {
                    const auto sum = static_cast<std::uint32_t>(lhs) + rhs;
                    context.result = static_cast<std::uint16_t>(sum & 0xffff);
                    context.pendingFlags = flagsForArithmetic(
                        static_cast<std::int32_t>(sum),
                        signedAddOverflow(lhs, rhs, sum)
                    );
                } else if (instruction.opcode == Opcode::SUBA) {
                    const auto diff = static_cast<std::int32_t>(lhs) - static_cast<std::int32_t>(rhs);
                    context.result = static_cast<std::uint16_t>(diff & 0xffff);
                    context.pendingFlags = flagsForArithmetic(diff, signedSubOverflow(lhs, rhs, diff));
                } else if (instruction.opcode == Opcode::ADDL) {
                    context.result = static_cast<std::uint16_t>(
                        (static_cast<std::uint32_t>(lhs) + rhs) & 0xffff
                    );
                    context.pendingFlags = flagsForLogicalAdd(lhs, rhs);
                } else if (instruction.opcode == Opcode::SUBL) {
                    context.result = static_cast<std::uint16_t>(
                        (static_cast<std::uint32_t>(lhs) - rhs) & 0xffff
                    );
                    context.pendingFlags = flagsForLogicalSub(lhs, rhs);
                } else {
                    if (instruction.opcode == Opcode::AND) context.result = static_cast<std::uint16_t>(lhs & rhs);
                    if (instruction.opcode == Opcode::OR) context.result = static_cast<std::uint16_t>(lhs | rhs);
                    if (instruction.opcode == Opcode::XOR) context.result = static_cast<std::uint16_t>(lhs ^ rhs);
                    context.pendingFlags = flagsForLogicalResult(context.result);
                }
                context.hasResult = true;
                context.hasPendingFlags = true;
                state_.microcycle.detail = "ALU result prepared";
            } else if (isCompare(instruction.opcode)) {
                context.pendingFlags = instruction.opcode == Opcode::CPA
                    ? flagsForCompare(state_.gr[gr], context.operand)
                    : flagsForLogicalCompare(state_.gr[gr], context.operand);
                context.hasPendingFlags = true;
                state_.microcycle.detail = "Comparison result prepared for FR";
            } else if (isShift(instruction.opcode)) {
                const auto shifted = shiftValue(instruction.opcode, state_.gr[gr], context.effectiveAddress);
                context.result = shifted.value;
                context.hasResult = true;
                context.pendingFlags = flagsForShift(shifted.value, shifted.shiftedOut);
                context.hasPendingFlags = true;
                state_.microcycle.detail = "Shift result and shifted-out bit prepared";
            } else if (instruction.opcode == Opcode::ST) {
                state_.mdr = state_.gr[gr];
                context.result = state_.mdr;
                context.hasResult = true;
                state_.microcycle.detail = "GR -> MDR";
            } else if (instruction.opcode == Opcode::PUSH) {
                state_.sp = static_cast<std::uint16_t>(state_.sp - 1);
                context.stackAddress = state_.sp;
                state_.mar = context.stackAddress;
                state_.mdr = context.effectiveAddress;
                state_.microcycle.detail = "SP decremented; EA -> MDR";
            } else if (instruction.opcode == Opcode::POP) {
                context.result = context.operand;
                context.hasResult = true;
                state_.sp = static_cast<std::uint16_t>(state_.sp + 1);
                state_.microcycle.detail = "Stack word prepared; SP incremented";
            } else if (instruction.opcode == Opcode::CALL) {
                state_.sp = static_cast<std::uint16_t>(state_.sp - 1);
                context.stackAddress = state_.sp;
                state_.mar = context.stackAddress;
                state_.mdr = context.sequentialPr;
                state_.microcycle.detail = "SP decremented; return address -> MDR";
            } else if (instruction.opcode == Opcode::RET) {
                if (state_.callDepth > 0) {
                    state_.pr = context.operand;
                    context.stackReturn = true;
                    state_.microcycle.detail = "MDR -> PR";
                } else {
                    state_.microcycle.detail = "Top-level return prepared";
                }
            } else if (isBranch(instruction.opcode)) {
                context.branchTaken = isJumpTaken(instruction.opcode, state_.fr);
                state_.pr = context.branchTaken ? context.effectiveAddress : context.sequentialPr;
                state_.microcycle.detail = context.branchTaken ? "Condition true; EA -> PR" : "Condition false; sequential PR selected";
            } else if (instruction.opcode == Opcode::SVC) {
                const auto service = context.effectiveAddress;
                if (service == 1) {
                    if (inputQueue_.empty()) {
                        state_.runState = RunState::WaitingInput;
                        state_.mdr = context.instructionStartMdr;
                        state_.microcycle.detail = "SVC input waiting for a record";
                        result.ok = true;
                        return;
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
                    state_.microcycle.detail = "SVC input record transferred";
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
                    state_.microcycle.detail = "SVC output record transferred";
                } else {
                    state_.runState = RunState::Error;
                    state_.mdr = context.instructionStartMdr;
                    result.ok = false;
                    result.diagnostics.push_back({0, Severity::Error, "Unsupported SVC service"});
                    structureDiagnostic(result.diagnostics.back());
                    return;
                }
            }
            break;
        case MicrocyclePhase::WriteBack:
            if (instruction.opcode == Opcode::LD || instruction.opcode == Opcode::LAD ||
                isArithmeticOrLogical(instruction.opcode) || isShift(instruction.opcode) ||
                instruction.opcode == Opcode::POP) {
                state_.gr[gr] = context.result;
                state_.lastRegisterWriteIndex = gr;
                state_.visualPath = VisualPathKind::Microcycle_WriteBackRegister;
                state_.microcycle.detail = "Result -> destination GR";
            } else if (instruction.opcode == Opcode::ST) {
                state_.memory[context.effectiveAddress] = state_.mdr;
                state_.lastMemoryWriteAddress = context.effectiveAddress;
                state_.visualPath = VisualPathKind::Microcycle_WriteBackMemory;
                state_.microcycle.detail = "MDR -> Memory[EA]";
            } else if (instruction.opcode == Opcode::PUSH) {
                state_.memory[context.stackAddress] = state_.mdr;
                state_.lastMemoryWriteAddress = context.stackAddress;
                state_.visualPath = VisualPathKind::Microcycle_WriteBackMemory;
                state_.microcycle.detail = "MDR -> Memory[SP]";
            } else if (instruction.opcode == Opcode::CALL) {
                state_.memory[context.stackAddress] = state_.mdr;
                state_.lastMemoryWriteAddress = context.stackAddress;
                state_.pr = context.effectiveAddress;
                state_.callDepth += 1;
                state_.visualPath = VisualPathKind::Microcycle_WriteBackMemory;
                state_.microcycle.detail = "Return address stored; EA -> PR";
            } else if (instruction.opcode == Opcode::RET && context.stackReturn) {
                state_.sp = static_cast<std::uint16_t>(state_.sp + 1);
                state_.callDepth -= 1;
                state_.visualPath = VisualPathKind::Microcycle_WriteBackRegister;
                state_.microcycle.detail = "SP incremented; call depth decremented";
            } else {
                state_.visualPath = VisualPathKind::Microcycle_WriteBackRegister;
                state_.microcycle.detail = "No architectural write-back";
            }
            break;
        case MicrocyclePhase::FlagUpdate:
            if (context.hasPendingFlags) state_.fr = context.pendingFlags;
            state_.visualPath = VisualPathKind::Microcycle_FlagUpdate;
            state_.microcycle.detail = "OF/SF/ZF updated";
            break;
        case MicrocyclePhase::Complete:
            completeMicrocycleInstruction(context, result);
            break;
        default:
            break;
    }
}

void CometVm::completeMicrocycleInstruction(MicrocycleContext& context, MicrocycleStepResult& result) {
    const auto opcode = context.instruction.opcode;
    const auto updatesMdr =
        opcode == Opcode::ST || opcode == Opcode::PUSH || opcode == Opcode::POP ||
        opcode == Opcode::CALL || opcode == Opcode::SVC ||
        (opcode == Opcode::RET && context.stackReturn) ||
        ((opcode == Opcode::LD || isArithmeticOrLogical(opcode) || isCompare(opcode)) &&
         !context.instruction.sourceRegister.has_value());
    if (!updatesMdr) {
        state_.mdr = context.instructionStartMdr;
    }
    if (opcode == Opcode::RET && !context.stackReturn) {
        state_.runState = RunState::Finished;
    }
    if (!isBranch(opcode) && opcode != Opcode::CALL && opcode != Opcode::RET) {
        state_.pr = context.sequentialPr;
    }
    state_.stepCount += 1;
    state_.visualPath = VisualPathKind::Microcycle_Complete;
    state_.microcycle.detail = "Instruction complete";
    result.instructionComplete = true;
    result.finished = state_.runState == RunState::Finished;
    pushTrace(opcodeName(opcode));
    updateCurrentInstruction();
}

MicrocycleStepResult CometVm::stepMicrocycle() {
    MicrocycleStepResult result;
    state_.executionGranularity = ExecutionGranularity::Microcycle;
    if (!microcycleContext_.has_value() && !beginMicrocycle(result)) return result;

    auto& context = *microcycleContext_;
    if (context.nextPhaseIndex >= context.phases.size()) {
        microcycleContext_.reset();
        if (!beginMicrocycle(result)) return result;
    }
    auto& active = *microcycleContext_;
    const auto phase = active.phases[active.nextPhaseIndex];
    const auto prBefore = state_.pr;
    const auto spBefore = state_.sp;
    const auto marBefore = state_.mar;
    const auto mdrBefore = state_.mdr;
    const auto irBefore = state_.ir;
    const auto callDepthBefore = state_.callDepth;
    const auto flagsBefore = state_.fr;
    const auto runStateBefore = state_.runState;
    const auto grBefore = state_.gr;
    const auto memoryBefore = state_.memory;

    state_.microcycle = {
        phase,
        active.instruction.opcode,
        active.instruction.address,
        active.instruction.line,
        static_cast<int>(active.nextPhaseIndex + 1),
        static_cast<int>(active.phases.size()),
        false,
        microcycleSequence_ + 1,
        ""
    };
    result.phase = phase;
    result.executedAddress = active.instruction.address;
    result.executedLine = active.instruction.line;
    result.executedInstruction = active.instruction.source;
    result.instructionKind = active.instruction.opcode;
    result.ok = true;

    executeMicrocyclePhase(active, phase, result);
    if (!result.ok) {
        microcycleContext_.reset();
        return result;
    }

    microcycleSequence_ += 1;
    state_.microcycle.historySequence = microcycleSequence_;
    state_.microcycle.instructionComplete = result.instructionComplete;
    MicrocycleHistoryEntry history;
    history.sequence = microcycleSequence_;
    history.phase = phase;
    history.instructionAddress = active.instruction.address;
    history.prBefore = prBefore;
    history.prAfter = state_.pr;
    history.spBefore = spBefore;
    history.spAfter = state_.sp;
    history.marBefore = marBefore;
    history.marAfter = state_.mar;
    history.mdrBefore = mdrBefore;
    history.mdrAfter = state_.mdr;
    history.irBefore = irBefore;
    history.irAfter = state_.ir;
    history.callDepthBefore = callDepthBefore;
    history.callDepthAfter = state_.callDepth;
    history.flagsBefore = flagsBefore;
    history.flagsAfter = state_.fr;
    history.runStateBefore = runStateBefore;
    history.runStateAfter = state_.runState;
    history.grBefore = grBefore;
    history.grAfter = state_.gr;
    for (std::uint32_t address = 0; address < kMemorySize; ++address) {
        if (memoryBefore[address] == state_.memory[address]) continue;
        history.memoryChanges.push_back({
            static_cast<std::uint16_t>(address),
            memoryBefore[address],
            state_.memory[address]
        });
    }
    microcycleHistory_.push_back(std::move(history));
    if (microcycleHistory_.size() > kMaxTraceEvents) {
        microcycleHistory_.erase(microcycleHistory_.begin());
    }
    pushTrace("MICRO:" + microcyclePhaseName(phase));
    result.visualPath = state_.visualPath;
    active.nextPhaseIndex += 1;

    if (state_.runState == RunState::WaitingInput) {
        microcycleContext_.reset();
        return result;
    }
    if (result.instructionComplete) {
        microcycleContext_.reset();
    }
    return result;
}

RunResult CometVm::runMicrocycles(int maxMicrosteps) {
    RunResult result;
    if (maxMicrosteps <= 0) {
        result.stoppedAtMaxSteps = true;
        result.diagnostics.push_back({0, Severity::Error, "Max microsteps reached before execution"});
        structureDiagnostic(result.diagnostics.back());
        result.diagnostics.back().params["stepLimit"] = maxMicrosteps;
        return result;
    }
    for (int index = 0; index < maxMicrosteps; ++index) {
        if (state_.runState == RunState::Finished || state_.runState == RunState::WaitingInput || state_.runState == RunState::Error) {
            result.ok = state_.runState != RunState::Error;
            result.steps = index;
            return result;
        }
        const auto micro = stepMicrocycle();
        result.steps = index + 1;
        if (!micro.ok) {
            result.diagnostics = micro.diagnostics;
            return result;
        }
        if (micro.finished) {
            result.ok = true;
            return result;
        }
    }
    result.ok = true;
    result.stoppedAtMaxSteps = true;
    return result;
}

StepResult CometVm::stepReference() {
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
    clearMicrocycleRuntime();
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
        clearMicrocycleRuntime();
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
    clearMicrocycleRuntime();
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
    clearMicrocycleRuntime();
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

void CometVm::clearMicrocycleRuntime() {
    microcycleContext_.reset();
    microcycleHistory_.clear();
    microcycleSequence_ = 0;
    state_.executionGranularity = ExecutionGranularity::Instruction;
    state_.microcycle = {};
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
