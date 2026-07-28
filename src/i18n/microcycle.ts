import type { MicrocyclePhase } from "../core/microcycle";
import type { TranslationKey } from "./types";

const PHASE_KEYS: Readonly<Record<MicrocyclePhase, TranslationKey>> = {
  none: "cometMode.phase.ready",
  fetch: "cometMode.phase.fetch",
  decode: "cometMode.phase.decode",
  "effective-address": "cometMode.phase.effectiveAddress",
  "operand-read": "cometMode.phase.operandRead",
  execute: "cometMode.phase.execute",
  "write-back": "cometMode.phase.writeBack",
  "flag-update": "cometMode.phase.flagUpdate",
  complete: "cometMode.phase.complete"
};

export function microcyclePhaseKey(phase: MicrocyclePhase): TranslationKey {
  return PHASE_KEYS[phase];
}
