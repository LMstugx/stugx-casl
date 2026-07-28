import { useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { ReloadInitializationMode } from "../core/coreAdapter";
import { decodeCaslOutputRecord } from "../core/caslIoEncoding";
import { formatCaslWord, type CaslNumericDisplayMode } from "../core/caslNumericFormat";
import type { CometState, SourceMapEntry } from "../core/types";
import { formatWord, word } from "../core/types";
import { useI18n } from "../i18n/useI18n";
import { translateRunState } from "../i18n/locale";

type CaslCompatibilityModeProps = {
  state: CometState;
  sourceText: string;
  isSourceDirty: boolean;
  onReset: () => void;
  onReload: (mode: ReloadInitializationMode) => void;
  onSubmitConsoleInput: (text: string, endOfFile?: boolean) => void;
};

const numericModes: CaslNumericDisplayMode[] = ["hex", "signed", "unsigned", "binary"];
const MEMORY_WINDOW_ROWS = 32;

function numericModeLabel(mode: CaslNumericDisplayMode, t: ReturnType<typeof useI18n>["t"]): string {
  if (mode === "hex") return t("caslMode.hexadecimal");
  if (mode === "signed") return t("caslMode.signedDecimal");
  if (mode === "unsigned") return t("caslMode.unsignedDecimal");
  return t("caslMode.binary");
}

function labelForAddress(symbols: Record<string, number>, address: number): string {
  const ordered = Object.entries(symbols)
    .map(([label, value]) => ({ label, value: word(value) }))
    .sort((left, right) => left.value - right.value || left.label.localeCompare(right.label));
  const exact = ordered.find((entry) => entry.value === address);
  if (exact) return exact.label;
  const nearest = ordered.filter((entry) => entry.value < address).at(-1);
  if (!nearest) return "";
  const offset = address - nearest.value;
  return offset <= 0xff ? `${nearest.label}+${offset}` : "";
}

function characterForWord(value: number): string {
  const decoded = decodeCaslOutputRecord([value]);
  return decoded === "\ufffd" ? "" : decoded;
}

function sourceMapKind(entry: SourceMapEntry | undefined): "program" | "data" | "reserved" | "" {
  if (!entry?.instruction) return "";
  if (entry.instruction === "DC") return "data";
  if (entry.instruction === "DS") return "reserved";
  return "program";
}

function entryForAddress(sourceMap: readonly SourceMapEntry[], address: number): SourceMapEntry | undefined {
  return sourceMap.find((entry) => address >= entry.address && address < entry.address + entry.machineWords.length);
}

function assemblerOutput(state: CometState): string {
  const rows = state.sourceMap.flatMap((entry) =>
    entry.machineWords.map((machineWord, offset) => {
      const source = offset === 0 ? entry.source.replace(/\s+/g, " ").trim() : "";
      const label = offset === 0 ? entry.label ?? "" : "";
      const instruction = offset === 0 ? entry.instruction ?? "" : "";
      return `${String(entry.line).padStart(4, " ")} ${formatWord(entry.address + offset)} ${formatWord(machineWord)} ${label.padEnd(12, " ")} ${String(instruction).padEnd(5, " ")} ${source}`.trimEnd();
    })
  );
  const symbols = Object.entries(state.symbols)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([label, address]) => `${label.padEnd(16, " ")} ${formatWord(address)}`);
  const generatedLiteralLabels = new Set(
    state.sourceMap
      .filter((entry) => /^STL\d{5}$/i.test(entry.label ?? "") && entry.source.includes("="))
      .map((entry) => entry.label!)
  );
  const literals = Object.entries(state.symbols)
    .filter(([label]) => generatedLiteralLabels.has(label))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([label, address]) => `${label.padEnd(16, " ")} ${formatWord(address)} ${formatWord(state.memory[address] ?? 0)}`);
  const addresses = state.sourceMap.flatMap((entry) => entry.machineWords.map((_unused, offset) => word(entry.address + offset)));
  const totalWords = new Set(addresses).size;
  return [
    "stugx.CASL ASSEMBLER OUTPUT",
    `ENTRY ${formatWord(state.entryPoint ?? state.pr)}`,
    `TOTAL WORDS ${totalWords}`,
    "",
    "LINE ADDR WORD LABEL        OP    SOURCE",
    ...rows,
    "",
    "SYMBOL TABLE",
    ...(symbols.length ? symbols : ["(empty)"]),
    "",
    "LITERAL TABLE",
    ...(literals.length ? literals : ["(empty)"])
  ].join("\n");
}

