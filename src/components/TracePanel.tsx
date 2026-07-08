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
              <p>{event.detail}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
