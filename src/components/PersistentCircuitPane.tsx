import type { ReactNode } from "react";
import type { CometState } from "../core/types";
import { translateRunState } from "../i18n/locale";
import { useI18n } from "../i18n/useI18n";
import CometCircuitSvg from "../visual/CometCircuitSvg";

type PersistentCircuitPaneProps = {
  state: CometState;
  subtitle: string;
  sourceMapFocus?: {
    line?: number;
    address?: number;
    instruction?: string;
  };
  compact?: boolean;
  status?: ReactNode;
};

export default function PersistentCircuitPane({
  state,
  subtitle,
  sourceMapFocus,
  compact = false,
  status
}: PersistentCircuitPaneProps) {
  const { t } = useI18n();

  return (
    <section
      className="panel focus-circuit-panel persistent-circuit-pane"
      data-testid="focus-circuit-panel"
      data-compact={compact ? "true" : "false"}
      aria-label={t("workspace.circuit")}
    >
      <header className="panel-header">
        <div>
          <h2 title={t("circuit.focusMode")}>{t("circuit.focusMode")}</h2>
          <span>{subtitle}</span>
        </div>
        {status ?? (
          <span className={`run-pill ${state.runState.toLowerCase()}`}>
            {t("circuit.machine")}: {translateRunState(t, state.runState)}
          </span>
        )}
      </header>
      <CometCircuitSvg state={state} sourceMapFocus={sourceMapFocus} />
    </section>
  );
}
