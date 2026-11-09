import { CircleDot, StepForward, Trash2 } from "lucide-react";
import { useId } from "react";
import { useI18n } from "../../i18n/useI18n";

export interface ControlBarProps {
  granularity: "instruction" | "microcycle";
  canStep: boolean;
  onStep: () => void;
  /** Number of breakpoints set on lines of the current document that hold an instruction. */
  breakpointCount: number;
  canRunToBreakpoint: boolean;
  onRunToBreakpoint: () => void;
  onClearBreakpoints: () => void;
  /** Set while execution is stopped in front of a breakpoint. */
  stoppedAt?: { line: number; address: string };
  historyRetained: number;
  historyCapacity: number;
}

/**
 * Control bar at the bottom of the workbench: step forward in the current granularity, run to
 * the next breakpoint, and the session facts that go with them. Breakpoints are page-session
 * state owned by the caller; nothing here is stored.
 */
export function ControlBar({
  granularity,
  canStep,
  onStep,
  breakpointCount,
  canRunToBreakpoint,
  onRunToBreakpoint,
  onClearBreakpoints,
  stoppedAt,
  historyRetained,
  historyCapacity
}: ControlBarProps) {
  const { t } = useI18n();
  const reasonId = useId();
  const stepLabel = t(granularity === "microcycle" ? "workbench.control.nextMicrocycle" : "workbench.control.nextInstruction");
  const spaceKey = t("workbench.shortcut.spaceKey");

  return (
    <div className="wb-control-bar" data-testid="control-bar" data-granularity={granularity}>
      <button
        type="button"
        className="text-button wb-control-step"
        data-testid="control-step-button"
        disabled={!canStep}
        title={`${stepLabel} (${spaceKey})`}
        onClick={onStep}
      >
        <StepForward aria-hidden="true" size={16} />
        <span>{stepLabel}</span>
        <kbd aria-hidden="true">{spaceKey}</kbd>
      </button>
      <button
        type="button"
        className="text-button"
        data-testid="run-to-breakpoint-button"
        disabled={!canRunToBreakpoint}
        aria-describedby={breakpointCount === 0 ? reasonId : undefined}
        onClick={onRunToBreakpoint}
      >
        <CircleDot aria-hidden="true" size={16} />
        <span>{t("workbench.control.runToBreakpoint")}</span>
      </button>
      <span className="wb-control-fact" data-testid="breakpoint-count" data-count={breakpointCount}>
        {t("workbench.control.breakpointCount", { count: breakpointCount })}
      </span>
      {breakpointCount > 0 ? (
        <button
          type="button"
          className="icon-only"
          data-testid="clear-breakpoints-button"
          aria-label={t("workbench.control.clearBreakpoints")}
          title={t("workbench.control.clearBreakpoints")}
          onClick={onClearBreakpoints}
        >
          <Trash2 aria-hidden="true" size={15} />
        </button>
      ) : (
        <span id={reasonId} className="wb-control-hint">{t("workbench.control.noBreakpoints")}</span>
      )}
      <span className="wb-control-fact" data-testid="history-count">
        {t("workbench.control.history", { count: historyRetained, capacity: historyCapacity })}
      </span>
      <span className="wb-control-notice" role="status" aria-live="polite" data-testid="breakpoint-notice">
        {stoppedAt ? t("workbench.control.stoppedAtBreakpoint", stoppedAt) : ""}
      </span>
    </div>
  );
}
