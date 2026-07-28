import { formatHex16 } from "../utils/format";
import type { DiagnosticCode, DiagnosticParams, DiagnosticProducer, DiagnosticRelatedLocation, DiagnosticSeverity, SourceRange } from "../diagnostics/types";
import type { ExecutionGranularity, MicrocycleHistoryRecord, MicrocycleRuntimeState } from "./microcycle";

export type { DiagnosticCode, DiagnosticParamValue, DiagnosticParams, DiagnosticProducer, DiagnosticRelatedLocation, DiagnosticSeverity, SourceRange } from "../diagnostics/types";

export const WORD_MASK = 0xffff;

export enum VisualPathKind {
  None = "None",
  Ready_PrToMar = "Ready_PrToMar",
  Microcycle_Fetch = "Microcycle_Fetch",
  Microcycle_Decode = "Microcycle_Decode",
  Microcycle_EffectiveAddress = "Microcycle_EffectiveAddress",
  Microcycle_OperandReadMemory = "Microcycle_OperandReadMemory",
  Microcycle_OperandReadRegister = "Microcycle_OperandReadRegister",
  Microcycle_Execute = "Microcycle_Execute",
  Microcycle_WriteBackRegister = "Microcycle_WriteBackRegister",
  Microcycle_WriteBackMemory = "Microcycle_WriteBackMemory",
  Microcycle_FlagUpdate = "Microcycle_FlagUpdate",
  Microcycle_Complete = "Microcycle_Complete",
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

export type RunState = "Idle" | "Dirty" | "Ready" | "Running" | "WaitingInput" | "Stopped" | "Finished" | "Error";
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
  | "RET"
  | "SVC";

export interface FlagsState {
  z: boolean;
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
  kind?: "instruction" | "microcycle" | "debugger-register-edit" | "debugger-memory-edit" | "debugger-full-clear";
  eventId?: string;
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
  macroGroup?: "IN" | "OUT" | "RPUSH" | "RPOP";
  macroStepIndex?: number;
  macroStepCount?: number;
  sourceUnitId?: string;
  assemblyId?: string;
  executionEpoch?: number;
  runtimeImageRevision?: number;
  mutationTarget?: string;
  sourceMappingConfidence?: "exact" | "runtime-word-modified" | "unmapped";
  microcyclePhase?: MicrocycleRuntimeState["phase"];
  microIndex?: number;
  totalMicrosteps?: number;
  instructionComplete?: boolean;
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
  op: "NOP" | "LD" | "LAD" | "ADDA" | "SUBA" | "ADDL" | "SUBL" | "AND" | "OR" | "XOR" | "CPA" | "CPL" | "SLA" | "SRA" | "SLL" | "SRL" | "PUSH" | "POP" | "CALL" | "ST" | "JUMP" | "JZE" | "JNZ" | "JPL" | "JMI" | "JOV" | "RET" | "SVC";
  source: string;
  size: number;
  gr?: number;
  sourceRegister?: number;
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
  entryPoint?: number;
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
  consoleOutput: string[];
  consoleInputQueue?: Array<{ words: number[]; endOfFile: boolean }>;
  trace: TraceEvent[];
  visualPath: VisualPathKind;
  executionGranularity: ExecutionGranularity;
  microcycle: MicrocycleRuntimeState;
  microcycleHistory: MicrocycleHistoryRecord[];
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
  return `${flags.o ? "OF1" : "OF0"} ${flags.n ? "SF1" : "SF0"} ${flags.z ? "ZF1" : "ZF0"}`;
}
