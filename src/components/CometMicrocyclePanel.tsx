import type { CometState } from "../core/types";
import type { MicrocyclePhase } from "../core/microcycle";
import { phasesForInstruction, TEACHING_MICROARCHITECTURE_NAME } from "../core/microcycle";
import { formatWord } from "../core/types";
import { microcyclePhaseKey } from "../i18n/microcycle";
import { useI18n } from "../i18n/useI18n";

const ALL_PHASES: readonly Exclude<MicrocyclePhase, "none">[] = [
  "fetch",
  "decode",
  "effective-address",
  "operand-read",
  "execute",
  "write-back",
  "flag-update",
  "complete"
];

export default function CometMicrocyclePanel({ state }: { state: CometState }) {
  const { t } = useI18n();
  const microcycle = state.microcycle;
  const instructionAddress = microcycle.instructionAddress ?? state.currentAddress ?? state.pr;
  const sourceRow = state.sourceMap.find((row) => row.address === instructionAddress);
  const programInstruction = state.program?.find((row) => row.address === instructionAddress);
  const instruction = microcycle.instructionKind ?? sourceRow?.instruction ?? state.currentInstruction ?? "";
  const phases = programInstruction ? phasesForInstruction(programInstruction) : ALL_PHASES;
  const source = sourceRow?.source ?? t("cometMode.noSource");
  const machineWords = sourceRow?.machineWords ?? [state.memory[instructionAddress] ?? 0];
  const recentMicrocycles = state.trace.filter((event) => event.kind === "microcycle").slice(0, 8);

  return (
    <section className="panel comet-microcycle-panel" data-testid="comet-microcycle-panel">
      <header className="panel-header comet-microcycle-header">
        <div>
          <h2>{t("cometMode.title")}</h2>
          <p>{t("cometMode.summary")}</p>
        </div>
        <span className="comet-microarchitecture-name">{TEACHING_MICROARCHITECTURE_NAME}</span>
      </header>

      <div className="comet-microcycle-status" aria-label={t("cometMode.currentPhase")}>
        <div>
          <span>{t("cometMode.currentPhase")}</span>
          <strong data-testid="comet-current-phase">{t(microcyclePhaseKey(microcycle.phase))}</strong>
        </div>
        <div>
          <span>{t("cometMode.currentMachineInstruction")}</span>
          <strong className="mono-value" data-testid="comet-current-instruction">
            {instruction} @{formatWord(instructionAddress)}
          </strong>
        </div>
        <div>
          <span>{t("cometMode.currentMicrostep")}</span>
          <strong className="mono-value" data-testid="comet-current-microstep">
            {microcycle.microIndex}/{microcycle.totalMicrosteps}
          </strong>
        </div>
        <div>
          <span>{t("cometMode.machineWords")}</span>
          <strong className="mono-value">{machineWords.map(formatWord).join(" ")}</strong>
        </div>
      </div>

      <div className="comet-microcycle-source">
        <span>{t("cometMode.currentSource")}</span>
        <code title={source}>{source}</code>
      </div>

      <ol className="comet-phase-track" aria-label={t("cometMode.phaseSequence")}>
        {phases.map((phase) => {
          const isCurrent = microcycle.phase === phase;
          const phaseIndex = phases.indexOf(phase);
          const currentPhaseIndex =
            microcycle.phase === "none" ? -1 : phases.indexOf(microcycle.phase as Exclude<MicrocyclePhase, "none">);
          const isComplete = currentPhaseIndex >= 0 && phaseIndex < currentPhaseIndex;
          return (
            <li
              key={phase}
              className={isCurrent ? "current" : isComplete ? "completed" : "pending"}
              aria-current={isCurrent ? "step" : undefined}
            >
              {t(microcyclePhaseKey(phase))}
            </li>
          );
        })}
      </ol>

      <div className="comet-microcycle-trace">
        <h3>{t("cometMode.microcycleTrace")}</h3>
        {recentMicrocycles.length === 0 ? (
          <p className="muted">{t("cometMode.noMicrocycles")}</p>
        ) : (
          <ol>
            {recentMicrocycles.map((event) => (
              <li key={event.eventId ?? `${event.index}-${event.microIndex}-${event.address}`}>
                <strong>{t(microcyclePhaseKey(event.microcyclePhase ?? "none"))}</strong>
                <span className="mono-value">
                  {event.instruction} {event.microIndex ?? 0}/{event.totalMicrosteps ?? 0}
                </span>
                <small>{event.detail}</small>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
