import type { InstructionKind } from "./types";

export type InstructionFormat = "R_ADR" | "JUMP_ADR" | "RET" | "DATA";

export type InstructionEncoding = {
  mnemonic: InstructionKind;
  opcode: number;
  format: InstructionFormat;
  wordLength: number;
  description: string;
  fields: string[];
};

export const instructionEncodings: Partial<Record<InstructionKind, InstructionEncoding>> = {
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
  CPA: {
    mnemonic: "CPA",
    opcode: 0x40,
    format: "R_ADR",
    wordLength: 2,
    description: "Compare a general register with memory at operand address.",
    fields: ["opcode", "r", "x", "address"]
  },
  JMI: {
    mnemonic: "JMI",
    opcode: 0x61,
    format: "JUMP_ADR",
    wordLength: 2,
    description: "Jump when the sign flag is set.",
    fields: ["opcode", "address"]
  },
  JNZ: {
    mnemonic: "JNZ",
    opcode: 0x62,
    format: "JUMP_ADR",
    wordLength: 2,
    description: "Jump when the zero flag is not set.",
    fields: ["opcode", "address"]
  },
  JZE: {
    mnemonic: "JZE",
    opcode: 0x63,
    format: "JUMP_ADR",
    wordLength: 2,
    description: "Jump when the zero flag is set.",
    fields: ["opcode", "address"]
  },
  JUMP: {
    mnemonic: "JUMP",
    opcode: 0x64,
    format: "JUMP_ADR",
    wordLength: 2,
    description: "Jump unconditionally to the operand address.",
    fields: ["opcode", "address"]
  },
  JPL: {
    mnemonic: "JPL",
    opcode: 0x65,
    format: "JUMP_ADR",
    wordLength: 2,
    description: "Jump when the result is positive.",
    fields: ["opcode", "address"]
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
