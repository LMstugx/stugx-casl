import { useEffect, useRef, useState } from "react";
import type { CometState } from "../core/types";
import { formatWord } from "../core/types";
import { selectGeneratedCaslRows } from "../core/generatedCaslRows";
import { explainMachineCodeRow, selectDefaultMachineCodeRow, selectMachineCodeRows } from "../core/machineCodeRows";
import {
  controlFlowEdgeLabel,
  controlFlowLabelBadge,
  controlFlowMeaning,
  controlFlowTargetText,
  selectControlFlowForMachineRow,
  selectControlFlowGraph
} from "../core/controlFlowGraph";
import type { CppToCaslMap } from "../transpiler/cppAst";
import type { SourceMode } from "../store/useAppStore";
import { handleHorizontalTabListKeyDown } from "./tabKeyboard";
import { useI18n } from "../i18n/useI18n";
import type { TranslationKey } from "../i18n/types";

type OutputPanelProps = {
  lines: string[];
  messages?: string[];
  generatedCaslSource?: string;
  cppToCaslMapping?: CppToCaslMap[];
  currentCaslLine?: number;
  currentCppLine?: number;
  state?: CometState;
  sourceMode?: SourceMode;
  initialTab?: OutputTab;
  autoOpenGenerated?: boolean;
  onClear: () => void;
};

type OutputTab = "output" | "console" | "messages" | "generated" | "machine";

const tabs: Array<{ id: OutputTab; labelKey: TranslationKey }> = [
  { id: "output", labelKey: "tabs.outputLog" },
  { id: "console", labelKey: "tabs.console" },
  { id: "messages", labelKey: "tabs.messages" },
  { id: "generated", labelKey: "tabs.generatedCasl" },
  { id: "machine", labelKey: "tabs.machineCode" }
];

function lineTone(line: string): "success" | "danger" | "warn" | "muted" | "default" {
  const normalized = line.toLowerCase();
  if (/\b(failed|error:|runtime error|undefined|invalid|max steps)\b/.test(normalized)) return "danger";
  if (/\b(warning:|warn)\b/.test(normalized) && !normalized.includes("0 warnings")) return "warn";
  if (normalized.includes("succeeded") || normalized.includes("loaded") || normalized.includes("finished") || normalized.includes("reset")) return "success";
  if (normalized.includes("reserved") || normalized.includes("ready")) return "muted";
  return "default";
}

function linePrefix(tab: OutputTab, line: string): string {
  const tone = lineTone(line);
  if (tab === "messages") return tone === "danger" ? "error" : tone === "warn" ? "warn" : "info";
  if (tab === "console") return ">";
  if (tone === "success") return "ok";
  if (tone === "danger") return "error";
  if (tone === "warn") return "warn";
  return "info";
}

