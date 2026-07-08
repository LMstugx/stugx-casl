import { formatHex16 } from "../utils/format";

export const WORD_MASK = 0xffff;

export enum VisualPathKind {
  None = "None",
  Ready_PrToMar = "Ready_PrToMar",
  LD_MemoryToMdrToGr = "LD_MemoryToMdrToGr",
  ST_GrToMdrToMemory = "ST_GrToMdrToMemory",
  ADDA_GrMdrToAluToGr = "ADDA_GrMdrToAluToGr",
  Finished_None = "Finished_None"
}

export type RunState = "Idle" | "Dirty" | "Ready" | "Running" | "Finished" | "Error";
export type InstructionKind = "START" | "END" | "DC" | "DS" | "LD" | "ADDA" | "ST" | "RET";

export interface FlagsState {
  z: boolean;
  c: boolean;
  n: boolean;
  o: boolean;
}

export interface MemoryRow {
  address: number;
  value: number;
  label?: string;
  changed?: boolean;
  current?: boolean;
}

export interface RegisterState {
  name: string;
  value: number;
  decimal: number;
  changed?: boolean;
}

export interface SourceMapEntry {
  line: number;
  address: number;
  machineWords: number[];
  source: string;
  label?: string;
  instruction?: InstructionKind;
}

export interface TraceEvent {
  index: number;
  address: number;
  instruction: string;
  detail: string;
}

export interface Diagnostic {
  line: number;
  message: string;
  severity: "error" | "warning";
}

export interface AssembledInstruction {
  address: number;
  line: number;
  op: "LD" | "ADDA" | "ST" | "RET";
  source: string;
  size: number;
  gr?: number;
  operandLabel?: string;
  operandAddress?: number;
}

export interface StepResult {
  executedAddress: number;
  executedLine: number;
  executedInstruction: string;
  visualPath: VisualPathKind;
}

export interface CometState {
  assembled: boolean;
  runState: RunState;
  pr: number;
  sp: number;
  ir: number;
  mar: number;
  mdr: number;
  fr: FlagsState;
  gr: number[];
  memory: Record<number, number>;
  initialMemory?: Record<number, number>;
  memoryRows: MemoryRow[];
  registers: RegisterState[];
  sourceMap: SourceMapEntry[];
  symbols: Record<string, number>;
  diagnostics: Diagnostic[];
  output: string[];
  trace: TraceEvent[];
  visualPath: VisualPathKind;
  stepIndex: number;
  currentLine?: number;
  currentAddress?: number;
  currentInstruction?: string;
  lastStep?: StepResult;
  program?: AssembledInstruction[];
  changedRegisters: string[];
  changedMemoryAddresses: number[];
}

export function word(value: number): number {
  return value & WORD_MASK;
}

export function formatWord(value: number, width = 4): string {
  const hex = formatHex16(value);
  return width === 4 ? hex : hex.slice(-width).padStart(width, "0");
}

export function formatFlags(flags: FlagsState): string {
  return `${flags.z ? "Z1" : "Z0"} ${flags.c ? "C1" : "C0"} ${flags.n ? "N1" : "N0"} ${flags.o ? "O1" : "O0"}`;
}
