import type { CoreBackendInfo } from "../core/coreBridge";
import { CometState, formatWord } from "../core/types";
import { translateRunState } from "../i18n/locale";
import { useI18n } from "../i18n/useI18n";

function compactInstructionText(text?: string): string | undefined {
  return text?.replace(/\s+/g, " ").trim();
}

export default function StatusBar({ state, backendInfo }: { state: CometState; backendInfo: CoreBackendInfo }) {
  const { t } = useI18n();
  const currentInstruction = compactInstructionText(state.lastStep?.executedInstruction ?? state.currentInstruction) ?? t("instruction.noActive");
  const nextInstruction =
    state.lastStep && state.currentInstruction && compactInstructionText(state.currentInstruction) !== currentInstruction
      ? compactInstructionText(state.currentInstruction)
      : undefined;

  return (
    <footer className="status-bar">
      <span>{t("circuit.machine")}: <span data-testid="run-state" data-run-state={state.runState}>{translateRunState(t, state.runState)}</span></span>
      <span>{t("table.current")}: {currentInstruction}</span>
      <span>{t("instruction.nextPr")}: {formatWord(state.pr)}</span>
      <span>{t("instruction.nextInstruction")}: {nextInstruction ?? "-"}</span>
      <span data-testid="backend-label" title={backendInfo.label}>{backendInfo.label}</span>
      <span>{t("circuit.simulator")}</span>
    </footer>
  );
}
