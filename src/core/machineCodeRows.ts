import type { CometState, InstructionKind } from "./types";
import { formatWord, word as toWord } from "./types";
import type { CppToCaslMap } from "../transpiler/cppAst";
import { cppLineForCaslLine } from "../transpiler/cppMapping";
import { decodeIndexRegisterField, decodeOpcode, decodeRegisterField, encodingForMnemonic, isRegisterFormInstructionWord } from "./instructionEncoding";

export type MachineCodeRowKind = "instruction" | "operand" | "data" | "reserved";

export type MachineCodeRow = {
  address: number;
  word: number;
  sourceLineIndex: number;
  sourceText: string;
  moduleId?: string;
  moduleName?: string;
  label?: string;
  kind: MachineCodeRowKind;
  instruction?: InstructionKind;
  sourceRegister?: number;
  wordOffset: number;
  baseAddress?: number;
  operandAddress?: number;
  indexRegister?: number;
  indexValue?: number;
  effectiveAddress?: number;
  callDepth?: number;
  callDepthBefore?: number;
  callDepthAfter?: number;
  returnAddress?: number;
  stackAddress?: number;
  isStackReturnContext?: boolean;
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
  sourceRegister?: number;
  indexRegister?: number;
  indexValue?: number;
  baseAddress?: number;
  operandAddress?: number;
  effectiveAddress?: number;
  callDepth?: number;
  callDepthBefore?: number;
  callDepthAfter?: number;
  returnAddress?: number;
  stackAddress?: number;
  isStackReturnContext?: boolean;
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
  "PUSH",
  "POP",
  "CALL",
  "ST",
  "JUMP",
  "JZE",
  "JNZ",
  "JPL",
  "JMI",
  "JOV",
  "RET",
  "SVC"
]);

