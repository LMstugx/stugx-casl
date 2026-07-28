import { selectMemoryWindow } from "./selectors";
import { CometState, Diagnostic, InstructionKind } from "./types";
import type { DiagnosticParamValue, DiagnosticProducer, DiagnosticRelatedLocation, DiagnosticSeverity, SourceRange } from "../diagnostics/types";
import { encodeCaslInputRecord } from "./caslIoEncoding";
import { decodeRuntimeInstruction } from "./instructionEncoding";
import type { ExecutionGranularity, MicrocyclePhase } from "./microcycle";

export interface DiagnosticDto {
  line: number;
  message: string;
  severity: DiagnosticSeverity;
  code?: string;
  producer?: DiagnosticProducer;
  params?: Readonly<Record<string, DiagnosticParamValue>>;
  sourceRange?: SourceRange;
  relatedLocations?: readonly DiagnosticRelatedLocation[];
  fileName?: string;
  rawContext?: string;
  fallbackMessage?: string;
}

export interface SourceRowDto {
  line: number;
  address: number;
  machineWords: number[];
  source: string;
  label: string | null;
  instruction: InstructionKind | null;
  operandAddress: number | null;
  sourceRegister?: number | null;
  indexRegister: number | null;
  isCurrent: boolean;
}

export interface MemoryRowDto {
  address: number;
  value: number;
  label: string | null;
  isCurrent: boolean;
  isChanged: boolean;
}

export interface CometStateDto {
  runState: CometState["runState"];
  stepCount: number;
  pr: number;
  sp: number;
  callDepth: number;
  ir0: number;
  ir1: number | null;
  mar: number;
  mdr: number;
  gr: number[];
  frOF: boolean;
  frSF: boolean;
  frZF: boolean;
  executionGranularity?: ExecutionGranularity;
  microcyclePhase?: MicrocyclePhase;
  microcycleInstructionAddress?: number | null;
  microcycleInstructionKind?: InstructionKind | null;
  microcycleSourceLineIndex?: number | null;
  microcycleIndex?: number;
  microcycleTotal?: number;
  microcycleInstructionComplete?: boolean;
  microcycleHistorySequence?: number;
  microcycleDetail?: string;
  currentInstructionAddress: number | null;
  currentSourceLineIndex: number | null;
  currentInstructionText: string | null;
  lastInstructionKind: InstructionKind | null;
  lastMemoryReadAddress: number | null;
  lastMemoryWriteAddress: number | null;
  lastRegisterWriteIndex: number | null;
  baseAddress: number | null;
  indexRegister: number | null;
  indexValue: number | null;
  effectiveAddress: number | null;
  memoryWindow: MemoryRowDto[];
  sourceRows: SourceRowDto[];
  diagnostics: DiagnosticDto[];
  consoleOutput?: number[][];
}

export interface AssembleResultDto {
  ok: boolean;
  state: CometStateDto;
  diagnostics: DiagnosticDto[];
}

export interface StepResultDto {
  ok: boolean;
  state: CometStateDto;
  diagnostics: DiagnosticDto[];
}

function normalizeInstructionText(source?: string): string | null {
  return source ? source.replace(/\s+/g, " ") : null;
}

function instructionAtCurrentAddress(state: CometState) {
  const original = state.program?.find((instruction) => instruction.address === state.currentAddress);
  if (!original) return undefined;
  return decodeRuntimeInstruction(
    original.address,
    state.memory[original.address] ?? 0,
    state.memory[(original.address + 1) & 0xffff] ?? 0,
    original
  );
}

function instructionAtLastStep(state: CometState) {
  if (!state.lastStep) return undefined;
  const original = state.program?.find((instruction) => instruction.address === state.lastStep?.executedAddress);
  if (!original) return undefined;
  return decodeRuntimeInstruction(
    original.address,
    state.memory[original.address] ?? 0,
    state.memory[(original.address + 1) & 0xffff] ?? 0,
    original
  );
}

