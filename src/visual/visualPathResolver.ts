import { CometState, VisualPathKind } from "../core/types";
import { activeWireIdsByKind } from "./wirePaths";

export function resolveVisualPath(state: Pick<CometState, "runState" | "visualPath" | "lastStep">): VisualPathKind {
  if (state.runState === "Finished") return VisualPathKind.Finished_None;
  return state.lastStep?.visualPath ?? state.visualPath ?? VisualPathKind.None;
}

export function resolveActiveWireIds(kind: VisualPathKind): Set<string> {
  return new Set(activeWireIdsByKind[kind] ?? []);
}
