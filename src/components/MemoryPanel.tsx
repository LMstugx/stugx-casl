import { CometState, formatWord } from "../core/types";
import { selectMemoryWindow } from "../core/selectors";

export default function MemoryPanel({ state, embedded = false }: { state: CometState; embedded?: boolean }) {
  return (
    <section className={embedded ? "embedded-panel" : "panel"}>
      {!embedded ? (
        <header className="panel-header">
          <h2>Memory</h2>
        </header>
      ) : null}
      <table className="data-table memory-table">
        <thead>
          <tr>
            <th>Addr</th>
            <th>Value</th>
            <th>Label</th>
          </tr>
        </thead>
        <tbody>
          {selectMemoryWindow(state).map((row) => (
              <tr key={row.address} className={`${row.changed ? "changed" : ""} ${row.current ? "current" : ""}`}>
                <td className="hex">{formatWord(row.address)}</td>
                <td className="hex">{formatWord(row.value)}</td>
                <td>{row.label ?? ""}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </section>
  );
}
