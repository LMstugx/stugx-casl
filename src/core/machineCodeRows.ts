import type { CometState, InstructionKind } from "./types";
import { formatWord } from "./types";
import type { CppToCaslMap } from "../transpiler/cppAst";
import { cppLineForCaslLine } from "../transpiler/cppMapping";
import { decodeIndexRegisterField, decodeOpcode, decodeRegisterField, encodingForMnemonic } from "./instructionEncoding";

export type MachineCodeRowKind = "instruction" | "operand" | "data" | "reserved";

export type MachineCodeRow = {
  address: number;
  word: number;
  sourceLineIndex: number;
  sourceText: string;
  label?: string;
  kind: MachineCodeRowKind;
  instruction?: InstructionKind;
  wordOffset: number;
  operandAddress?: number;
  resolvedLabel?: string;
  meaning: string;
  relatedCaslLine?: number;
  relatedCppLine?: number;
  isCurrentPr: boolean;
  isCurrentIr: boolean;
  isRead: boolean;
  isWritten: boolean;
};

export type MachineCodeExplanation = {
  address: number;
  word: number;
  sourceText: string;
  mnemonic?: InstructionKind;
  wordRole: MachineCodeRowKind;
  opcode?: number;
  register?: number;
  indexRegister?: number;
  operandAddress?: number;
  resolvedLabel?: string;
  meaning: string;
  binaryText: string;
};

const EXECUTABLE_INSTRUCTIONS = new Set<InstructionKind>([
  "LD",
  "LAD",
  "ADDA",
  "SUBA",
  "CPA",
  "ST",
  "JUMP",
  "JZE",
  "JNZ",
  "JPL",
  "JMI",
  "RET"
]);

export function selectMachineCodeRows(state: CometState, mapping: CppToCaslMap[] = []): MachineCodeRow[] {
  const labels = labelByAddress(state);
  const lastInstruction = state.lastStep ? state.program?.find((instruction) => instruction.address === state.lastStep?.executedAddress) : undefined;
  const irAddresses = new Set<number>();
  if (lastInstruction) {
    for (let offset = 0; offset < lastInstruction.size; offset += 1) irAddresses.add((lastInstruction.address + offset) & 0xffff);
  } else if (state.currentAddress !== undefined) {
    const currentInstruction = state.program?.find((instruction) => instruction.address === state.currentAddress);
    const size = currentInstruction?.size ?? 1;
    for (let offset = 0; offset < size; offset += 1) irAddresses.add((state.currentAddress + offset) & 0xffff);
  }

  return state.sourceMap.flatMap((entry) =>
    entry.machineWords.map((word, offset) => {
      const address = (entry.address + offset) & 0xffff;
      return {
        address,
        word,
        sourceLineIndex: entry.line,
        sourceText: normalizeSourceText(entry.source),
        label: offset === 0 ? entry.label : undefined,
        instruction: entry.instruction,
        wordOffset: offset,
        operandAddress: offset > 0 ? word : entry.machineWords[1],
        resolvedLabel: offset > 0 ? labels.get(word) : labels.get(entry.machineWords[1]),
        kind: machineRowKind(entry.instruction, offset),
        meaning: machineRowMeaning(entry.instruction, offset, entry.label, labels.get(offset > 0 ? word : entry.machineWords[1])),
        relatedCaslLine: entry.line,
        relatedCppLine: cppLineForCaslLine(mapping, entry.line),
        isCurrentPr: address === state.pr,
        isCurrentIr: irAddresses.has(address),
        isRead: state.lastMemoryReadAddress === address,
        isWritten: state.lastMemoryWriteAddress === address
      };
    })
  );
}

export function selectDefaultMachineCodeRow(rows: MachineCodeRow[]): MachineCodeRow | undefined {
  return rows.find((row) => row.isCurrentPr) ?? rows.find((row) => row.isCurrentIr) ?? rows[0];
}

