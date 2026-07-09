import type { InstructionKind } from "./types";

export type InstructionFormat = "NO_OPERAND" | "R_ONLY" | "R_ADR" | "JUMP_ADR" | "RET" | "DATA";

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
    description: "Return from the program and finish execution in this learning VM.",
    fields: ["opcode"]
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
