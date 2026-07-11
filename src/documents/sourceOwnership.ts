import type { Diagnostic, SourceMapEntry, TraceEvent } from "../core/types";
import type { SourceRange } from "../diagnostics/types";
import type { SourceUnitId } from "./types";

export interface SourceDerivedState {
  sourceUnitId: SourceUnitId;
  diagnostics: readonly Diagnostic[];
  selectedDiagnosticIdentity: string | null;
  editorMarkerRange: SourceRange | null;
  generatedCasl: string;
  machineCode: readonly number[];
  sourceMap: readonly SourceMapEntry[];
  trace: readonly TraceEvent[];
  assemblyResult: unknown | null;
  vmLoaded: boolean;
  framePlanPreview: unknown | null;
  selectedFrameSlotId: string | null;
}

export function createEmptySourceDerivedState(sourceUnitId: SourceUnitId): SourceDerivedState {
  return {
    sourceUnitId,
    diagnostics: [],
    selectedDiagnosticIdentity: null,
    editorMarkerRange: null,
    generatedCasl: "",
    machineCode: [],
    sourceMap: [],
    trace: [],
    assemblyResult: null,
    vmLoaded: false,
    framePlanPreview: null,
    selectedFrameSlotId: null
  };
}

export function createSourceDerivedState(
  sourceUnitId: SourceUnitId,
  values: Partial<Omit<SourceDerivedState, "sourceUnitId">> = {}
): SourceDerivedState {
  return { ...createEmptySourceDerivedState(sourceUnitId), ...values, sourceUnitId };
}

export function invalidateSourceDerivedState(nextSourceUnitId: SourceUnitId): SourceDerivedState {
  return createEmptySourceDerivedState(nextSourceUnitId);
}

export function isCurrentSourceOwner(ownedSourceUnitId: SourceUnitId, currentSourceUnitId: SourceUnitId): boolean {
  return ownedSourceUnitId === currentSourceUnitId;
}

export function canNavigateRelatedLocation(state: SourceDerivedState, currentSourceUnitId: SourceUnitId): boolean {
  return isCurrentSourceOwner(state.sourceUnitId, currentSourceUnitId) && state.selectedDiagnosticIdentity !== null;
}
