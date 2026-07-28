import type { InstructionKind } from "./types";
import type { CometStateDto } from "./coreDto";
import type { MicrocyclePhase } from "./microcycle";
import type { ReverseMicrostepStatus, ReverseUnavailableReason } from "./reverseMicrocycle";
import type { SourceUnitId } from "../documents/types";

export type ReverseInstructionStatus = ReverseMicrostepStatus;
export type ReverseInstructionUnavailableReason = ReverseUnavailableReason;

export interface ReverseInstructionAvailability {
  available: boolean;
  reason: ReverseInstructionUnavailableReason;
  instructionId?: number;
  machineAddress?: number;
  instructionKind?: InstructionKind;
  reversibleMicrosteps: number;
  complete: boolean;
}

export interface ReverseInstructionRequest {
  sourceUnitId: SourceUnitId;
  assemblyId: string;
  executionEpoch: number;
  historyEpoch: number;
  timelineRevision: number;
}

export interface ReverseInstructionAvailabilityDto {
  available: boolean;
  reason: ReverseInstructionUnavailableReason;
  instructionId?: number | null;
  machineAddress?: number | null;
  instructionKind?: InstructionKind | null;
  reversibleMicrosteps: number;
  complete: boolean;
}

export interface ReverseInstructionResultDto {
  status: ReverseInstructionStatus;
  reversedInstructionId?: number | null;
  reversedMicrostepCount: number;
  machineAddress?: number | null;
  mnemonic?: InstructionKind | null;
  restoredPhase?: MicrocyclePhase | null;
  historyEpoch: number;
  timelineRevision: number;
  availability: ReverseInstructionAvailabilityDto;
  state: CometStateDto;
}

export const EMPTY_REVERSE_INSTRUCTION_AVAILABILITY: ReverseInstructionAvailability = {
  available: false,
  reason: "runtime-not-loaded",
  reversibleMicrosteps: 0,
  complete: false
};
