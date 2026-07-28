import type { MicrocyclePhase } from "./microcycle";
import type { CometStateDto } from "./coreDto";
import type { SourceUnitId } from "../documents/types";

export type ReverseMicrostepStatus =
  | "reversed"
  | "unavailable"
  | "blocked"
  | "stale"
  | "corrupt-history"
  | "cancelled";

export type ReverseUnavailableReason =
  | "available"
  | "no-history"
  | "running"
  | "waiting-input"
  | "svc-boundary"
  | "io-boundary"
  | "mutation-boundary"
  | "reset-boundary"
  | "reload-boundary"
  | "full-clear-boundary"
  | "assembly-boundary"
  | "source-replacement-boundary"
  | "history-capacity-boundary"
  | "history-epoch-mismatch"
  | "execution-epoch-mismatch"
  | "runtime-not-loaded"
  | "history-corrupt";

export interface ReverseAvailability {
  available: boolean;
  reason: ReverseUnavailableReason;
  targetPhase?: MicrocyclePhase;
}

export interface MicrocycleHistorySummary {
  retainedEntries: number;
  capacity: number;
  floorEntryId?: number;
  droppedEntryCount: number;
}

export interface ReverseMicrostepRequest {
  sourceUnitId: SourceUnitId;
  assemblyId: string;
  executionEpoch: number;
  historyEpoch: number;
  timelineRevision: number;
}

export interface ReverseAvailabilityDto {
  available: boolean;
  reason: ReverseUnavailableReason;
  targetPhase?: MicrocyclePhase | null;
}

export interface ReverseMicrostepResultDto {
  status: ReverseMicrostepStatus;
  reversedEntryId?: number | null;
  previousPhase?: MicrocyclePhase | null;
  restoredPhase?: MicrocyclePhase | null;
  historyEpoch: number;
  timelineRevision: number;
  availability: ReverseAvailabilityDto;
  state: CometStateDto;
}

export const EMPTY_REVERSE_AVAILABILITY: ReverseAvailability = {
  available: false,
  reason: "runtime-not-loaded"
};

export const EMPTY_MICROCYCLE_HISTORY_SUMMARY: MicrocycleHistorySummary = {
  retainedEntries: 0,
  capacity: 1000,
  droppedEntryCount: 0
};
