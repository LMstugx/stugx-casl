export interface PhasePill {
  id: string;
  text: string;
}

export interface PhasePillsLabels {
  list: string;
  position: (index: number, total: number) => string;
  done: string;
}

export interface PhasePillsProps {
  /** The phase plan of the current instruction, in order. It comes from the runtime, never from a table in the UI. */
  phases: readonly PhasePill[];
  /** Zero-based index of the current phase, or -1 when no instruction is in progress. */
  currentIndex: number;
  labels: PhasePillsLabels;
}

/**
 * One pill per phase of the current instruction. A finished phase carries a check mark and
 * the word for "done"; the current phase carries its position. State is never colour only.
 */
export function PhasePills({ phases, currentIndex, labels }: PhasePillsProps) {
  return (
    <ol className="wb-phases" aria-label={labels.list}>
      {phases.map((phase, index) => {
        const state = index < currentIndex ? "done" : index === currentIndex ? "current" : "pending";
        return (
          <li
            key={phase.id}
            className="wb-phase"
            data-phase={phase.id}
            data-state={state}
            aria-current={state === "current" ? "step" : undefined}
            title={state === "current" ? labels.position(index + 1, phases.length) : undefined}
          >
            {state === "done" ? (
              <svg className="wb-phase-check" aria-hidden="true" width="10" height="10" viewBox="0 0 12 12">
                <path d="M2 6l3 3 5-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : null}
            <span>{phase.text}</span>
            {state === "done" ? <span className="wb-visually-hidden">{labels.done}</span> : null}
            {state === "current" ? <span className="wb-phase-position">{`${index + 1}/${phases.length}`}</span> : null}
          </li>
        );
      })}
    </ol>
  );
}