export function explainMachineCodeRow(row: MachineCodeRow): MachineCodeExplanation {
  if (row.kind === "instruction") {
    const opcode = decodeOpcode(row.word);
    const encoding = encodingForMnemonic(row.instruction);
    const register = encoding?.format === "R_ADR" ? decodeRegisterField(row.word) : undefined;
    const indexRegister = encoding?.format === "R_ADR" ? decodeIndexRegisterField(row.word) : undefined;
    return {
      address: row.address,
      word: row.word,
      sourceText: row.sourceText,
      mnemonic: row.instruction,
      wordRole: row.kind,
      opcode,
      register,
      indexRegister,
      operandAddress: row.operandAddress,
      resolvedLabel: row.resolvedLabel,
      meaning: instructionMeaning(row, register),
      binaryText: row.word.toString(2).padStart(16, "0")
    };
  }

  if (row.kind === "operand") {
    return {
      address: row.address,
      word: row.word,
      sourceText: row.sourceText,
      mnemonic: row.instruction,
      wordRole: row.kind,
      operandAddress: row.word,
      resolvedLabel: row.resolvedLabel,
      meaning: `Operand address for ${row.sourceText}${row.resolvedLabel ? `; address of ${row.resolvedLabel}.` : "."}`,
      binaryText: row.word.toString(2).padStart(16, "0")
    };
  }

  return {
    address: row.address,
    word: row.word,
    sourceText: row.sourceText,
    mnemonic: row.instruction,
    wordRole: row.kind,
    resolvedLabel: row.label,
    meaning: row.kind === "data" ? `Data value${row.label ? ` for ${row.label}` : ""}.` : `Reserved data word${row.label ? ` for ${row.label}` : ""}.`,
    binaryText: row.word.toString(2).padStart(16, "0")
  };
}

function machineRowKind(instruction: InstructionKind | undefined, offset: number): MachineCodeRowKind {
  if (instruction === "DC") return "data";
  if (instruction === "DS") return "reserved";
  if (instruction && EXECUTABLE_INSTRUCTIONS.has(instruction)) return offset === 0 ? "instruction" : "operand";
  return offset === 0 ? "instruction" : "operand";
}

function machineRowMeaning(instruction: InstructionKind | undefined, offset: number, label?: string, resolvedLabel?: string): string {
  if (instruction === "DC") return label ? `data for ${label}` : "data";
  if (instruction === "DS") return label ? `reserved data for ${label}` : "reserved data";
  if (instruction === "RET") return "instruction word";
  if (offset === 0) return "opcode/register word";
  return "operand address";
}

function normalizeSourceText(source: string): string {
  return source.replace(/\s+/g, " ").trim();
}

function labelByAddress(state: CometState): Map<number, string> {
  const labels = new Map<number, string>();
  for (const entry of state.sourceMap) {
    if (entry.label) labels.set(entry.address, entry.label);
  }
  return labels;
}

function instructionMeaning(row: MachineCodeRow, register?: number): string {
  const operand = row.operandAddress === undefined ? "next operand word" : row.resolvedLabel ? `${row.resolvedLabel} (${formatWord(row.operandAddress)})` : formatWord(row.operandAddress);
  const gr = register === undefined ? "register" : `GR${register}`;
  switch (row.instruction) {
    case "LD":
      return `Load memory[${operand}] into ${gr}.`;
    case "LAD":
      return `Load address value ${operand} into ${gr}.`;
    case "ST":
      return `Store ${gr} into memory[${operand}].`;
    case "ADDA":
      return `Add memory[${operand}] to ${gr}.`;
    case "SUBA":
      return `Subtract memory[${operand}] from ${gr}.`;
    case "CPA":
      return `Compare ${gr} with memory[${operand}].`;
    case "JUMP":
      return `Jump to ${operand}.`;
    case "JZE":
      return `Jump to ${operand} when ZF is set.`;
    case "JNZ":
      return `Jump to ${operand} when ZF is not set.`;
    case "JPL":
      return `Jump to ${operand} when the result is positive.`;
    case "JMI":
      return `Jump to ${operand} when the sign flag is set.`;
    case "RET":
      return "Return and finish execution in this learning VM.";
    default:
      return row.meaning;
  }
}
