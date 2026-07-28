import type { CometStateDto } from "../core/coreDto";
import type { CaslNumericDisplayMode } from "../core/caslNumericFormat";
import type { SourceMapEntry } from "../core/types";
import type { SourceUnitId } from "../documents/types";

export type DebuggerRegisterName =
  | "GR0"
  | "GR1"
  | "GR2"
  | "GR3"
  | "GR4"
  | "GR5"
  | "GR6"
  | "GR7";

export type DebuggerMutationTarget =
  | { kind: "general-register"; register: DebuggerRegisterName }
  | { kind: "program-register" }
  | { kind: "stack-pointer" }
  | { kind: "flag-register" }
  | { kind: "memory-word"; address: number };

export interface DebuggerMutationRequest {
  mutationId: string;
  sourceUnitId: SourceUnitId;
  assemblyId: string;
  executionEpoch: number;
  target: DebuggerMutationTarget;
  nextWord: number;
}

export type SafeDebuggerMutationFailure =
  | "invalid-value"
  | "not-loaded"
  | "source-dirty"
  | "running"
  | "file-operation-active"
  | "stale-source-unit"
  | "stale-assembly"
  | "stale-execution-epoch"
  | "transaction-active"
  | "backend-rejected";

export interface DebuggerMutationResult {
  status: "applied" | "cancelled" | "rejected" | "stale";
  previousWord?: number;
  nextWord?: number;
  runtimeImageRevision?: number;
  reason?: SafeDebuggerMutationFailure;
}

export interface CoreDebuggerMutationResult extends DebuggerMutationResult {
  state: CometStateDto;
}

export type DebuggerNumberParseResult =
  | { ok: true; word: number }
  | { ok: false; reason: "invalid-format" | "out-of-range" };

export type DebuggerMemoryCategory =
  | "unassigned"
  | "program"
  | "data"
  | "reserved"
  | "stack"
  | "runtime-io"
  | "unknown";

export type SourceMappingConfidence = "exact" | "runtime-word-modified" | "unmapped";

export interface RuntimeWordOverride {
  address: number;
  originalWord: number;
  currentWord: number;
  category: DebuggerMemoryCategory;
  sourceMappingConfidence: SourceMappingConfidence;
}

export function parseDebuggerWord(text: string, mode: CaslNumericDisplayMode): DebuggerNumberParseResult {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, reason: "invalid-format" };

  if (mode === "hex") {
    const normalized = trimmed.replace(/^#/, "").replace(/^0x/i, "");
    if (!/^[0-9a-fA-F]{1,4}$/.test(normalized)) return { ok: false, reason: "invalid-format" };
    return { ok: true, word: Number.parseInt(normalized, 16) };
  }

  if (mode === "signed") {
    if (!/^-?(?:0|[1-9][0-9]*)$/.test(trimmed)) return { ok: false, reason: "invalid-format" };
    const value = Number(trimmed);
    if (!Number.isSafeInteger(value) || value < -32768 || value > 32767) {
      return { ok: false, reason: "out-of-range" };
    }
    return { ok: true, word: value & 0xffff };
  }

  if (mode === "unsigned") {
    if (!/^(?:0|[1-9][0-9]*)$/.test(trimmed)) return { ok: false, reason: "invalid-format" };
    const value = Number(trimmed);
    if (!Number.isSafeInteger(value) || value < 0 || value > 0xffff) {
      return { ok: false, reason: "out-of-range" };
    }
    return { ok: true, word: value };
  }

  const normalized = trimmed.replace(/^0b/i, "").replace(/ /g, "");
  if (!/^[01]{1,16}$/.test(normalized)) return { ok: false, reason: "invalid-format" };
  return { ok: true, word: Number.parseInt(normalized, 2) };
}

export function isDebuggerWord(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 0xffff;
}

export function isValidDebuggerMutationTarget(target: DebuggerMutationTarget): boolean {
  if (target.kind === "general-register") return /^GR[0-7]$/.test(target.register);
  if (target.kind === "memory-word") return isDebuggerWord(target.address);
  return target.kind === "program-register"
    || target.kind === "stack-pointer"
    || target.kind === "flag-register";
}

export function registerIndex(register: DebuggerRegisterName): number {
  return Number(register.slice(2));
}

export function packDebuggerFlags(flags: { o: boolean; n: boolean; z: boolean; c: boolean }): number {
  return (flags.o ? 0b1000 : 0)
    | (flags.z ? 0b0100 : 0)
    | (flags.c ? 0b0010 : 0)
    | (flags.n ? 0b0001 : 0);
}

export function categorizeMemoryAddress(
  sourceMap: readonly SourceMapEntry[],
  address: number,
  stackPointer?: number
): DebuggerMemoryCategory {
  const normalized = address & 0xffff;
  const entry = sourceMap.find(
    (candidate) => normalized >= candidate.address
      && normalized < candidate.address + Math.max(1, candidate.machineWords.length)
  );
  if (entry?.instruction === "DC") return "data";
  if (entry?.instruction === "DS") return "reserved";
  if (entry?.instruction) return "program";
  if (stackPointer !== undefined && normalized >= stackPointer) return "stack";
  return "unassigned";
}

export function sourceMappingConfidenceFor(
  category: DebuggerMemoryCategory,
  modified: boolean
): SourceMappingConfidence {
  if (category === "unassigned" || category === "unknown") return "unmapped";
  return modified ? "runtime-word-modified" : "exact";
}

export function targetDisplayName(target: DebuggerMutationTarget): string {
  if (target.kind === "general-register") return target.register;
  if (target.kind === "program-register") return "PR";
  if (target.kind === "stack-pointer") return "SP";
  if (target.kind === "flag-register") return "FR";
  return `MEM[${target.address.toString(16).toUpperCase().padStart(4, "0")}]`;
}
