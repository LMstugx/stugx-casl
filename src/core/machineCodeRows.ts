import type { CometState, InstructionKind } from "./types";
import { formatWord, word as toWord } from "./types";
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
  baseAddress?: number;
  operandAddress?: number;
  indexRegister?: number;
  indexValue?: number;
  effectiveAddress?: number;
  resolvedLabel?: string;
  effectiveLabel?: string;
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
  indexValue?: number;
  baseAddress?: number;
  operandAddress?: number;
  effectiveAddress?: number;
  resolvedLabel?: string;
  effectiveLabel?: string;
  meaning: string;
  binaryText: string;
};

const EXECUTABLE_INSTRUCTIONS = new Set<InstructionKind>([
  "NOP",
  "LD",
  "LAD",
  "ADDA",
  "SUBA",
  "ADDL",
  "SUBL",
  "AND",
  "OR",
  "XOR",
  "CPA",
  "CPL",
  "SLA",
  "SRA",
  "SLL",
  "SRL",
  "ST",
  "JUMP",
  "JZE",
  "JNZ",
  "JPL",
  "JMI",
  "JOV",
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

  return state.sourceMap.flatMap((entry) => {
    const instruction = state.program?.find((programInstruction) => programInstruction.address === entry.address);
    const rawIndexRegister = instruction?.indexRegister ?? (entry.instruction && EXECUTABLE_INSTRUCTIONS.has(entry.instruction) ? decodeIndexRegisterField(entry.machineWords[0] ?? 0) : 0);
    const indexRegister = rawIndexRegister > 0 ? rawIndexRegister : undefined;
    const indexValue = indexRegister !== undefined ? state.gr[indexRegister] : undefined;
    const baseOperand = entry.machineWords[1];
    const effectiveAddress = baseOperand === undefined ? undefined : toWord(baseOperand + (indexValue ?? 0));

    return entry.machineWords.map((word, offset) => {
      const address = (entry.address + offset) & 0xffff;
      const rowBaseAddress = offset > 0 ? word : baseOperand;
      const rowEffectiveAddress = rowBaseAddress === undefined ? undefined : toWord(rowBaseAddress + (indexValue ?? 0));
      return {
        address,
        word,
        sourceLineIndex: entry.line,
        sourceText: normalizeSourceText(entry.source),
        label: offset === 0 ? entry.label : undefined,
        instruction: entry.instruction,
        wordOffset: offset,
        baseAddress: rowBaseAddress,
        operandAddress: rowBaseAddress,
        indexRegister,
        indexValue,
        effectiveAddress: rowEffectiveAddress,
        resolvedLabel: rowBaseAddress === undefined ? undefined : labels.get(rowBaseAddress),
        effectiveLabel: rowEffectiveAddress === undefined ? undefined : labels.get(rowEffectiveAddress),
        kind: machineRowKind(entry.instruction, offset),
        meaning: machineRowMeaning(entry.instruction, offset, entry.label, rowBaseAddress === undefined ? undefined : labels.get(rowBaseAddress), indexRegister, rowEffectiveAddress),
        relatedCaslLine: entry.line,
        relatedCppLine: cppLineForCaslLine(mapping, entry.line),
        isCurrentPr: address === state.pr,
        isCurrentIr: irAddresses.has(address),
        isRead: state.lastMemoryReadAddress === address,
        isWritten: state.lastMemoryWriteAddress === address
      };
    });
  });
}

export function selectDefaultMachineCodeRow(rows: MachineCodeRow[]): MachineCodeRow | undefined {
  return rows.find((row) => row.isCurrentPr) ?? rows.find((row) => row.isCurrentIr) ?? rows[0];
}

export function explainMachineCodeRow(row: MachineCodeRow): MachineCodeExplanation {
  if (row.kind === "instruction") {
    const opcode = decodeOpcode(row.word);
    const encoding = encodingForMnemonic(row.instruction);
    const register = encoding?.format === "R_ADR" ? decodeRegisterField(row.word) : undefined;
    const indexRegister = encoding?.format === "R_ADR" || encoding?.format === "JUMP_ADR" ? decodeIndexRegisterField(row.word) : undefined;
    return {
      address: row.address,
      word: row.word,
      sourceText: row.sourceText,
      mnemonic: row.instruction,
      wordRole: row.kind,
      opcode,
      register,
      indexRegister: indexRegister === 0 ? undefined : indexRegister,
      indexValue: row.indexValue,
      baseAddress: row.baseAddress,
      operandAddress: row.operandAddress,
      effectiveAddress: row.effectiveAddress,
      resolvedLabel: row.resolvedLabel,
      effectiveLabel: row.effectiveLabel,
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
      baseAddress: row.baseAddress,
      indexRegister: row.indexRegister,
      indexValue: row.indexValue,
      operandAddress: row.word,
      effectiveAddress: row.effectiveAddress,
      resolvedLabel: row.resolvedLabel,
      effectiveLabel: row.effectiveLabel,
      meaning: isShiftInstruction(row.instruction)
        ? `Shift count / effective address for ${row.sourceText}${operandIndexExplanation(row)}. This word is not a memory data read.`
        : `Operand address for ${row.sourceText}${operandIndexExplanation(row)}`,
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

function machineRowMeaning(instruction: InstructionKind | undefined, offset: number, label?: string, resolvedLabel?: string, indexRegister?: number, effectiveAddress?: number): string {
  if (instruction === "DC") return label ? `data for ${label}` : "data";
  if (instruction === "DS") return label ? `reserved data for ${label}` : "reserved data";
  if (instruction === "NOP") return "no-operation instruction word";
  if (instruction === "RET") return "instruction word";
  if (offset === 0) return "opcode/register word";
  if (indexRegister === undefined || effectiveAddress === undefined) {
    return isShiftInstruction(instruction) ? "shift count / effective address" : "operand address";
  }
  const indexSuffix = ` + GR${indexRegister} => ${formatWord(effectiveAddress)}`;
  if (isShiftInstruction(instruction)) return `shift count / effective address${indexSuffix}`;
  return `operand address${indexSuffix}${resolvedLabel ? ` (${resolvedLabel})` : ""}`;
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
  const operand = operandDisplay(row);
  const gr = register === undefined ? "register" : `GR${register}`;
  switch (row.instruction) {
    case "NOP":
      return "No operation; PR advances to the next word.";
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
    case "ADDL":
      return `Unsigned add memory[${operand}] to ${gr}.`;
    case "SUBL":
      return `Unsigned subtract memory[${operand}] from ${gr}.`;
    case "AND":
      return `Bitwise AND ${gr} with memory[${operand}].`;
    case "OR":
      return `Bitwise OR ${gr} with memory[${operand}].`;
    case "XOR":
      return `Bitwise XOR ${gr} with memory[${operand}].`;
    case "CPA":
      return `Compare ${gr} with memory[${operand}].`;
    case "CPL":
      return `Compare ${gr} with memory[${operand}] as unsigned 16-bit values.`;
    case "SLA":
      return `Arithmetic left shift ${gr} by ${operand}. The shifted-out bit updates OF when available.`;
    case "SRA":
      return `Arithmetic right shift ${gr} by ${operand}. The sign bit is preserved and the shifted-out bit updates OF when available.`;
    case "SLL":
      return `Logical left shift ${gr} by ${operand}. The shifted-out bit updates OF when available.`;
    case "SRL":
      return `Logical right shift ${gr} by ${operand}. The shifted-out bit updates OF when available.`;
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
    case "JOV":
      return `Jump to ${operand} when the overflow flag is set.`;
    case "RET":
      return "Return and finish execution in this learning VM.";
    default:
      return row.meaning;
  }
}

function isShiftInstruction(instruction: InstructionKind | undefined): boolean {
  return instruction === "SLA" || instruction === "SRA" || instruction === "SLL" || instruction === "SRL";
}

function operandDisplay(row: MachineCodeRow): string {
  if (row.operandAddress === undefined) return "next operand word";
  const base = row.resolvedLabel ? `${row.resolvedLabel} (${formatWord(row.operandAddress)})` : formatWord(row.operandAddress);
  if (row.indexRegister === undefined || row.indexValue === undefined || row.effectiveAddress === undefined) return base;
  const effective = row.effectiveLabel ? `${row.effectiveLabel} (${formatWord(row.effectiveAddress)})` : formatWord(row.effectiveAddress);
  return `${base} + GR${row.indexRegister}(${formatWord(row.indexValue)}) => ${effective}`;
}

function operandIndexExplanation(row: MachineCodeRow): string {
  const labelText = row.resolvedLabel ? `; base address of ${row.resolvedLabel}` : "";
  if (row.indexRegister === undefined || row.indexValue === undefined || row.effectiveAddress === undefined) {
    return `${labelText}.`;
  }
  const effectiveLabel = row.effectiveLabel ? ` (${row.effectiveLabel})` : "";
  return `${labelText}; GR${row.indexRegister}=${formatWord(row.indexValue)}; effective address ${formatWord(row.effectiveAddress)}${effectiveLabel}.`;
}
