import { CometState, formatWord } from "../core/types";

export default function TracePanel({ state, embedded = false }: { state: CometState; embedded?: boolean }) {
  return (
    <section className={embedded ? "embedded-panel trace-panel" : "panel trace-panel"}>
      {!embedded ? (
        <header className="panel-header">
          <h2>Trace</h2>
        </header>
      ) : null}
      <div className="trace-list">
        {state.trace.length === 0 ? <p className="muted">No steps yet.</p> : null}
        {state.trace.map((event) => (
          <article key={`${event.index}-${event.address}`} className="trace-item">
            <strong>{event.index.toString().padStart(2, "0")}</strong>
            <div>
              <span>
                {event.instruction} at {formatWord(event.address)}
              </span>
              <p>{event.source ?? event.detail}</p>
              <p>
                PR {formatWord(event.pr ?? event.address)}
                {event.visualPath ? ` | ${event.visualPath}` : ""}
                {event.changedRegister ? ` | ${event.changedRegister}` : ""}
                {event.changedMemoryAddress !== undefined ? ` | Memory ${formatWord(event.changedMemoryAddress)}` : ""}
                {event.runState ? ` | ${event.runState}` : ""}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
