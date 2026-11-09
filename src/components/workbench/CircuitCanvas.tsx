import type { CometState } from "../../core/types";
import type { TranslationKey } from "../../i18n/types";
import { useI18n } from "../../i18n/useI18n";
import { LiveDatapath } from "../../visual/datapath/LiveDatapath";

const NOTE_BY_RUN_STATE: Partial<Record<CometState["runState"], TranslationKey>> = {
  Idle: "workbench.overlay.idle",
  Dirty: "workbench.overlay.dirty",
  WaitingInput: "workbench.overlay.waitingInput",
  Finished: "workbench.overlay.finished",
  Error: "workbench.overlay.error"
};

/**
 * The one place the live datapath is put on screen. Besides the picture it says, in words, what
 * the run state means for the picture: nothing assembled yet, a stale picture after an edit, a
 * finished or failed run. The note repeats the run state; it adds no machine state of its own.
 */
export function CircuitCanvas({ state, compact = false }: { state: CometState; compact?: boolean }) {
  const { t } = useI18n();
  const noteKey = NOTE_BY_RUN_STATE[state.runState];

  return (
    <div className="persistent-circuit-canvas" data-run-state={state.runState} data-stale={state.runState === "Dirty" ? "true" : "false"}>
      <LiveDatapath state={state} compact={compact} />
      {noteKey ? (
        <p className="circuit-state-note" data-testid="circuit-state-note" data-run-state={state.runState}>
          {t(noteKey)}
        </p>
      ) : null}
    </div>
  );
}
