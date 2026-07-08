import { KeyboardEvent, useEffect, useMemo, useState } from "react";
import { MEMORY_VIEW_DEFAULT_ROWS, selectMemoryViewerRows, selectProgramStartAddress } from "../core/selectors";
import { CometState, formatWord } from "../core/types";

const ROW_COUNT_OPTIONS = [32, 64, 128, 256] as const;

function parseAddress(value: string): number | null {
  const trimmed = value.trim().replace(/^0x/i, "");
  if (!/^[0-9a-fA-F]{1,4}$/.test(trimmed)) return null;
  return Number.parseInt(trimmed, 16);
}

function memoryRowClass(row: ReturnType<typeof selectMemoryViewerRows>[number]): string {
  return [
    row.changed ? "changed" : "",
    row.current ? "current" : "",
    row.isPr ? "memory-pr" : "",
    row.isMar ? "memory-mar" : "",
    row.isLastRead ? "memory-read" : "",
    row.isLastWrite ? "memory-write" : ""
  ]
    .filter(Boolean)
    .join(" ");
}

export default function MemoryPanel({ state, embedded = false }: { state: CometState; embedded?: boolean }) {
  const programStart = selectProgramStartAddress(state);
  const [startAddress, setStartAddress] = useState(programStart);
  const [draftStart, setDraftStart] = useState(formatWord(programStart));
  const [rowCount, setRowCount] = useState<number>(MEMORY_VIEW_DEFAULT_ROWS);

  useEffect(() => {
    setStartAddress(programStart);
    setDraftStart(formatWord(programStart));
  }, [programStart, state.assembled]);

  const rows = useMemo(() => selectMemoryViewerRows(state, startAddress, rowCount), [rowCount, startAddress, state]);

  const applyDraftStart = () => {
    const parsed = parseAddress(draftStart);
    if (parsed === null) {
      setDraftStart(formatWord(startAddress));
      return;
    }
    setStartAddress(parsed);
    setDraftStart(formatWord(parsed));
  };

  const handleStartKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") applyDraftStart();
  };

  const jumpTo = (address: number | undefined) => {
    if (address === undefined) return;
    setStartAddress(address);
    setDraftStart(formatWord(address));
  };

  return (
    <section className={embedded ? "embedded-panel memory-viewer" : "panel memory-viewer"}>
      {!embedded ? (
        <header className="panel-header">
          <h2>Memory</h2>
        </header>
      ) : null}

      <div className="memory-controls" aria-label="Memory range controls">
        <label>
          Start
          <input
            data-testid="memory-start-input"
            value={draftStart}
            onChange={(event) => setDraftStart(event.target.value.toUpperCase())}
            onBlur={applyDraftStart}
            onKeyDown={handleStartKeyDown}
            maxLength={4}
            spellCheck={false}
          />
        </label>
        <label>
          Rows
          <select data-testid="memory-row-count" value={rowCount} onChange={(event) => setRowCount(Number(event.target.value))}>
            {ROW_COUNT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <button className="text-button memory-go" data-testid="memory-go-button" type="button" onClick={applyDraftStart}>
          Go
        </button>
      </div>

      <div className="memory-jumps" aria-label="Memory jump controls">
        <button className="text-button" data-testid="memory-jump-start" type="button" onClick={() => jumpTo(programStart)}>
          Program
        </button>
        <button className="text-button" data-testid="memory-jump-pr" type="button" onClick={() => jumpTo(state.pr)}>
          PR
        </button>
        <button className="text-button" data-testid="memory-jump-mar" type="button" onClick={() => jumpTo(state.mar)}>
          MAR
        </button>
        <button className="text-button" data-testid="memory-jump-read" type="button" disabled={state.lastMemoryReadAddress === undefined} onClick={() => jumpTo(state.lastMemoryReadAddress)}>
          Read
        </button>
        <button className="text-button" data-testid="memory-jump-write" type="button" disabled={state.lastMemoryWriteAddress === undefined} onClick={() => jumpTo(state.lastMemoryWriteAddress)}>
          Write
        </button>
      </div>

      <div className="memory-table-scroll">
        <table className="data-table memory-table">
          <thead>
            <tr>
              <th>Addr</th>
              <th>Value</th>
              <th>Label</th>
              <th>Mark</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const markers = [
                row.isPr ? "PR" : "",
                row.isMar ? "MAR" : "",
                row.isLastRead ? "READ" : "",
                row.isLastWrite ? "WRITE" : ""
              ].filter(Boolean);
              return (
                <tr
                  key={row.address}
                  className={memoryRowClass(row)}
                  data-testid={`memory-view-row-${formatWord(row.address)}`}
                  data-pr={row.isPr ? "true" : "false"}
                  data-mar={row.isMar ? "true" : "false"}
                  data-read={row.isLastRead ? "true" : "false"}
                  data-write={row.isLastWrite ? "true" : "false"}
                >
                  <td className="hex">{formatWord(row.address)}</td>
                  <td className="hex">{formatWord(row.value)}</td>
                  <td>{row.label ?? ""}</td>
                  <td>{markers.join(" ")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