export default function OutputPanel({
  lines,
  messages = [],
  generatedCaslSource = "",
  cppToCaslMapping = [],
  currentCaslLine,
  currentCppLine,
  state,
  sourceMode = "casl",
  initialTab = "output",
  autoOpenGenerated = false,
  onClear
}: OutputPanelProps) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<OutputTab>(initialTab);
  const lastAutoOpenedSource = useRef("");
  useEffect(() => {
    if (!autoOpenGenerated || !generatedCaslSource || lastAutoOpenedSource.current === generatedCaslSource) return;
    lastAutoOpenedSource.current = generatedCaslSource;
    setActiveTab("generated");
  }, [autoOpenGenerated, generatedCaslSource]);

  const visibleLines =
    activeTab === "output"
      ? lines.length
        ? lines
        : [t("empty.noOutput")]
      : activeTab === "console"
        ? ["Console is reserved for future runtime logs."]
        : activeTab === "messages"
          ? messages.length
            ? messages
            : [t("empty.noMessages")]
          : activeTab === "machine"
            ? []
          : generatedCaslSource
            ? generatedCaslSource.split(/\r?\n/)
            : ["No generated CASL. Switch to C++ subset mode and assemble."];
  const generatedRows = selectGeneratedCaslRows(generatedCaslSource, cppToCaslMapping, currentCaslLine, currentCppLine);
  const machineRows = state ? selectMachineCodeRows(state, cppToCaslMapping) : [];
  const controlFlowGraph = selectControlFlowGraph(generatedCaslSource, cppToCaslMapping, machineRows, state);
  const labelByCaslLine = new Map(controlFlowGraph.labels.map((label) => [label.caslLine, label]));
  const primaryEdgeByCaslLine = new Map(
    controlFlowGraph.edges
      .filter((edge) => edge.kind !== "conditional-false")
      .map((edge) => [edge.fromCaslLine, edge])
  );
  const currentTargetAddresses = new Set(controlFlowGraph.edges.filter((edge) => edge.isCurrent && edge.toAddress !== undefined).map((edge) => edge.toAddress!));
  const [selectedMachineAddress, setSelectedMachineAddress] = useState<number | null>(null);
  const selectedMachineRow =
    machineRows.find((row) => row.address === selectedMachineAddress) ?? selectDefaultMachineCodeRow(machineRows);
  const machineExplanation = selectedMachineRow ? explainMachineCodeRow(selectedMachineRow) : undefined;
  const selectedMachineEdge = selectedMachineRow ? selectControlFlowForMachineRow(selectedMachineRow, controlFlowGraph) : undefined;

  return (
    <section className="output-panel">
      <header className="dock-header">
        <div className="tab-list dock-tabs" role="tablist" aria-label={t("accessibility.outputPanels")} aria-orientation="horizontal" onKeyDown={handleHorizontalTabListKeyDown}>
          {tabs.map((tab) => {
            const label = t(tab.labelKey);
            return (
            <button
              key={tab.id}
              id={`output-tab-${tab.id}`}
              className={activeTab === tab.id ? "tab-button active" : "tab-button"}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`output-panel-${tab.id}`}
              aria-label={t("accessibility.openOutputTab", { tab: label })}
              tabIndex={activeTab === tab.id ? 0 : -1}
              title={label}
              onClick={() => setActiveTab(tab.id)}
            >
              {label}
            </button>
            );
          })}
        </div>
        <button className="text-button" onClick={onClear} disabled={activeTab !== "output"} aria-label={t("accessibility.clearOutput")} title={t("accessibility.clearOutput")}>
          {t("common.clear")}
        </button>
      </header>
      <div
        id={`output-panel-${activeTab}`}
        className={`console-lines ${activeTab}`}
        role="tabpanel"
        aria-labelledby={`output-tab-${activeTab}`}
        aria-label={t(tabs.find((tab) => tab.id === activeTab)?.labelKey ?? "tabs.outputLog")}
        data-testid={activeTab === "generated" ? "generated-casl-output" : activeTab === "machine" ? "machine-code-output" : undefined}
      >
        {activeTab === "generated"
          ? (
              <>
                <div className="generated-casl-title" data-testid="generated-casl-title">
                  {t("codeMachine.generated")} {t("codeMachine.caslAssembly")}
                </div>
                {generatedCaslSource && sourceMode === "cpp" ? (
                  <div className="generated-casl-heading" data-testid="generated-casl-heading">
                    This CASL II code was generated from the C++ subset source.
                  </div>
                ) : null}
                {generatedCaslSource ? (
                  <div className="code-table generated-casl-table">
                    <div className="code-table-header">
                      <span>{t("codeMachine.line")}</span>
                      <span>{t("table.label")}</span>
                      <span>{t("codeMachine.opcode")}</span>
                      <span>{t("codeMachine.operand")}</span>
                      <span>{t("table.mapping")}</span>
                      <span title={t("codeMachine.relatedCppLine")} aria-label={t("codeMachine.relatedCppLine")}>C++</span>
                      <span>{t("timeline.flow")}</span>
                    </div>
                    {generatedRows.map((row) => {
                      const label = labelByCaslLine.get(row.lineNumber);
                      const edge = primaryEdgeByCaslLine.get(row.lineNumber);
                      return (
                        <div
                          key={`${row.lineNumber}-${row.raw}`}
                          className={`code-table-row generated-casl-line ${row.isCurrent ? "current" : ""} ${row.isRelated ? "related" : ""} ${row.isGeneratedMeta ? "generated-meta" : ""}`}
                          data-testid={row.isCurrent ? "generated-casl-line-current" : "generated-casl-line"}
                          data-line={row.lineNumber}
                          data-current={row.isCurrent ? "true" : "false"}
                          data-related={row.isRelated ? "true" : "false"}
                          data-flow-kind={edge?.kind ?? ""}
                        >
                          <span className="console-prefix mono-value">{String(row.lineNumber).padStart(2, "0")}</span>
                          <span className="text-ellipsis" title={row.label || "-"}>
                            {label ? <span className={`flow-badge ${label.kind}`}>{controlFlowLabelBadge(label)}</span> : null}
                            {row.label || "-"}
                          </span>
                          <span className="nowrap-symbol" title={row.opcode || "-"}>{row.opcode || "-"}</span>
                          <span className="nowrap-symbol" title={row.operand || "-"}>{row.operand || "-"}</span>
                          <span className="text-ellipsis" title={row.mappingKinds.join(", ") || "-"}>{row.mappingKinds.join(", ") || "-"}</span>
                          <span className="nowrap-symbol" title={row.relatedCppLine ? `L${row.relatedCppLine}` : "-"}>{row.relatedCppLine ? `L${row.relatedCppLine}` : "-"}</span>
                          <span className="flow-target text-ellipsis" title={edge ? `${controlFlowEdgeLabel(edge)} / ${controlFlowTargetText(edge)}` : "-"} data-testid={edge ? "generated-casl-flow-target" : undefined}>
                            {edge ? `${controlFlowEdgeLabel(edge)} / ${controlFlowTargetText(edge)}` : "-"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="console-line muted">
                    <span className="console-prefix">info</span>
                    <span>No generated CASL. Switch to C++ subset mode and assemble.</span>
                  </div>
                )}
              </>
            )
          : activeTab === "machine"
            ? (
                <>
                  <div className="generated-casl-title">{t("codeMachine.machineCode")}</div>
                  {machineRows.length ? (
                    <div className="machine-code-content">
                      <div className="code-table machine-code-table">
                        <div className="code-table-header">
                          <span>{t("table.address")}</span>
                          <span>{t("codeMachine.word")}</span>
                          <span>{t("table.source")}</span>
                          <span>{t("table.label")}</span>
                          <span>{t("table.meaning")}</span>
                          <span title={t("codeMachine.relatedCppLine")} aria-label={t("codeMachine.relatedCppLine")}>C++</span>
                        </div>
                        {machineRows.map((row) => {
                          const isSelected = selectedMachineRow?.address === row.address;
                          const edge = selectControlFlowForMachineRow(row, controlFlowGraph);
                          const isControlTarget = currentTargetAddresses.has(row.address);
                          return (
                            <div
                              key={`${row.address}-${row.sourceLineIndex}`}
                              className={`code-table-row machine-code-row ${row.isCurrentPr ? "current-pr" : ""} ${row.isCurrentIr ? "current-ir" : ""} ${row.isRead ? "read" : ""} ${row.isWritten ? "written" : ""} ${isSelected ? "selected" : ""} ${isControlTarget ? "control-target" : ""}`}
                              data-testid={`machine-code-row-${formatWord(row.address)}`}
                              data-address={formatWord(row.address)}
                              data-pr={row.isCurrentPr ? "true" : "false"}
                              data-ir={row.isCurrentIr ? "true" : "false"}
                              data-read={row.isRead ? "true" : "false"}
                              data-write={row.isWritten ? "true" : "false"}
                              data-selected={isSelected ? "true" : "false"}
                              data-flow-kind={edge?.kind ?? ""}
                              role="button"
                              aria-label={`Select machine word ${formatWord(row.word)} at ${formatWord(row.address)} from ${row.sourceText}`}
                              aria-pressed={isSelected}
                              tabIndex={0}
                              onClick={() => setSelectedMachineAddress(row.address)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  setSelectedMachineAddress(row.address);
                                }
                              }}
                            >
                              <span className="hex mono-value">{formatWord(row.address)}</span>
                              <span className="hex mono-value">{formatWord(row.word)}</span>
                              <span className="nowrap-symbol" title={row.sourceText}>{row.sourceText}</span>
                              <span className="text-ellipsis" title={row.label ?? "-"}>{row.label ?? "-"}</span>
                              <span className="text-ellipsis" title={edge ? controlFlowEdgeLabel(edge) : row.meaning}>{edge ? controlFlowEdgeLabel(edge) : row.meaning}</span>
                              <span className="nowrap-symbol" title={row.relatedCppLine ? `L${row.relatedCppLine}` : "-"}>{row.relatedCppLine ? `L${row.relatedCppLine}` : "-"}</span>
                            </div>
                          );
                        })}
                      </div>
                      {machineExplanation ? (
                        <section className="machine-code-explanation" data-testid="machine-code-explanation" aria-label={t("codeMachine.selectedWordExplanation")}>
                          <div className="machine-code-explanation-title">
                            {t("codeMachine.selectedWordExplanation")}
                          </div>
                          <dl className="machine-code-explanation-summary" data-testid="machine-code-explanation-summary">
                            <div>
                              <dt>{t("table.source")}</dt>
                              <dd className="nowrap-symbol" title={machineExplanation.sourceText || "-"}>{machineExplanation.sourceText || "-"}</dd>
                            </div>
                            <div>
                              <dt>{t("table.meaning")}</dt>
                              <dd className="wrap-explanation" title={selectedMachineEdge ? controlFlowMeaning(selectedMachineEdge) : machineExplanation.meaning}>{selectedMachineEdge ? controlFlowMeaning(selectedMachineEdge) : machineExplanation.meaning}</dd>
                            </div>
                          </dl>
                          <dl>
                            <div>
                              <dt>{t("table.address")}</dt>
                              <dd className="mono-value">{formatWord(machineExplanation.address)}</dd>
                            </div>
                            <div>
                              <dt>{t("codeMachine.word")}</dt>
                              <dd className="mono-value">{formatWord(machineExplanation.word)}</dd>
                            </div>
                            <div>
                              <dt>{t("codeMachine.role")}</dt>
                              <dd className="text-ellipsis" title={machineExplanation.wordRole === "instruction" ? "instruction word" : machineExplanation.wordRole === "operand" ? "operand word" : machineExplanation.wordRole === "data" ? "data word" : "reserved word"}>{machineExplanation.wordRole === "instruction" ? "instruction word" : machineExplanation.wordRole === "operand" ? "operand word" : machineExplanation.wordRole === "data" ? "data word" : "reserved word"}</dd>
                            </div>
                            <div>
                              <dt>{t("codeMachine.opcode")}</dt>
                              <dd className="nowrap-symbol" title={machineExplanation.opcode !== undefined ? `${formatWord(machineExplanation.opcode, 2)} = ${machineExplanation.mnemonic ?? "unknown"}` : "-"}>{machineExplanation.opcode !== undefined ? `${formatWord(machineExplanation.opcode, 2)} = ${machineExplanation.mnemonic ?? "unknown"}` : "-"}</dd>
                            </div>
                            <div>
                              <dt>{t("codeMachine.register")}</dt>
                              <dd className="nowrap-symbol" title={machineExplanation.register !== undefined ? `GR${machineExplanation.register}` : "-"}>{machineExplanation.register !== undefined ? `GR${machineExplanation.register}` : "-"}</dd>
                            </div>
                            <div>
                              <dt>{t("codeMachine.index")}</dt>
                              <dd className="nowrap-symbol" title={machineExplanation.indexRegister !== undefined ? `x = GR${machineExplanation.indexRegister}` : "x = none"}>{machineExplanation.indexRegister !== undefined ? `x = GR${machineExplanation.indexRegister}` : "x = none"}</dd>
                            </div>
                            <div>
                              <dt>{t("codeMachine.indexValue")}</dt>
                              <dd className="mono-value">{machineExplanation.indexValue !== undefined ? formatWord(machineExplanation.indexValue) : "-"}</dd>
                            </div>
                            <div>
                              <dt>{t("codeMachine.operandAddress")}</dt>
                              <dd className="text-ellipsis" title={machineExplanation.operandAddress !== undefined
                                  ? `${formatWord(machineExplanation.operandAddress)}${machineExplanation.resolvedLabel ? ` = address of ${machineExplanation.resolvedLabel}` : ""}`
                                  : "-"}>
                                {machineExplanation.operandAddress !== undefined
                                  ? `${formatWord(machineExplanation.operandAddress)}${machineExplanation.resolvedLabel ? ` = address of ${machineExplanation.resolvedLabel}` : ""}`
                                  : "-"}
                              </dd>
                            </div>
                            <div>
                              <dt>{t("signalProbe.effectiveAddress")}</dt>
                              <dd className="text-ellipsis" title={machineExplanation.effectiveAddress !== undefined
                                  ? `${formatWord(machineExplanation.effectiveAddress)}${machineExplanation.effectiveLabel ? ` = ${machineExplanation.effectiveLabel}` : ""}`
                                  : "-"}>
                                {machineExplanation.effectiveAddress !== undefined
                                  ? `${formatWord(machineExplanation.effectiveAddress)}${machineExplanation.effectiveLabel ? ` = ${machineExplanation.effectiveLabel}` : ""}`
                                  : "-"}
                              </dd>
                            </div>
                            <div>
                              <dt>{t("signalProbe.returnAddress")}</dt>
                              <dd className="mono-value" title={machineExplanation.returnAddress !== undefined ? formatWord(machineExplanation.returnAddress) : "-"}>{machineExplanation.returnAddress !== undefined ? formatWord(machineExplanation.returnAddress) : "-"}</dd>
                            </div>
                            <div>
                              <dt>{t("signalProbe.stack")} {t("table.address")}</dt>
                              <dd className="nowrap-symbol" title={machineExplanation.stackAddress !== undefined ? `MEM[${formatWord(machineExplanation.stackAddress)}]` : "-"}>{machineExplanation.stackAddress !== undefined ? `MEM[${formatWord(machineExplanation.stackAddress)}]` : "-"}</dd>
                            </div>
                            <div>
                              <dt>{t("callStack.depth")}</dt>
                              <dd
                                className="nowrap-symbol"
                                title={machineExplanation.callDepthBefore !== undefined && machineExplanation.callDepthAfter !== undefined
                                  ? `${machineExplanation.callDepthBefore} -> ${machineExplanation.callDepthAfter}`
                                  : machineExplanation.callDepth !== undefined
                                    ? String(machineExplanation.callDepth)
                                    : "-"}
                              >
                                {machineExplanation.callDepthBefore !== undefined && machineExplanation.callDepthAfter !== undefined
                                  ? `${machineExplanation.callDepthBefore} -> ${machineExplanation.callDepthAfter}`
                                  : machineExplanation.callDepth !== undefined
                                    ? String(machineExplanation.callDepth)
                                    : "-"}
                              </dd>
                            </div>
                            <div>
                              <dt>RET {t("callStack.mode")}</dt>
                              <dd className="text-ellipsis" title={machineExplanation.mnemonic === "RET" ? (machineExplanation.isStackReturnContext ? "stack return" : "top-level finish") : "-"}>{machineExplanation.mnemonic === "RET" ? (machineExplanation.isStackReturnContext ? "stack return" : "top-level finish") : "-"}</dd>
                            </div>
                            <div>
                              <dt>{t("codeMachine.binary")}</dt>
                              <dd className="mono-value" title={machineExplanation.binaryText}>{machineExplanation.binaryText}</dd>
                            </div>
                            <div className="machine-code-explanation-wide">
                              <dt>{t("codeMachine.controlFlowTarget")}</dt>
                              <dd className="text-ellipsis" data-testid="machine-code-control-flow-target" title={selectedMachineEdge ? controlFlowTargetText(selectedMachineEdge) : "-"}>{selectedMachineEdge ? controlFlowTargetText(selectedMachineEdge) : "-"}</dd>
                            </div>
                            <div className="machine-code-explanation-wide">
                              <dt>{t("codeMachine.edgeKind")}</dt>
                              <dd className="text-ellipsis">{selectedMachineEdge?.kind ?? "-"}</dd>
                            </div>
                          </dl>
                        </section>
                      ) : null}
                    </div>
                  ) : (
                    <div className="console-line muted">
                      <span className="console-prefix">info</span>
                      <span>Assemble a program to view machine code.</span>
                    </div>
                  )}
                </>
              )
          : visibleLines.map((line, index) => (
              <div key={`${line}-${index}`} className={`console-line ${lineTone(line)}`}>
                <span className="console-prefix">{linePrefix(activeTab, line)}</span>
                <span>{line}</span>
              </div>
            ))}
      </div>
    </section>
  );
}
