import { CometState, formatWord } from "../core/types";
import { useI18n } from "../i18n/useI18n";
import type { CppStorageObject, CppToCaslMap } from "../transpiler/cppAst";
import { doubleOperationForCaslLine, resolveCppStorageObjects } from "../transpiler/cppStorageObjects";

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

function traceMainEvent(event: CometState["trace"][number]): string {
  if (event.instruction === "RET" && event.visualPath === "RET_StackToPr") return `#${event.index} RET stack return`;
  if (event.instruction === "RET") return `#${event.index} RET finish`;
  return `#${event.index} ${event.source ?? event.instruction} PR ${formatWord(event.pr ?? event.address)}`;
}

function tracePrimaryEffect(event: CometState["trace"][number]): string {
  if (event.instruction === "CALL") {
    const target = event.effectiveAddress !== undefined ? formatWord(event.effectiveAddress) : "----";
    const returnAddress = event.returnAddress !== undefined ? formatWord(event.returnAddress) : "----";
    return `target ${target}; return ${returnAddress}`;
  }
  if (event.instruction === "RET" && event.visualPath === "RET_StackToPr") {
    const stackAddress = event.stackAddress ?? event.changedMemoryAddress;
    const returnAddress = event.returnAddress ?? event.pr;
    return `PR <- MEM[${stackAddress !== undefined ? formatWord(stackAddress) : "SP"}] ${returnAddress !== undefined ? formatWord(returnAddress) : "----"}`;
  }
  if (event.instruction === "RET") return "program finished";
  return traceChanges(event);
}

function traceSecondaryNote(event: CometState["trace"][number], state: CometState): string {
  const notes: string[] = [];
  const flow = traceControlFlow(event, state);
  if (flow) notes.push(flow);
  if (event.stackPointerValueBefore !== undefined && event.stackPointerValueAfter !== undefined) {
    notes.push(`SP: ${formatWord(event.stackPointerValueBefore)} -> ${formatWord(event.stackPointerValueAfter)}`);
  }
  if (event.callDepthBefore !== undefined && event.callDepthAfter !== undefined) {
    notes.push(`callDepth: ${event.callDepthBefore} -> ${event.callDepthAfter}`);
  }
  if (event.runState) notes.push(`State: ${event.runState}`);
  return notes.join(" | ") || event.detail || event.visualPath || "No secondary effect";
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

export default function TracePanel({
  state,
  embedded = false,
  storageObjects = [],
  cppToCaslMapping = []
}: {
  state: CometState;
  embedded?: boolean;
  storageObjects?: readonly CppStorageObject[];
  cppToCaslMapping?: readonly CppToCaslMap[];
}) {
  const { t } = useI18n();
  const resolvedObjects = resolveCppStorageObjects(storageObjects, state);
  return (
    <section className={embedded ? "embedded-panel trace-panel" : "panel trace-panel"}>
      {!embedded ? (
        <header className="panel-header">
          <h2>{t("inspector.trace")}</h2>
        </header>
      ) : null}
      <div className="trace-list" data-testid="trace-list">
        {state.trace.length === 0 ? <p className="muted">{t("empty.noTraceEntries")}</p> : null}
        {state.trace.map((event, index) => {
          const caslLine = state.sourceMap.find((entry) => entry.address === event.address)?.line;
          const doubleOperation = doubleOperationForCaslLine(cppToCaslMapping, resolvedObjects, caslLine);
          const wordIndex = doubleOperation?.wordIndex ?? 0;
          const sourceWord = doubleOperation?.sourceObject?.words[wordIndex];
          const destinationWord = doubleOperation?.destinationObject?.words[wordIndex];
          const currentWord = doubleOperation?.currentObject?.words[wordIndex];
          const operationTitle = doubleOperation?.kind === "double-copy"
            ? t("doubleTrace.copyAssignment", {
              destination: doubleOperation.destinationObject?.symbolName ?? "?",
              source: doubleOperation.sourceObject?.symbolName ?? "?"
            })
            : doubleOperation?.kind === "double-initializer"
              ? t("doubleTrace.initializer", { target: doubleOperation.currentObject?.symbolName ?? "?" })
              : doubleOperation?.kind === "double-literal-assignment"
                ? t("doubleTrace.literalAssignment", { target: doubleOperation.currentObject?.symbolName ?? "?" })
                : undefined;
          const wordDetail = doubleOperation?.kind === "double-copy"
            ? `${t("doubleTrace.wordOf", { word: wordIndex + 1 })} | ${formatObjectWord(doubleOperation.sourceObject?.symbolName, wordIndex, sourceWord?.address)} -> ${formatObjectWord(doubleOperation.destinationObject?.symbolName, wordIndex, destinationWord?.address)}`
            : doubleOperation
              ? `${t("doubleTrace.wordOf", { word: wordIndex + 1 })} | ${formatObjectWord(doubleOperation.currentObject?.symbolName, wordIndex, currentWord?.address)}`
              : undefined;
          return (
          <article key={`${event.index}-${event.address}`} className="trace-item" data-testid="trace-item" data-latest={index === 0 ? "true" : "false"} data-double-operation={doubleOperation?.operationId}>
            <strong>Step {event.index}</strong>
            <div className="trace-item-body">
              {operationTitle ? <p className="trace-double-operation" data-testid="trace-double-operation" title={operationTitle}>{operationTitle}</p> : null}
              <div className="trace-row" data-testid="trace-row-main">
                <span className="trace-main text-ellipsis" title={traceMainEvent(event)}>{traceMainEvent(event)}</span>
                <span className="mono-value">at {formatWord(event.address)}</span>
              </div>
              <p className="trace-effect text-ellipsis" data-testid="trace-row-effect" title={tracePrimaryEffect(event)}>{tracePrimaryEffect(event)}</p>
              <p className="trace-note text-ellipsis" data-testid={traceControlFlow(event, state) ? "trace-control-flow" : "trace-row-note"} title={traceSecondaryNote(event, state)}>
                {traceSecondaryNote(event, state)}
              </p>
              {wordDetail ? <p className="trace-double-word" data-testid="trace-double-word" title={wordDetail}>{wordDetail}</p> : null}
            </div>
          </article>
          );
        })}
      </div>
    </section>
  );
}

function formatObjectWord(symbolName: string | undefined, wordIndex: number, address: number | undefined): string {
  return `${symbolName ?? "?"}.word${wordIndex} [${address === undefined ? "----" : formatWord(address)}]`;
}
