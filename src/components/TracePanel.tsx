import { CometState, formatWord } from "../core/types";

function traceChanges(event: CometState["trace"][number]): string {
  const changes: string[] = [];
  if (event.changedRegister) {
    const before = event.changedRegisterValueBefore === undefined ? "----" : formatWord(event.changedRegisterValueBefore);
    const after = event.changedRegisterValueAfter === undefined ? "----" : formatWord(event.changedRegisterValueAfter);
    changes.push(`${event.changedRegister}: ${before} -> ${after}`);
  }
  if (event.changedMemoryAddress !== undefined) {
    const before = event.changedMemoryValueBefore === undefined ? "----" : formatWord(event.changedMemoryValueBefore);
    const after = event.changedMemoryValueAfter === undefined ? "----" : formatWord(event.changedMemoryValueAfter);
    changes.push(`MEM[${formatWord(event.changedMemoryAddress)}]: ${before} -> ${after}`);
  }
  return changes.length ? changes.join(" | ") : "No data write";
}

function traceControlFlow(event: CometState["trace"][number], state: CometState): string {
  if (!/^J(UMP|ZE|NZ|PL|MI|OV)$/.test(event.instruction)) return "";
  const row = state.sourceMap.find((entry) => entry.address === event.address);
  const source = row?.source ?? event.source ?? "";
  const targetLabel = jumpTargetFromSource(source);
  const targetAddress = row?.machineWords[1];
  const labelText = targetLabel ? `${targetLabel}${targetAddress !== undefined ? ` / ${formatWord(targetAddress)}` : ""}` : targetAddress !== undefined ? formatWord(targetAddress) : "";
  if (!labelText) return "";
  if (/FOR_CONTINUE_/i.test(targetLabel ?? "")) return `continue -> ${labelText}`;
  if (/(FOR_END_|LOOP_END_)/i.test(targetLabel ?? "")) return `break / loop exit -> ${labelText}`;
  if (/(FOR_BEGIN_|LOOP_BEGIN_)/i.test(targetLabel ?? "")) return `loop back -> ${labelText}`;
  if (event.instruction !== "JUMP") return `${event.instruction} target -> ${labelText}`;
  return `jump -> ${labelText}`;
}

function jumpTargetFromSource(source: string): string | undefined {
  const parts = source.trim().split(/\s+/);
  const jumpIndex = parts.findIndex((part) => /^J(UMP|ZE|NZ|PL|MI|OV)$/i.test(part));
  if (jumpIndex < 0) return undefined;
  return parts[jumpIndex + 1]?.split(",")[0];
}

export default function TracePanel({ state, embedded = false }: { state: CometState; embedded?: boolean }) {
  return (
    <section className={embedded ? "embedded-panel trace-panel" : "panel trace-panel"}>
      {!embedded ? (
        <header className="panel-header">
          <h2>Trace</h2>
        </header>
      ) : null}
      <div className="trace-list" data-testid="trace-list">
        {state.trace.length === 0 ? <p className="muted">No steps yet.</p> : null}
        {state.trace.map((event, index) => (
          <article key={`${event.index}-${event.address}`} className="trace-item" data-testid="trace-item" data-latest={index === 0 ? "true" : "false"}>
            <strong>Step {event.index}</strong>
            <div>
              <div className="trace-row">
                <span>PR {formatWord(event.pr ?? event.address)}</span>
                <span>{event.instruction} at {formatWord(event.address)}</span>
                <span>{event.visualPath ?? "None"}</span>
              </div>
              <p>{event.source ?? event.detail}</p>
              {traceControlFlow(event, state) ? <p className="trace-flow" data-testid="trace-control-flow">{traceControlFlow(event, state)}</p> : null}
              <p className="trace-changes">Changes: {traceChanges(event)}{event.runState ? ` | ${event.runState}` : ""}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