function readMemoryWord(state: CometState, address: number | undefined): number | null {
  if (address === undefined) return null;
  return state.memory[address] ?? 0;
}

function instructionSecondWordAddress(instruction: { address: number; size: number } | undefined): number | undefined {
  return instruction && instruction.size > 1 ? instruction.address + 1 : undefined;
}

function diagnosticsToDto(diagnostics: Diagnostic[]): DiagnosticDto[] {
  return diagnostics.map((diagnostic) => ({
    line: diagnostic.line,
    message: diagnostic.message,
    severity: diagnostic.severity,
    ...(diagnostic.code ? { code: diagnostic.code } : {}),
    ...(diagnostic.producer ? { producer: diagnostic.producer } : {}),
    ...(diagnostic.params ? { params: diagnostic.params } : {}),
    ...(diagnostic.sourceRange ? { sourceRange: diagnostic.sourceRange } : {}),
    ...(diagnostic.relatedLocations ? { relatedLocations: diagnostic.relatedLocations } : {}),
    ...(diagnostic.fileName ? { fileName: diagnostic.fileName } : {}),
    ...(diagnostic.rawContext ? { rawContext: diagnostic.rawContext } : {}),
    ...(diagnostic.fallbackMessage ? { fallbackMessage: diagnostic.fallbackMessage } : {})
  }));
}

function sourceRowsToDto(state: CometState): SourceRowDto[] {
  return state.sourceMap.map((entry) => {
    const programInstruction = state.program?.find((instruction) => instruction.address === entry.address);
    return {
      line: entry.line,
      address: entry.address,
      machineWords: [...entry.machineWords],
      source: entry.source,
      label: entry.label ?? null,
      instruction: entry.instruction ?? null,
      operandAddress: programInstruction?.operandAddress ?? null,
      ...(programInstruction?.sourceRegister !== undefined ? { sourceRegister: programInstruction.sourceRegister } : {}),
      indexRegister: programInstruction?.indexRegister ?? null,
      isCurrent: entry.address === state.currentAddress
    };
  });
}

function memoryWindowToDto(state: CometState, start: number, end: number): MemoryRowDto[] {
  return selectMemoryWindow(state, start, end).map((row) => ({
    address: row.address,
    value: row.value,
    label: row.label ?? null,
    isCurrent: row.current ?? false,
    isChanged: row.changed ?? false
  }));
}

function defaultMemoryEnd(state: CometState): number {
  const sourceEnd = state.sourceMap.reduce((end, row) => {
    const rowEnd = row.address + Math.max(1, row.machineWords.length) - 1;
    return Math.max(end, rowEnd);
  }, 0x2a);
  return Math.min(0xffff, sourceEnd);
}