export default function CaslCompatibilityMode({
  state,
  sourceText,
  isSourceDirty,
  onReset,
  onReload,
  onSubmitConsoleInput
}: CaslCompatibilityModeProps) {
  const { t } = useI18n();
  const [numericMode, setNumericMode] = useState<CaslNumericDisplayMode>("hex");
  const [memoryStart, setMemoryStart] = useState(0x20);
  const [memoryAddressText, setMemoryAddressText] = useState("0020");
  const [consoleInput, setConsoleInput] = useState("");
  const [consoleClearOffset, setConsoleClearOffset] = useState(0);
  const assemblerTextRef = useRef<HTMLTextAreaElement>(null);
  const outputLines = state.consoleOutput.slice(consoleClearOffset);
  const reloadDisabled = isSourceDirty || !state.assembled || state.runState === "Running";
  const sourceLines = sourceText.split(/\r?\n/);
  const currentLine = state.currentLine ?? state.lastStep?.executedLine;
  const assemblerText = useMemo(() => assemblerOutput(state), [state]);
  const stackRows = Array.from({ length: 8 }, (_unused, offset) => word(state.sp + offset));
  const memoryRows = Array.from({ length: MEMORY_WINDOW_ROWS }, (_unused, offset) => word(memoryStart + offset));

  const goToAddress = (address: number) => {
    const normalized = word(address);
    setMemoryStart(normalized);
    setMemoryAddressText(formatWord(normalized));
  };
  const submitInput = (event: FormEvent) => {
    event.preventDefault();
    if (state.runState !== "WaitingInput") return;
    onSubmitConsoleInput(consoleInput);
    setConsoleInput("");
  };

  return (
    <main className="casl-mode-workspace" data-testid="casl-compatibility-mode">
      <header className="casl-mode-heading">
        <div>
          <h2>{t("caslMode.title")}</h2>
          <p>{t("caslMode.summary")}</p>
        </div>
        <span className={`run-pill ${state.runState.toLowerCase()}`} aria-live="polite">
          {translateRunState(t, state.runState)}
        </span>
      </header>

      <section className="casl-mode-controls" aria-label={t("caslMode.numericFormat")}>
        <div className="segmented casl-number-format" role="group" aria-label={t("caslMode.numericFormat")}>
          {numericModes.map((mode) => (
            <button
              key={mode}
              type="button"
              data-testid={`casl-numeric-${mode}`}
              className={numericMode === mode ? "selected" : ""}
              aria-pressed={numericMode === mode}
              onClick={() => setNumericMode(mode)}
            >
              {numericModeLabel(mode, t)}
            </button>
          ))}
        </div>
        <div className="casl-reload-actions" aria-label={t("caslMode.reload")}>
          <button type="button" className="text-button" disabled={reloadDisabled} onClick={onReset}>{t("toolbar.reset")}</button>
          <button type="button" className="text-button" disabled={reloadDisabled} onClick={() => onReload("assembled")}>{t("caslMode.reloadAssembled")}</button>
          <button type="button" className="text-button" disabled={reloadDisabled} onClick={() => onReload("zero")}>{t("caslMode.reloadZero")}</button>
          <button type="button" className="text-button" disabled={reloadDisabled} onClick={() => onReload("ffff")}>{t("caslMode.reloadFfff")}</button>
        </div>
      </section>

      {isSourceDirty ? <p className="casl-mode-warning">{t("caslMode.reloadDirtyWarning")}</p> : null}

      <div className="casl-mode-grid">
        <section className="panel casl-source-observer">
          <header className="panel-header">
            <h3>{t("panel.source")}</h3>
            <span>{t("instruction.currentPr")} {formatWord(state.pr)}</span>
          </header>
          <div className="casl-source-lines scroll-safe" role="list" aria-label={t("panel.source")}>
            {sourceLines.map((line, index) => (
              <div key={index} role="listitem" className="casl-source-line" data-current={currentLine === index + 1 ? "true" : "false"}>
                <span>{String(index + 1).padStart(3, " ")}</span>
                <code>{line || " "}</code>
              </div>
            ))}
          </div>
          <div className="casl-current-instruction">
            <strong>{t("caslMode.currentInstruction")}</strong>
            <code>{state.currentInstruction ?? state.lastStep?.executedInstruction ?? "-"}</code>
          </div>
        </section>

        <section className="panel casl-register-observer">
          <header className="panel-header"><h3>{t("inspector.registers")}</h3><span>16-bit</span></header>
          <div className="casl-register-grid" data-format={numericMode} role="table" aria-label={t("inspector.registers")}>
            {state.gr.map((value, index) => (
              <div key={`GR${index}`} role="row" className="casl-register-cell" data-testid={`casl-register-gr${index}`} data-changed={state.changedRegisters.includes(`GR${index}`) ? "true" : "false"}>
                <strong role="rowheader">GR{index}</strong>
                <code role="cell">{formatCaslWord(value, numericMode)}</code>
              </div>
            ))}
            {[
              ["PR", state.pr],
              ["SP", state.sp],
              ["MAR", state.mar],
              ["MDR", state.mdr]
            ].map(([name, value]) => (
              <div key={name} role="row" className="casl-register-cell" data-changed={state.changedRegisters.includes(String(name)) ? "true" : "false"}>
                <strong role="rowheader">{name}</strong>
                <code role="cell">{formatCaslWord(Number(value), numericMode)}</code>
              </div>
            ))}
          </div>
          <dl className="casl-fr-grid" aria-label="FR">
            <div><dt>OF</dt><dd>{state.fr.o ? "1" : "0"}</dd></div>
            <div><dt>SF</dt><dd>{state.fr.n ? "1" : "0"}</dd></div>
            <div><dt>ZF</dt><dd>{state.fr.z ? "1" : "0"}</dd></div>
          </dl>
        </section>

        <section className="panel casl-memory-observer">
          <header className="panel-header"><h3>{t("inspector.memory")}</h3><span>{formatWord(memoryStart)}-{formatWord(memoryStart + MEMORY_WINDOW_ROWS - 1)}</span></header>
          <form
            className="casl-memory-controls"
            onSubmit={(event) => {
              event.preventDefault();
              const normalized = memoryAddressText.trim().replace(/^#/, "");
              if (/^[0-9a-f]{1,4}$/i.test(normalized)) goToAddress(Number.parseInt(normalized, 16));
            }}
          >
            <label>
              {t("table.address")}
              <input value={memoryAddressText} maxLength={5} onChange={(event) => setMemoryAddressText(event.target.value)} />
            </label>
            <button type="submit" className="text-button">{t("common.go")}</button>
            <button type="button" className="text-button" onClick={() => goToAddress(state.lastEffectiveAddress ?? state.lastMemoryWriteAddress ?? state.lastMemoryReadAddress ?? state.pr)}>
              {t("table.current")}
            </button>
          </form>
          <div className="casl-memory-scroll scroll-safe">
            <table className="casl-memory-table">
              <thead><tr><th>{t("table.address")}</th><th>{t("table.value")}</th><th>{t("table.label")}</th><th>{t("caslMode.character")}</th><th>{t("caslMode.kind")}</th></tr></thead>
              <tbody>
                {memoryRows.map((address) => {
                  const value = state.memory[address] ?? 0;
                  const entry = entryForAddress(state.sourceMap, address);
                  const kind = sourceMapKind(entry);
                  const kindLabel = kind === "program"
                    ? t("caslMode.kind.program")
                    : kind === "data"
                      ? t("caslMode.kind.data")
                      : kind === "reserved"
                        ? t("caslMode.kind.reserved")
                        : "-";
                  return (
                    <tr
                      key={address}
                      data-testid={`casl-memory-row-${formatWord(address)}`}
                      data-current={address === state.pr || address === state.currentAddress ? "true" : "false"}
                      data-read={address === state.lastMemoryReadAddress ? "true" : "false"}
                      data-write={address === state.lastMemoryWriteAddress ? "true" : "false"}
                    >
                      <td><code>{formatWord(address)}</code></td>
                      <td><code>{formatCaslWord(value, numericMode)}</code></td>
                      <td title={labelForAddress(state.symbols, address)}>{labelForAddress(state.symbols, address) || "-"}</td>
                      <td>{characterForWord(value) || "-"}</td>
                      <td>{kindLabel}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel casl-stack-observer">
          <header className="panel-header"><h3>{t("caslMode.stack")}</h3><span>SP {formatWord(state.sp)}</span></header>
          <div className="casl-stack-list scroll-safe">
            {stackRows.map((address, index) => (
              <div key={address} className="casl-stack-row" data-top={index === 0 ? "true" : "false"}>
                <span>{index === 0 ? "SP" : `SP+${index}`}</span>
                <code>{formatWord(address)}</code>
                <code>{formatCaslWord(state.memory[address] ?? 0, numericMode)}</code>
                <span>{labelForAddress(state.symbols, state.memory[address] ?? 0) || ""}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel casl-console-observer">
          <header className="panel-header">
            <h3>{t("tabs.console")}</h3>
            <button type="button" className="text-button" onClick={() => setConsoleClearOffset(state.consoleOutput.length)}>{t("common.clear")}</button>
          </header>
          <div className="casl-console-output scroll-safe" role="log" aria-live="polite" aria-label={t("caslMode.consoleOutput")}>
            {outputLines.length ? outputLines.map((line, index) => <div key={`${index}-${line}`}><span>&gt;</span><pre>{line}</pre></div>) : <p>{t("caslMode.consoleEmpty")}</p>}
          </div>
          <form className="casl-console-input" onSubmit={submitInput}>
            <label>
              {t("caslMode.consoleInput")}
              <input
                data-testid="casl-console-input"
                value={consoleInput}
                maxLength={256}
                disabled={state.runState !== "WaitingInput"}
                onChange={(event) => setConsoleInput(event.target.value)}
                aria-describedby="casl-console-wait-state"
              />
            </label>
            <button type="submit" data-testid="casl-console-submit" className="text-button" disabled={state.runState !== "WaitingInput"}>{t("caslMode.submitInput")}</button>
            <button type="button" data-testid="casl-console-eof" className="text-button" disabled={state.runState !== "WaitingInput"} onClick={() => onSubmitConsoleInput("", true)}>{t("caslMode.submitEof")}</button>
          </form>
          <p id="casl-console-wait-state" className="casl-console-state" role="status">
            {state.runState === "WaitingInput" ? t("caslMode.waitingInput") : t("caslMode.consoleReady")}
          </p>
        </section>

        <section className="panel casl-assembler-output">
          <header className="panel-header">
            <h3>{t("caslMode.assemblerOutput")}</h3>
            <button
              type="button"
              className="text-button"
              onClick={() => {
                assemblerTextRef.current?.select();
                void navigator.clipboard?.writeText(assemblerText).catch(() => undefined);
              }}
            >
              {t("caslMode.copy")}
            </button>
          </header>
          <textarea data-testid="casl-assembler-output" ref={assemblerTextRef} readOnly value={assemblerText} aria-label={t("caslMode.assemblerOutput")} />
        </section>
      </div>
      <p className="casl-mode-footnote">{t("caslMode.dsInitializationNote")}</p>
    </main>
  );
}
