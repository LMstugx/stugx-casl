import type { AssembledInstruction, InstructionKind } from "./types";

export type InstructionFormat = "NO_OPERAND" | "R_ONLY" | "R_ADR" | "R_R" | "JUMP_ADR" | "RET" | "DATA";

export type InstructionEncoding = {
  mnemonic: InstructionKind;
  opcode: number;
  format: InstructionFormat;
  wordLength: number;
  description: string;
  fields: string[];
};

export const instructionEncodings: Partial<Record<InstructionKind, InstructionEncoding>> = {
  NOP: {
    mnemonic: "NOP",
    opcode: 0x00,
    format: "NO_OPERAND",
    wordLength: 1,
    description: "No operation. PR advances to the next word.",
    fields: ["opcode"]
  },
  LD: {
    mnemonic: "LD",
    opcode: 0x10,
    format: "R_ADR",
    wordLength: 2,
    description: "Load memory at operand address into a general register.",
    fields: ["opcode", "r", "x", "address"]
  },
  ST: {
    mnemonic: "ST",
    opcode: 0x11,
    format: "R_ADR",
    wordLength: 2,
    description: "Store a general register into memory at operand address.",
    fields: ["opcode", "r", "x", "address"]
  },
  LAD: {
    mnemonic: "LAD",
    opcode: 0x12,
    format: "R_ADR",
    wordLength: 2,
    description: "Load the operand address value into a general register.",
    fields: ["opcode", "r", "x", "address"]
  },
  ADDA: {
    mnemonic: "ADDA",
    opcode: 0x20,
    format: "R_ADR",
    wordLength: 2,
    description: "Add memory at operand address to a general register.",
    fields: ["opcode", "r", "x", "address"]
  },
  SUBA: {
    mnemonic: "SUBA",
    opcode: 0x21,
    format: "R_ADR",
    wordLength: 2,
    description: "Subtract memory at operand address from a general register.",
    fields: ["opcode", "r", "x", "address"]
  },
  ADDL: {
    mnemonic: "ADDL",
    opcode: 0x22,
    format: "R_ADR",
    wordLength: 2,
    description: "Unsigned add memory at operand address to a general register.",
    fields: ["opcode", "r", "x", "address"]
  },
  SUBL: {
    mnemonic: "SUBL",
    opcode: 0x23,
    format: "R_ADR",
    wordLength: 2,
    description: "Unsigned subtract memory at operand address from a general register.",
    fields: ["opcode", "r", "x", "address"]
  },
  AND: {
    mnemonic: "AND",
    opcode: 0x30,
    format: "R_ADR",
    wordLength: 2,
    description: "Bitwise AND between a general register and memory at operand address.",
    fields: ["opcode", "r", "x", "address"]
  },
  OR: {
    mnemonic: "OR",
    opcode: 0x31,
    format: "R_ADR",
    wordLength: 2,
    description: "Bitwise OR between a general register and memory at operand address.",
    fields: ["opcode", "r", "x", "address"]
  },
  XOR: {
    mnemonic: "XOR",
    opcode: 0x32,
    format: "R_ADR",
    wordLength: 2,
    description: "Bitwise XOR between a general register and memory at operand address.",
    fields: ["opcode", "r", "x", "address"]
  },
  CPA: {
    mnemonic: "CPA",
    opcode: 0x40,
    format: "R_ADR",
    wordLength: 2,
    description: "Compare a general register with memory at operand address.",
    fields: ["opcode", "r", "x", "address"]
  },
  CPL: {
    mnemonic: "CPL",
    opcode: 0x41,
    format: "R_ADR",
    wordLength: 2,
    description: "Unsigned compare a general register with memory at operand address.",
    fields: ["opcode", "r", "x", "address"]
  },
  SLA: {
    mnemonic: "SLA",
    opcode: 0x50,
    format: "R_ADR",
    wordLength: 2,
    description: "Arithmetic left shift of a general register by the operand address value.",
    fields: ["opcode", "r", "x", "shift-count"]
  },
  SRA: {
    mnemonic: "SRA",
    opcode: 0x51,
    format: "R_ADR",
    wordLength: 2,
    description: "Arithmetic right shift of a general register by the operand address value.",
    fields: ["opcode", "r", "x", "shift-count"]
  },
  SLL: {
    mnemonic: "SLL",
    opcode: 0x52,
    format: "R_ADR",
    wordLength: 2,
    description: "Logical left shift of a general register by the operand address value.",
    fields: ["opcode", "r", "x", "shift-count"]
  },
  SRL: {
    mnemonic: "SRL",
    opcode: 0x53,
    format: "R_ADR",
    wordLength: 2,
    description: "Logical right shift of a general register by the operand address value.",
    fields: ["opcode", "r", "x", "shift-count"]
  },
  PUSH: {
    mnemonic: "PUSH",
    opcode: 0x70,
    format: "JUMP_ADR",
    wordLength: 2,
    description: "Decrement SP and store the effective address value at Memory[SP].",
    fields: ["opcode", "x", "address"]
  },
  POP: {
    mnemonic: "POP",
    opcode: 0x71,
    format: "R_ONLY",
    wordLength: 1,
    description: "Load Memory[SP] into a general register, then increment SP.",
    fields: ["opcode", "r"]
  },
  CALL: {
    mnemonic: "CALL",
    opcode: 0x80,
    format: "JUMP_ADR",
    wordLength: 2,
    description: "Push the return address to Memory[SP], then jump to the operand address.",
    fields: ["opcode", "x", "address"]
  },
  JMI: {
    mnemonic: "JMI",
    opcode: 0x61,
    format: "JUMP_ADR",
    wordLength: 2,
    description: "Jump when the sign flag is set.",
    fields: ["opcode", "x", "address"]
  },
  JNZ: {
    mnemonic: "JNZ",
    opcode: 0x62,
    format: "JUMP_ADR",
    wordLength: 2,
    description: "Jump when the zero flag is not set.",
    fields: ["opcode", "x", "address"]
  },
  JZE: {
    mnemonic: "JZE",
    opcode: 0x63,
    format: "JUMP_ADR",
    wordLength: 2,
    description: "Jump when the zero flag is set.",
    fields: ["opcode", "x", "address"]
  },
  JUMP: {
    mnemonic: "JUMP",
    opcode: 0x64,
    format: "JUMP_ADR",
    wordLength: 2,
    description: "Jump unconditionally to the operand address.",
    fields: ["opcode", "x", "address"]
  },
  JPL: {
    mnemonic: "JPL",
    opcode: 0x65,
    format: "JUMP_ADR",
    wordLength: 2,
    description: "Jump when the result is positive.",
    fields: ["opcode", "x", "address"]
  },
  JOV: {
    mnemonic: "JOV",
    opcode: 0x66,
    format: "JUMP_ADR",
    wordLength: 2,
    description: "Jump when the overflow flag is set.",
    fields: ["opcode", "x", "address"]
  },
  RET: {
    mnemonic: "RET",
    opcode: 0x81,
    format: "RET",
    wordLength: 1,
    description: "Return through the stack when a call frame exists; otherwise finish execution.",
    fields: ["opcode"]
  },
  SVC: {
    mnemonic: "SVC",
    opcode: 0xf0,
    format: "JUMP_ADR",
    wordLength: 2,
    description: "Invoke the teaching operating-system service selected by the effective address.",
    fields: ["opcode", "x", "address"]
  },
  DC: {
    mnemonic: "DC",
    opcode: 0,
    format: "DATA",
    wordLength: 1,
    description: "Define a constant data word.",
    fields: ["value"]
  },
  DS: {
    mnemonic: "DS",
    opcode: 0,
    format: "DATA",
    wordLength: 1,
    description: "Reserve data word storage.",
    fields: ["value"]
  }
};

