import type { CometState, InstructionKind } from "./types";
import type { CppToCaslMap } from "../transpiler/cppAst";
import { cppLineForCaslLine } from "../transpiler/cppMapping";

export type MachineCodeRowKind = "instruction" | "operand" | "data" | "reserved";

export type MachineCodeRow = {
  address: number;
  word: number;
  sourceLineIndex: number;
  sourceText: string;
  label?: string;
  kind: MachineCodeRowKind;
  meaning: string;
  relatedCaslLine?: number;
  relatedCppLine?: number;
  isCurrentPr: boolean;
  isCurrentIr: boolean;
  isRead: boolean;
  isWritten: boolean;
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
        kind: machineRowKind(entry.instruction, offset),
        meaning: machineRowMeaning(entry.instruction, offset, entry.label),
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

function machineRowKind(instruction: InstructionKind | undefined, offset: number): MachineCodeRowKind {
  if (instruction === "DC") return "data";
  if (instruction === "DS") return "reserved";
  if (instruction && EXECUTABLE_INSTRUCTIONS.has(instruction)) return offset === 0 ? "instruction" : "operand";
  return offset === 0 ? "instruction" : "operand";
}

function machineRowMeaning(instruction: InstructionKind | undefined, offset: number, label?: string): string {
  if (instruction === "DC") return label ? `data for ${label}` : "data";
  if (instruction === "DS") return label ? `reserved data for ${label}` : "reserved data";
  if (instruction === "RET") return "instruction word";
  if (offset === 0) return "opcode/register word";
  return "operand address";
}

function normalizeSourceText(source: string): string {
  return source.replace(/\s+/g, " ").trim();
}
