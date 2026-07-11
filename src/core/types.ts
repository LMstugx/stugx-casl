import { formatHex16 } from "../utils/format";
import type { DiagnosticCode, DiagnosticParams, DiagnosticProducer, DiagnosticRelatedLocation, DiagnosticSeverity, SourceRange } from "../diagnostics/types";

export type { DiagnosticCode, DiagnosticParamValue, DiagnosticParams, DiagnosticProducer, DiagnosticRelatedLocation, DiagnosticSeverity, SourceRange } from "../diagnostics/types";

export const WORD_MASK = 0xffff;

export enum VisualPathKind {
  None = "None",
  Ready_PrToMar = "Ready_PrToMar",
  LD_MemoryToMdrToGr = "LD_MemoryToMdrToGr",
  ST_GrToMdrToMemory = "ST_GrToMdrToMemory",
  ADDA_GrMdrToAluToGr = "ADDA_GrMdrToAluToGr",
  LAD_AddressToGr = "LAD_AddressToGr",
  SUBA_GrMdrToAluToGr = "SUBA_GrMdrToAluToGr",
  CPA_GrMdrToAluToFr = "CPA_GrMdrToAluToFr",
  Shift_AddressToAluToGr = "Shift_AddressToAluToGr",
  PUSH_EffectiveAddressToStack = "PUSH_EffectiveAddressToStack",
  POP_StackToGr = "POP_StackToGr",
  CALL_ReturnAddressToStackAndPr = "CALL_ReturnAddressToStackAndPr",
  RET_StackToPr = "RET_StackToPr",
  Jump_AddressToPr = "Jump_AddressToPr",
  ConditionalJump_AddressToPr = "ConditionalJump_AddressToPr",
  ConditionalJump_NotTaken = "ConditionalJump_NotTaken",
  Finished_None = "Finished_None"
}

export type RunState = "Idle" | "Dirty" | "Ready" | "Running" | "Stopped" | "Finished" | "Error";
export type InstructionKind =
  | "START"
  | "END"
  | "DC"
  | "DS"
  | "NOP"
  | "LD"
  | "LAD"
  | "ADDA"
  | "SUBA"
  | "ADDL"
  | "SUBL"
  | "AND"
  | "OR"
  | "XOR"
  | "CPA"
  | "CPL"
  | "SLA"
  | "SRA"
  | "SLL"
  | "SRL"
  | "PUSH"
  | "POP"
  | "CALL"
  | "ST"
  | "JUMP"
  | "JZE"
  | "JNZ"
  | "JPL"
  | "JMI"
  | "JOV"
  | "RET";

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
  isPr?: boolean;
  isMar?: boolean;
  isLastRead?: boolean;
  isLastWrite?: boolean;
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
  source?: string;
  pr?: number;
  visualPath?: VisualPathKind;
  changedRegister?: string;
  changedRegisterValueBefore?: number;
  changedRegisterValueAfter?: number;
  changedMemoryAddress?: number;
  changedMemoryValueBefore?: number;
  changedMemoryValueAfter?: number;
  stackPointerValueBefore?: number;
  stackPointerValueAfter?: number;
  callDepthBefore?: number;
  callDepthAfter?: number;
  returnAddress?: number;
  stackAddress?: number;
  baseAddress?: number;
  indexRegister?: number;
  indexValue?: number;
  effectiveAddress?: number;
  runState?: RunState;
}

export interface Diagnostic<C extends DiagnosticCode = DiagnosticCode> {
  line: number;
  message: string;
  severity: DiagnosticSeverity;
  code?: C;
  producer?: DiagnosticProducer;
  params?: DiagnosticParams<C>;
  sourceRange?: SourceRange;
  relatedLocations?: readonly DiagnosticRelatedLocation[];
  fileName?: string;
  rawContext?: string;
  fallbackMessage?: string;
}

export interface AssembledInstruction {
  address: number;
  line: number;
  op: "NOP" | "LD" | "LAD" | "ADDA" | "SUBA" | "ADDL" | "SUBL" | "AND" | "OR" | "XOR" | "CPA" | "CPL" | "SLA" | "SRA" | "SLL" | "SRL" | "PUSH" | "POP" | "CALL" | "ST" | "JUMP" | "JZE" | "JNZ" | "JPL" | "JMI" | "JOV" | "RET";
  source: string;
  size: number;
  gr?: number;
  operandLabel?: string;
  operandAddress?: number;
  indexRegister?: number;
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
  callDepth: number;
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
  lastMemoryReadAddress?: number;
  lastMemoryWriteAddress?: number;
  lastBaseAddress?: number;
  lastIndexRegister?: number;
  lastIndexValue?: number;
  lastEffectiveAddress?: number;
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