export function toCometStateDto(state: CometState, memoryStart = 0x20, memoryEnd = defaultMemoryEnd(state)): CometStateDto {
  const lastInstruction = instructionAtLastStep(state);
  const currentInstruction = instructionAtCurrentAddress(state);
  const lastInstructionKind = lastInstruction?.op ?? null;
  const baseAddress = state.lastBaseAddress ?? lastInstruction?.operandAddress ?? null;
  const indexRegister = state.lastIndexRegister ?? lastInstruction?.indexRegister ?? null;
  const indexValue = state.lastIndexValue ?? (indexRegister !== null ? state.gr[indexRegister] : null);
  const effectiveAddress = state.lastEffectiveAddress ?? (baseAddress !== null ? (baseAddress + (indexValue ?? 0)) & 0xffff : null);
  const derivedLastMemoryReadAddress = lastInstruction?.sourceRegister !== undefined ? null :
    lastInstructionKind === "LD" || lastInstructionKind === "ADDA" || lastInstructionKind === "SUBA" ||
    lastInstructionKind === "ADDL" || lastInstructionKind === "SUBL" || lastInstructionKind === "AND" ||
    lastInstructionKind === "OR" || lastInstructionKind === "XOR" || lastInstructionKind === "CPA" ||
    lastInstructionKind === "CPL" ? effectiveAddress : null;
  const lastMemoryReadAddress = state.lastMemoryReadAddress ?? derivedLastMemoryReadAddress;
  const lastMemoryWriteAddress = state.lastMemoryWriteAddress ?? (lastInstructionKind === "ST" ? effectiveAddress : null);
  const lastRegisterWriteIndex = lastInstructionKind === "LD" || lastInstructionKind === "LAD" || lastInstructionKind === "ADDA" ||
    lastInstructionKind === "SUBA" || lastInstructionKind === "ADDL" || lastInstructionKind === "SUBL" ||
    lastInstructionKind === "AND" || lastInstructionKind === "OR" || lastInstructionKind === "XOR" ||
    lastInstructionKind === "SLA" || lastInstructionKind === "SRA" || lastInstructionKind === "SLL" ||
    lastInstructionKind === "SRL" || lastInstructionKind === "POP" ? lastInstruction?.gr ?? null : null;

  return {
    runState: state.runState,
    stepCount: state.stepIndex,
    pr: state.pr,
    sp: state.sp,
    callDepth: state.callDepth,
    ir0: state.ir,
    ir1: readMemoryWord(state, instructionSecondWordAddress(lastInstruction ?? currentInstruction)),
    mar: state.mar,
    mdr: state.mdr,
    gr: [...state.gr],
    frOF: state.fr.o,
    frSF: state.fr.n,
    frZF: state.fr.z,
    ...(state.executionGranularity === "microcycle"
      ? {
          executionGranularity: state.executionGranularity,
          microcyclePhase: state.microcycle.phase,
          microcycleInstructionAddress: state.microcycle.instructionAddress ?? null,
          microcycleInstructionKind: state.microcycle.instructionKind ?? null,
          microcycleSourceLineIndex: state.microcycle.sourceLine ?? null,
          microcycleIndex: state.microcycle.microIndex,
          microcycleTotal: state.microcycle.totalMicrosteps,
          microcycleInstructionComplete: state.microcycle.instructionComplete,
          microcycleHistorySequence: state.microcycle.historySequence,
          microcycleDetail: state.microcycle.detail
        }
      : {}),
    currentInstructionAddress: state.currentAddress ?? null,
    currentSourceLineIndex: state.currentLine ?? null,
    currentInstructionText: state.currentInstruction ?? null,
    lastInstructionKind,
    lastMemoryReadAddress,
    lastMemoryWriteAddress,
    lastRegisterWriteIndex,
    baseAddress,
    indexRegister,
    indexValue,
    effectiveAddress,
    ...(state.consoleOutput.length ? { consoleOutput: state.consoleOutput.map(encodeCaslInputRecord) } : {}),
    memoryWindow: memoryWindowToDto(state, memoryStart, memoryEnd),
    sourceRows: sourceRowsToDto(state),
    diagnostics: diagnosticsToDto(state.diagnostics)
  };
}

export function toAssembleResultDto(state: CometState, memoryStart = 0x20, memoryEnd = defaultMemoryEnd(state)): AssembleResultDto {
  return {
    ok: state.assembled && state.diagnostics.every((diagnostic) => diagnostic.severity !== "error"),
    state: toCometStateDto(state, memoryStart, memoryEnd),
    diagnostics: diagnosticsToDto(state.diagnostics)
  };
}

export function toStepResultDto(state: CometState, memoryStart = 0x20, memoryEnd = defaultMemoryEnd(state)): StepResultDto {
  return {
    ok: state.runState !== "Error",
    state: toCometStateDto(state, memoryStart, memoryEnd),
    diagnostics: diagnosticsToDto(state.diagnostics)
  };
}

export function normalizeCoreStateForGolden(state: CometState): CometStateDto {
  return toCometStateDto(state, 0x20, 0x2a);
}

export function normalizeInstructionForGolden(source?: string): string | null {
  return normalizeInstructionText(source);
}