export function decodeOpcode(word: number): number {
  return (word >> 8) & 0xff;
}

export function decodeRegisterField(word: number): number {
  return (word >> 4) & 0x0f;
}

export function decodeIndexRegisterField(word: number): number {
  return word & 0x0f;
}

export function encodingForMnemonic(mnemonic: InstructionKind | undefined): InstructionEncoding | undefined {
  return mnemonic ? instructionEncodings[mnemonic] : undefined;
}

const REGISTER_FORM_OPCODE_BYTES = new Set([0x14, 0x24, 0x25, 0x26, 0x27, 0x34, 0x35, 0x36, 0x44, 0x45]);

export function isRegisterFormInstructionWord(word: number): boolean {
  return REGISTER_FORM_OPCODE_BYTES.has(decodeOpcode(word));
}

const OPCODE_TO_MNEMONIC = new Map<number, AssembledInstruction["op"]>([
  [0x00, "NOP"],
  [0x10, "LD"],
  [0x11, "ST"],
  [0x12, "LAD"],
  [0x14, "LD"],
  [0x20, "ADDA"],
  [0x21, "SUBA"],
  [0x22, "ADDL"],
  [0x23, "SUBL"],
  [0x24, "ADDA"],
  [0x25, "SUBA"],
  [0x26, "ADDL"],
  [0x27, "SUBL"],
  [0x30, "AND"],
  [0x31, "OR"],
  [0x32, "XOR"],
  [0x34, "AND"],
  [0x35, "OR"],
  [0x36, "XOR"],
  [0x40, "CPA"],
  [0x41, "CPL"],
  [0x44, "CPA"],
  [0x45, "CPL"],
  [0x50, "SLA"],
  [0x51, "SRA"],
  [0x52, "SLL"],
  [0x53, "SRL"],
  [0x61, "JMI"],
  [0x62, "JNZ"],
  [0x63, "JZE"],
  [0x64, "JUMP"],
  [0x65, "JPL"],
  [0x66, "JOV"],
  [0x70, "PUSH"],
  [0x71, "POP"],
  [0x80, "CALL"],
  [0x81, "RET"],
  [0xf0, "SVC"]
]);

