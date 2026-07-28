import type { AssembledInstruction, FlagsState, InstructionKind, RunState } from "./types";

export type ExecutionGranularity = "instruction" | "microcycle";

export type MicrocyclePhase =
  | "none"
  | "fetch"
  | "decode"
  | "effective-address"
  | "operand-read"
  | "execute"
  | "write-back"
  | "flag-update"
  | "complete";

export interface MicrocycleRuntimeState {
  phase: MicrocyclePhase;
  instructionKind?: InstructionKind;
  instructionAddress?: number;
  sourceLine?: number;
  microIndex: number;
  totalMicrosteps: number;
  instructionComplete: boolean;
  historySequence: number;
  detail: string;
}

export interface MicrocycleHistoryRecord {
  sequence: number;
  phase: Exclude<MicrocyclePhase, "none">;
  instructionAddress: number;
  instructionKind?: InstructionKind;
  prBefore: number;
  prAfter: number;
  spBefore: number;
  spAfter: number;
  marBefore: number;
  marAfter: number;
  mdrBefore: number;
  mdrAfter: number;
  irBefore: number;
  irAfter: number;
  callDepthBefore: number;
  callDepthAfter: number;
  flagsBefore: FlagsState;
  flagsAfter: FlagsState;
  runStateBefore: RunState;
  runStateAfter: RunState;
  generalRegisterChanges: readonly {
    index: number;
    before: number;
    after: number;
  }[];
  memoryChanges: readonly {
    address: number;
    before: number;
    after: number;
  }[];
}

export const EMPTY_MICROCYCLE_STATE: MicrocycleRuntimeState = {
  phase: "none",
  microIndex: 0,
  totalMicrosteps: 0,
  instructionComplete: false,
  historySequence: 0,
  detail: ""
};

const READ_WRITE_FLAGS = ["fetch", "decode", "effective-address", "operand-read", "execute", "write-back", "flag-update", "complete"] as const;
const COMPARE_FLAGS = ["fetch", "decode", "effective-address", "operand-read", "execute", "flag-update", "complete"] as const;
const ADDRESS_WRITE = ["fetch", "decode", "effective-address", "execute", "write-back", "complete"] as const;
const SHIFT = ["fetch", "decode", "effective-address", "execute", "write-back", "flag-update", "complete"] as const;
const BRANCH = ["fetch", "decode", "effective-address", "execute", "complete"] as const;

export const MICROCYCLE_PHASES_BY_INSTRUCTION: Readonly<Record<AssembledInstruction["op"], readonly Exclude<MicrocyclePhase, "none">[]>> = {
  NOP: ["fetch", "decode", "execute", "complete"],
  LD: READ_WRITE_FLAGS,
  ST: ADDRESS_WRITE,
  LAD: ADDRESS_WRITE,
  ADDA: READ_WRITE_FLAGS,
  SUBA: READ_WRITE_FLAGS,
  ADDL: READ_WRITE_FLAGS,
  SUBL: READ_WRITE_FLAGS,
  AND: READ_WRITE_FLAGS,
  OR: READ_WRITE_FLAGS,
  XOR: READ_WRITE_FLAGS,
  CPA: COMPARE_FLAGS,
  CPL: COMPARE_FLAGS,
  SLA: SHIFT,
  SRA: SHIFT,
  SLL: SHIFT,
  SRL: SHIFT,
  JMI: BRANCH,
  JNZ: BRANCH,
  JZE: BRANCH,
  JUMP: BRANCH,
  JPL: BRANCH,
  JOV: BRANCH,
  PUSH: ADDRESS_WRITE,
  POP: ["fetch", "decode", "operand-read", "execute", "write-back", "complete"],
  CALL: ADDRESS_WRITE,
  RET: ["fetch", "decode", "operand-read", "execute", "write-back", "complete"],
  SVC: BRANCH
};

export function phasesForInstruction(instruction: AssembledInstruction): readonly Exclude<MicrocyclePhase, "none">[] {
  const phases = MICROCYCLE_PHASES_BY_INSTRUCTION[instruction.op];
  if (instruction.sourceRegister === undefined) return phases;
  return phases.filter((phase) => phase !== "effective-address");
}

export const TEACHING_MICROARCHITECTURE_NAME = "stugx.CASL Teaching Microarchitecture v1";