export function selectMachineCodeRows(state: CometState, mapping: CppToCaslMap[] = []): MachineCodeRow[] {
  const labels = labelByAddress(state);
  const lastInstruction = state.lastStep ? state.program?.find((instruction) => instruction.address === state.lastStep?.executedAddress) : undefined;
  const latestTrace = state.trace[0];
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
    const sourceRegister = instruction?.sourceRegister
      ?? (isRegisterFormInstructionWord(entry.machineWords[0] ?? 0) ? decodeIndexRegisterField(entry.machineWords[0] ?? 0) : undefined);
    const rawIndexRegister = sourceRegister === undefined
      ? instruction?.indexRegister ?? (entry.instruction && EXECUTABLE_INSTRUCTIONS.has(entry.instruction) ? decodeIndexRegisterField(entry.machineWords[0] ?? 0) : 0)
      : 0;
    const indexRegister = rawIndexRegister > 0 ? rawIndexRegister : undefined;
    const indexValue = indexRegister !== undefined ? state.gr[indexRegister] : undefined;
    const baseOperand = entry.machineWords[1];
    const effectiveAddress = baseOperand === undefined ? undefined : toWord(baseOperand + (indexValue ?? 0));

    return entry.machineWords.map((word, offset) => {
      const address = (entry.address + offset) & 0xffff;
      const rowBaseAddress = offset > 0 ? word : baseOperand;
      const rowEffectiveAddress = rowBaseAddress === undefined ? undefined : toWord(rowBaseAddress + (indexValue ?? 0));
      const isLatestInstruction = latestTrace?.address === entry.address && latestTrace.instruction === entry.instruction;
      const staticReturnAddress = entry.instruction === "CALL" ? toWord(entry.address + 2) : undefined;
      return {
        address,
        word,
        sourceLineIndex: entry.line,
        sourceText: normalizeSourceText(entry.source),
        moduleId: entry.moduleId,
        moduleName: entry.moduleName,
        label: offset === 0 ? entry.label : undefined,
        instruction: entry.instruction,
        sourceRegister,
        wordOffset: offset,
        baseAddress: rowBaseAddress,
        operandAddress: rowBaseAddress,
        indexRegister,
        indexValue,
        effectiveAddress: rowEffectiveAddress,
        callDepth: state.callDepth,
        callDepthBefore: isLatestInstruction ? latestTrace?.callDepthBefore : undefined,
        callDepthAfter: isLatestInstruction ? latestTrace?.callDepthAfter : undefined,
        returnAddress: isLatestInstruction ? latestTrace?.returnAddress ?? staticReturnAddress : staticReturnAddress,
        stackAddress: isLatestInstruction ? latestTrace?.stackAddress : undefined,
        isStackReturnContext: entry.instruction === "RET" && (state.callDepth > 0 || (state.lastStep?.executedAddress === entry.address && state.lastMemoryReadAddress !== undefined)),
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
    const register = encoding?.format === "R_ADR" || encoding?.format === "R_ONLY" ? decodeRegisterField(row.word) : undefined;
    const registerForm = row.sourceRegister !== undefined || isRegisterFormInstructionWord(row.word);
    const sourceRegister = registerForm ? row.sourceRegister ?? decodeIndexRegisterField(row.word) : undefined;
    const indexRegister = !registerForm && (encoding?.format === "R_ADR" || encoding?.format === "JUMP_ADR") ? decodeIndexRegisterField(row.word) : undefined;
    return {
      address: row.address,
      word: row.word,
      sourceText: row.sourceText,
      mnemonic: row.instruction,
      wordRole: row.kind,
      opcode,
      register,
      sourceRegister,
      indexRegister: indexRegister === 0 ? undefined : indexRegister,
      indexValue: row.indexValue,
      baseAddress: row.baseAddress,
      operandAddress: row.operandAddress,
      effectiveAddress: row.effectiveAddress,
      callDepth: row.callDepth,
      callDepthBefore: row.callDepthBefore,
      callDepthAfter: row.callDepthAfter,
      returnAddress: row.returnAddress,
      stackAddress: row.stackAddress,
      isStackReturnContext: row.isStackReturnContext,
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
      callDepth: row.callDepth,
      callDepthBefore: row.callDepthBefore,
      callDepthAfter: row.callDepthAfter,
      returnAddress: row.returnAddress,
      stackAddress: row.stackAddress,
      isStackReturnContext: row.isStackReturnContext,
      resolvedLabel: row.resolvedLabel,
      effectiveLabel: row.effectiveLabel,
      meaning: row.instruction === "PUSH"
        ? `Effective address operand for ${row.sourceText}${operandIndexExplanation(row)} PUSH stores this effective address value, not memory data.`
        : row.instruction === "CALL"
        ? `Subroutine target operand for ${row.sourceText}${operandIndexExplanation(row)}. CALL pushes the return address, then jumps to this effective address.`
        : isShiftInstruction(row.instruction)
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
    if (instruction === "PUSH") return "effective address value to push";
    if (instruction === "CALL") return "subroutine target address";
    return isShiftInstruction(instruction) ? "shift count / effective address" : "operand address";
  }
  const indexSuffix = ` + GR${indexRegister} => ${formatWord(effectiveAddress)}`;
  if (instruction === "PUSH") return `effective address value to push${indexSuffix}`;
  if (instruction === "CALL") return `subroutine target address${indexSuffix}`;
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
  const registerSource = row.sourceRegister === undefined ? undefined : `GR${row.sourceRegister}`;
  switch (row.instruction) {
    case "NOP":
      return "No operation; PR advances to the next word.";
    case "LD":
      return registerSource ? `Copy ${registerSource} into ${gr}; no data-memory operand is read.` : `Load memory[${operand}] into ${gr}.`;
    case "LAD":
      return `Load address value ${operand} into ${gr}.`;
    case "ST":
      return `Store ${gr} into memory[${operand}].`;
    case "ADDA":
      return registerSource ? `Add ${registerSource} to ${gr}.` : `Add memory[${operand}] to ${gr}.`;
    case "SUBA":
      return registerSource ? `Subtract ${registerSource} from ${gr}.` : `Subtract memory[${operand}] from ${gr}.`;
    case "ADDL":
      return registerSource ? `Unsigned add ${registerSource} to ${gr}.` : `Unsigned add memory[${operand}] to ${gr}.`;
    case "SUBL":
      return registerSource ? `Unsigned subtract ${registerSource} from ${gr}.` : `Unsigned subtract memory[${operand}] from ${gr}.`;
    case "AND":
      return registerSource ? `Bitwise AND ${gr} with ${registerSource}.` : `Bitwise AND ${gr} with memory[${operand}].`;
    case "OR":
      return registerSource ? `Bitwise OR ${gr} with ${registerSource}.` : `Bitwise OR ${gr} with memory[${operand}].`;
    case "XOR":
      return registerSource ? `Bitwise XOR ${gr} with ${registerSource}.` : `Bitwise XOR ${gr} with memory[${operand}].`;
    case "CPA":
      return registerSource ? `Compare ${gr} with ${registerSource}.` : `Compare ${gr} with memory[${operand}].`;
    case "CPL":
      return registerSource ? `Compare ${gr} with ${registerSource} as unsigned 16-bit values.` : `Compare ${gr} with memory[${operand}] as unsigned 16-bit values.`;
    case "SLA":
      return `Arithmetic left shift ${gr} by ${operand}. The shifted-out bit updates OF when available.`;
    case "SRA":
      return `Arithmetic right shift ${gr} by ${operand}. The sign bit is preserved and the shifted-out bit updates OF when available.`;
    case "SLL":
      return `Logical left shift ${gr} by ${operand}. The shifted-out bit updates OF when available.`;
    case "SRL":
      return `Logical right shift ${gr} by ${operand}. The shifted-out bit updates OF when available.`;
    case "PUSH":
      return `Decrement SP and store effective address ${operand} at memory[SP]. This stores the address value, not memory data.`;
    case "POP":
      return `Load memory[SP] into ${gr}, then increment SP.`;
    case "CALL":
      return `Push return address ${row.returnAddress !== undefined ? formatWord(row.returnAddress) : "next instruction"} to memory[SP], then jump to ${operand}${row.stackAddress !== undefined ? `; stack write MEM[${formatWord(row.stackAddress)}]` : ""}${row.callDepthBefore !== undefined && row.callDepthAfter !== undefined ? `; callDepth ${row.callDepthBefore} -> ${row.callDepthAfter}` : ""}.`;
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
      return row.isStackReturnContext
        ? `Stack return: read ${row.stackAddress !== undefined ? `MEM[${formatWord(row.stackAddress)}]` : "memory[SP]"} into PR${row.returnAddress !== undefined ? ` (${formatWord(row.returnAddress)})` : ""}, increment SP${row.callDepthBefore !== undefined && row.callDepthAfter !== undefined ? `, and change callDepth ${row.callDepthBefore} -> ${row.callDepthAfter}` : ""}.`
        : "Top-level return: finish execution because there is no active call frame.";
    case "SVC":
      return `Invoke teaching operating-system service ${operand}; service 1 is input and service 2 is output.`;
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