const REGISTER_FORM_BYTES = new Set([0x14, 0x24, 0x25, 0x26, 0x27, 0x34, 0x35, 0x36, 0x44, 0x45]);
const REGISTER_ADDRESS_BYTES = new Set([0x10, 0x11, 0x12, 0x20, 0x21, 0x22, 0x23, 0x30, 0x31, 0x32, 0x40, 0x41, 0x50, 0x51, 0x52, 0x53]);
const ADDRESS_ONLY_BYTES = new Set([0x61, 0x62, 0x63, 0x64, 0x65, 0x66, 0x70, 0x80, 0xf0]);

export function decodeRuntimeInstruction(
  address: number,
  firstWord: number,
  secondWord: number,
  original?: AssembledInstruction
): AssembledInstruction | undefined {
  const opcodeByte = decodeOpcode(firstWord);
  const op = OPCODE_TO_MNEMONIC.get(opcodeByte);
  if (!op) return undefined;

  const register = decodeRegisterField(firstWord);
  const lowRegister = decodeIndexRegisterField(firstWord);
  const base = {
    address: address & 0xffff,
    line: original?.line ?? -1,
    op,
    source: original?.source ?? `${op} (runtime word)`,
    operandLabel: original?.operandLabel
  };

  if (opcodeByte === 0x00) {
    return (firstWord & 0xff) === 0 ? { ...base, size: 1 } : undefined;
  }
  if (opcodeByte === 0x81) {
    return (firstWord & 0xff) === 0 ? { ...base, size: 1 } : undefined;
  }
  if (opcodeByte === 0x71) {
    return register <= 7 && lowRegister === 0 ? { ...base, size: 1, gr: register } : undefined;
  }
  if (REGISTER_FORM_BYTES.has(opcodeByte)) {
    return register <= 7 && lowRegister <= 7
      ? { ...base, size: 1, gr: register, sourceRegister: lowRegister }
      : undefined;
  }
  if (REGISTER_ADDRESS_BYTES.has(opcodeByte)) {
    return register <= 7 && lowRegister <= 7
      ? {
          ...base,
          size: 2,
          gr: register,
          operandAddress: secondWord & 0xffff,
          indexRegister: lowRegister || undefined
        }
      : undefined;
  }
  if (ADDRESS_ONLY_BYTES.has(opcodeByte)) {
    return register === 0 && lowRegister <= 7
      ? {
          ...base,
          size: 2,
          operandAddress: secondWord & 0xffff,
          indexRegister: lowRegister || undefined
        }
      : undefined;
  }
  return undefined;
}
