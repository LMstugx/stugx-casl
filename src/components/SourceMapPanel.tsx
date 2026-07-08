import { CometState, formatWord } from "../core/types";

export default function SourceMapPanel({ state, embedded = false }: { state: CometState; embedded?: boolean }) {
  return (
    <section className={embedded ? "embedded-panel" : "panel"}>
      {!embedded ? (
        <header className="panel-header">
          <h2>Source Map</h2>
        </header>
      ) : null}
      <table className="data-table source-map-table">
        <thead>
          <tr>
            <th>Line</th>
            <th>Addr</th>
            <th>Machine</th>
          </tr>
        </thead>
        <tbody>
          {state.sourceMap.map((entry) => {
            const isCurrent = entry.line === state.currentLine;
            return (
            <tr
              key={`${entry.line}-${entry.address}`}
              className={isCurrent ? "current" : ""}
              data-testid={isCurrent ? "source-row-current" : undefined}
              data-instruction={entry.source}
            >
              <td>{entry.line}</td>
              <td className="hex">{formatWord(entry.address)}</td>
              <td className="hex">{entry.machineWords.map((word) => formatWord(word)).join(" ")}</td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
