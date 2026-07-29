import type { ObservationMode } from "../preferences/types";

export const AUXILIARY_OBSERVATIONS = [
  "registers",
  "memory",
  "stack",
  "code-machine",
  "source-mapping",
  "trace",
  "console",
  "inspector"
] as const;

export const OBSERVATION_WORKSPACE_LAYOUTS = [
  "show-both",
  "circuit-focus",
  "data-focus"
] as const;

export type AuxiliaryObservation = (typeof AUXILIARY_OBSERVATIONS)[number];
export type ObservationWorkspaceLayout = (typeof OBSERVATION_WORKSPACE_LAYOUTS)[number];

export function auxiliaryObservationFromLegacyMode(mode: ObservationMode): AuxiliaryObservation {
  if (mode === "register-stack") return "registers";
  if (mode === "code-machine") return "code-machine";
  return "memory";
}

export function legacyModeForAuxiliaryObservation(observation: AuxiliaryObservation): ObservationMode {
  if (observation === "registers" || observation === "stack") return "register-stack";
  if (observation === "code-machine" || observation === "source-mapping") return "code-machine";
  return "cpu-flow";
}
