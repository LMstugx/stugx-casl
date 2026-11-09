import { useMemo, useRef } from "react";
import type { CometState } from "../../core/types";
import { microcyclePhaseKey } from "../../i18n/microcycle";
import { useI18n } from "../../i18n/useI18n";
import { DatapathCanvas } from "./DatapathCanvas";
import { resolveActiveWires, toDatapathViewModel } from "./fromCometState";
import { useDatapathLabels } from "./labels";

/**
 * True when `next` is exactly one forward step after `previous`: one more instruction in
 * instruction granularity, one more phase in microcycle granularity. A reverse step, a reset,
 * an assemble, a debugger edit, and a batch of a continuous run are all not a single forward step.
 */
export function isSingleForwardStep(previous: CometState | undefined, next: CometState): boolean {
  if (!previous || previous === next) return false;
  if (next.runState === "Running" || previous.runState === "Running") return false;
  if (next.executionGranularity !== previous.executionGranularity) return false;
  if (next.executionGranularity === "microcycle") return next.microcycle.historySequence === previous.microcycle.historySequence + 1;
  return next.stepIndex === previous.stepIndex + 1;
}

interface LiveDatapathProps {
  state: CometState;
  compact?: boolean;
}

/**
 * The workbench datapath bound to the application's runtime state. It plays the motion of a step
 * only after a single forward step (ADR 0024); every other change just shows the new state.
 */
export function LiveDatapath({ state, compact = false }: LiveDatapathProps) {
  const { t } = useI18n();
  const labels = useDatapathLabels();

  // Remember the state shown before this one. Writing the ref while rendering is safe here:
  // the update depends only on the incoming state, so rendering twice gives the same result.
  const seen = useRef<{ current: CometState; previous?: CometState }>();
  if (!seen.current || seen.current.current !== state) {
    seen.current = { current: state, previous: seen.current?.current };
  }
  const forward = isSingleForwardStep(seen.current.previous, state);
  const previous = forward ? seen.current.previous : undefined;

  const phaseText =
    state.executionGranularity === "microcycle" && state.microcycle.phase !== "none"
      ? `${t(microcyclePhaseKey(state.microcycle.phase))} ${state.microcycle.microIndex}/${state.microcycle.totalMicrosteps}`
      : "";

  const model = useMemo(() => toDatapathViewModel(state, { previous, phaseText }), [state, previous, phaseText]);
  const activeWires = useMemo(() => [...resolveActiveWires(state)], [state]);

  return (
    <DatapathCanvas
      model={model}
      labels={labels}
      compact={compact}
      motion={forward ? "play" : "none"}
      activeWires={activeWires}
      stepKey={`${state.timelineRevision}:${state.stepIndex}:${state.microcycle.historySequence}`}
    />
  );
}
