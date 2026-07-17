import { KeyboardEvent, useEffect, useMemo, useState } from "react";
import { MEMORY_VIEW_DEFAULT_ROWS, selectMemoryViewerRows, selectProgramStartAddress } from "../core/selectors";
import { CometState, formatWord } from "../core/types";
import { useI18n } from "../i18n/useI18n";
import type { CppStorageObject } from "../transpiler/cppAst";
import { findStorageObjectForAddress, resolveCppStorageObjects } from "../transpiler/cppStorageObjects";
import DoubleValueInspector from "./DoubleValueInspector";

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

export default function MemoryPanel({
  state,
  embedded = false,
  storageObjects = []
}: {
  state: CometState;
  embedded?: boolean;
  storageObjects?: readonly CppStorageObject[];
}) {
  const { t } = useI18n();
  const programStart = selectProgramStartAddress(state);
  const [startAddress, setStartAddress] = useState(programStart);
  const [draftStart, setDraftStart] = useState(formatWord(programStart));
  const [rowCount, setRowCount] = useState<number>(MEMORY_VIEW_DEFAULT_ROWS);
  const resolvedDoubleObjects = useMemo(
    () => resolveCppStorageObjects(storageObjects, state).filter((object) => object.type === "double"),
    [state.symbols, storageObjects]
  );
  const [selectedObjectId, setSelectedObjectId] = useState<string | undefined>(() => resolvedDoubleObjects[0]?.objectId);
  const selectedObject = resolvedDoubleObjects.find((object) => object.objectId === selectedObjectId) ?? resolvedDoubleObjects[0];

  useEffect(() => {
    setStartAddress(programStart);
    setDraftStart(formatWord(programStart));
  }, [programStart, state.assembled]);

  useEffect(() => {
    if (selectedObjectId && resolvedDoubleObjects.some((object) => object.objectId === selectedObjectId)) return;
    setSelectedObjectId(resolvedDoubleObjects[0]?.objectId);
  }, [resolvedDoubleObjects, selectedObjectId]);

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

  const selectObject = (objectId: string) => {
    const object = resolvedDoubleObjects.find((candidate) => candidate.objectId === objectId);
    setSelectedObjectId(objectId);
    jumpTo(object?.baseAddress);
  };

  return (
    <section className={embedded ? "embedded-panel memory-viewer" : "panel memory-viewer"}>
      {!embedded ? (
        <header className="panel-header">
          <h2>{t("inspector.memory")}</h2>
        </header>
      ) : null}

      <div className="memory-controls" aria-label={t("accessibility.memoryRangeControls")}>
        <label>
          {t("memory.start")}
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
          {t("memory.rows")}
          <select data-testid="memory-row-count" value={rowCount} onChange={(event) => setRowCount(Number(event.target.value))}>
            {ROW_COUNT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <button className="text-button memory-go" data-testid="memory-go-button" type="button" onClick={applyDraftStart}>
          {t("common.go")}
        </button>
        {resolvedDoubleObjects.length ? (
          <label>
            {t("doubleInspector.object")}
            <select
              className="memory-object-select"
              data-testid="memory-object-select"
              value={selectedObject?.objectId ?? ""}
              aria-label={t("doubleInspector.object")}
              onChange={(event) => selectObject(event.target.value)}
            >
              {resolvedDoubleObjects.map((object) => (
                <option key={object.objectId} value={object.objectId}>{object.symbolName}</option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <div className="memory-jumps" aria-label={t("accessibility.memoryJumpControls")}>
        <button className="text-button" data-testid="memory-jump-start" type="button" onClick={() => jumpTo(programStart)}>
          {t("memory.program")}
        </button>
        <button className="text-button" data-testid="memory-jump-pr" type="button" onClick={() => jumpTo(state.pr)}>
          PR
        </button>
        <button className="text-button" data-testid="memory-jump-mar" type="button" onClick={() => jumpTo(state.mar)}>
          MAR
        </button>
        <button className="text-button" data-testid="memory-jump-read" type="button" disabled={state.lastMemoryReadAddress === undefined} onClick={() => jumpTo(state.lastMemoryReadAddress)}>
          {t("common.read")}
        </button>
        <button className="text-button" data-testid="memory-jump-write" type="button" disabled={state.lastMemoryWriteAddress === undefined} onClick={() => jumpTo(state.lastMemoryWriteAddress)}>
          {t("common.write")}
        </button>
      </div>

      <div className="memory-table-scroll">
        <table className="data-table memory-table">
          <thead>
            <tr>
              <th>{t("table.address")}</th>
              <th>{t("table.value")}</th>
              <th>{t("table.label")}</th>
              <th>{t("table.mark")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const storageRelation = findStorageObjectForAddress(resolvedDoubleObjects, row.address);
              const markers = [
                row.isPr ? "PR" : "",
                row.isMar ? "MAR" : "",
                row.isLastRead ? t("common.read") : "",
                row.isLastWrite ? t("common.write") : ""
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
                  data-double-object={storageRelation?.object.objectId}
                  data-double-word={storageRelation?.word.index}
                  data-object-selected={storageRelation && storageRelation.object.objectId === selectedObject?.objectId ? "true" : "false"}
                >
                  <td className="hex mono-value">{formatWord(row.address)}</td>
                  <td className="hex mono-value">{formatWord(row.value)}</td>
                  <td className={storageRelation ? "memory-label-cell" : "text-ellipsis nowrap-symbol"} title={storageRelation ? `${storageRelation.object.symbolName}.word${storageRelation.word.index} ${storageRelation.word.bitRange}` : row.label ?? ""}>
                    {storageRelation ? (
                      <button
                        type="button"
                        className="memory-object-word"
                        aria-label={`${storageRelation.object.symbolName}.word${storageRelation.word.index}, ${storageRelation.word.bitRange}`}
                        onClick={() => setSelectedObjectId(storageRelation.object.objectId)}
                      >
                        <span>{storageRelation.object.symbolName}.word{storageRelation.word.index}</span>
                        <small>{storageRelation.word.bitRange}</small>
                      </button>
                    ) : row.label ?? ""}
                  </td>
                  <td className="text-ellipsis" title={markers.join(" ")}>{markers.join(" ")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {selectedObject ? <DoubleValueInspector object={selectedObject} state={state} /> : null}
    </section>
  );
}
