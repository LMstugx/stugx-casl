import { useEffect, useRef, useState } from "react";
import type { CometState } from "../core/types";
import { formatWord } from "../core/types";
import { selectGeneratedCaslRows } from "../core/generatedCaslRows";
import { explainMachineCodeRow, selectDefaultMachineCodeRow, selectMachineCodeRows } from "../core/machineCodeRows";
import type { CppToCaslMap } from "../transpiler/cppAst";
import type { SourceMode } from "../store/useAppStore";

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

const tabs: Array<{ id: OutputTab; label: string }> = [
  { id: "output", label: "Output" },
  { id: "console", label: "Console" },
  { id: "messages", label: "Messages" },
  { id: "generated", label: "Generated CASL" },
  { id: "machine", label: "Machine Code" }
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
        : ["Ready. Assemble the program to begin."]
      : activeTab === "console"
        ? ["Console is reserved for future runtime logs."]
        : activeTab === "messages"
          ? messages.length
            ? messages
            : ["No diagnostics or system messages."]
          : activeTab === "machine"
            ? []
          : generatedCaslSource
            ? generatedCaslSource.split(/\r?\n/)
            : ["No generated CASL. Switch to C++ subset mode and assemble."];
  const generatedRows = selectGeneratedCaslRows(generatedCaslSource, cppToCaslMapping, currentCaslLine, currentCppLine);
  const machineRows = state ? selectMachineCodeRows(state, cppToCaslMapping) : [];
  const [selectedMachineAddress, setSelectedMachineAddress] = useState<number | null>(null);
  const selectedMachineRow =
    machineRows.find((row) => row.address === selectedMachineAddress) ?? selectDefaultMachineCodeRow(machineRows);
  const machineExplanation = selectedMachineRow ? explainMachineCodeRow(selectedMachineRow) : undefined;

  return (
    <section className="output-panel">
      <header className="dock-header">
        <div className="tab-list dock-tabs" role="tablist" aria-label="Output panels">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={activeTab === tab.id ? "tab-button active" : "tab-button"}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button className="text-button" onClick={onClear} disabled={activeTab !== "output"}>
          Clear
        </button>
      </header>
      <div className={`console-lines ${activeTab}`} aria-label={`${activeTab} log`} data-testid={activeTab === "generated" ? "generated-casl-output" : activeTab === "machine" ? "machine-code-output" : undefined}>
        {activeTab === "generated"
          ? (
              <>
                <div className="generated-casl-title" data-testid="generated-casl-title">
                  Generated CASL II Assembly
                </div>
                {generatedCaslSource && sourceMode === "cpp" ? (
                  <div className="generated-casl-heading" data-testid="generated-casl-heading">
                    This CASL II code was generated from the C++ subset source.
                  </div>
                ) : null}
                {generatedCaslSource ? (
                  <div className="code-table generated-casl-table">
                    <div className="code-table-header">
                      <span>Line</span>
                      <span>Label</span>
                      <span>Opcode</span>
                      <span>Operand</span>
                      <span>Mapping</span>
                      <span>C++</span>
                    </div>
                    {generatedRows.map((row) => (
                      <div
                        key={`${row.lineNumber}-${row.raw}`}
                        className={`code-table-row generated-casl-line ${row.isCurrent ? "current" : ""} ${row.isRelated ? "related" : ""} ${row.isGeneratedMeta ? "generated-meta" : ""}`}
                        data-testid={row.isCurrent ? "generated-casl-line-current" : "generated-casl-line"}
                        data-line={row.lineNumber}
                        data-current={row.isCurrent ? "true" : "false"}
                        data-related={row.isRelated ? "true" : "false"}
                      >
                        <span className="console-prefix">{String(row.lineNumber).padStart(2, "0")}</span>
                        <span>{row.label || "-"}</span>
                        <span>{row.opcode || "-"}</span>
                        <span>{row.operand || "-"}</span>
                        <span>{row.mappingKinds.join(", ") || "-"}</span>
                        <span>{row.relatedCppLine ? `L${row.relatedCppLine}` : "-"}</span>
                      </div>
                    ))}
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
                  <div className="generated-casl-title">COMET II Machine Code</div>
                  {machineRows.length ? (
                    <div className="machine-code-content">
                      <div className="code-table machine-code-table">
                        <div className="code-table-header">
                          <span>Address</span>
                          <span>Word</span>
                          <span>Source</span>
                          <span>Label</span>
                          <span>Meaning</span>
                          <span>C++</span>
                        </div>
                        {machineRows.map((row) => {
                          const isSelected = selectedMachineRow?.address === row.address;
                          return (
                            <div
                              key={`${row.address}-${row.sourceLineIndex}`}
                              className={`code-table-row machine-code-row ${row.isCurrentPr ? "current-pr" : ""} ${row.isCurrentIr ? "current-ir" : ""} ${row.isRead ? "read" : ""} ${row.isWritten ? "written" : ""} ${isSelected ? "selected" : ""}`}
                              data-testid={`machine-code-row-${formatWord(row.address)}`}
                              data-address={formatWord(row.address)}
                              data-pr={row.isCurrentPr ? "true" : "false"}
                              data-ir={row.isCurrentIr ? "true" : "false"}
                              data-read={row.isRead ? "true" : "false"}
                              data-write={row.isWritten ? "true" : "false"}
                              data-selected={isSelected ? "true" : "false"}
                              role="button"
                              tabIndex={0}
                              onClick={() => setSelectedMachineAddress(row.address)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  setSelectedMachineAddress(row.address);
                                }
                              }}
                            >
                              <span className="hex">{formatWord(row.address)}</span>
                              <span className="hex">{formatWord(row.word)}</span>
                              <span>{row.sourceText}</span>
                              <span>{row.label ?? "-"}</span>
                              <span>{row.meaning}</span>
                              <span>{row.relatedCppLine ? `L${row.relatedCppLine}` : "-"}</span>
                            </div>
                          );
                        })}
                      </div>
                      {machineExplanation ? (
                        <section className="machine-code-explanation" data-testid="machine-code-explanation" aria-label="Selected word explanation">
                          <div className="machine-code-explanation-title">
                            Selected Word Explanation
                          </div>
                          <dl>
                            <div>
                              <dt>Address</dt>
                              <dd>{formatWord(machineExplanation.address)}</dd>
                            </div>
                            <div>
                              <dt>Word</dt>
                              <dd>{formatWord(machineExplanation.word)}</dd>
                            </div>
                            <div>
                              <dt>Role</dt>
                              <dd>{machineExplanation.wordRole === "instruction" ? "instruction word" : machineExplanation.wordRole === "operand" ? "operand word" : machineExplanation.wordRole === "data" ? "data word" : "reserved word"}</dd>
                            </div>
                            <div>
                              <dt>Opcode</dt>
                              <dd>{machineExplanation.opcode !== undefined ? `${formatWord(machineExplanation.opcode, 2)} = ${machineExplanation.mnemonic ?? "unknown"}` : "-"}</dd>
                            </div>
                            <div>
                              <dt>Register</dt>
                              <dd>{machineExplanation.register !== undefined ? `GR${machineExplanation.register}` : "-"}</dd>
                            </div>
                            <div>
                              <dt>Index</dt>
                              <dd>{machineExplanation.indexRegister ? `GR${machineExplanation.indexRegister}` : "none"}</dd>
                            </div>
                            <div>
                              <dt>Operand</dt>
                              <dd>
                                {machineExplanation.operandAddress !== undefined
                                  ? `${formatWord(machineExplanation.operandAddress)}${machineExplanation.resolvedLabel ? ` = address of ${machineExplanation.resolvedLabel}` : ""}`
                                  : "-"}
                              </dd>
                            </div>
                            <div>
                              <dt>Binary</dt>
                              <dd>{machineExplanation.binaryText}</dd>
                            </div>
                            <div className="machine-code-explanation-wide">
                              <dt>Source</dt>
                              <dd>{machineExplanation.sourceText || "-"}</dd>
                            </div>
                            <div className="machine-code-explanation-wide">
                              <dt>Meaning</dt>
                              <dd>{machineExplanation.meaning}</dd>
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
