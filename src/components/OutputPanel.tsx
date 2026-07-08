import { useEffect, useRef, useState } from "react";
import type { CppToCaslMap } from "../transpiler/cppAst";
import { caslLinesForCppLine, mappingKindsForCaslLine } from "../transpiler/cppMapping";

type OutputPanelProps = {
  lines: string[];
  messages?: string[];
  generatedCaslSource?: string;
  cppToCaslMapping?: CppToCaslMap[];
  currentCaslLine?: number;
  currentCppLine?: number;
  initialTab?: OutputTab;
  autoOpenGenerated?: boolean;
  onClear: () => void;
};

type OutputTab = "output" | "console" | "messages" | "generated";

const tabs: Array<{ id: OutputTab; label: string }> = [
  { id: "output", label: "Output" },
  { id: "console", label: "Console" },
  { id: "messages", label: "Messages" },
  { id: "generated", label: "Generated CASL" }
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
          : generatedCaslSource
            ? generatedCaslSource.split(/\r?\n/)
            : ["No generated CASL. Switch to C++ subset mode and assemble."];
  const relatedCaslLines = caslLinesForCppLine(cppToCaslMapping, currentCppLine);

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
      <div className={`console-lines ${activeTab}`} aria-label={`${activeTab} log`} data-testid={activeTab === "generated" ? "generated-casl-output" : undefined}>
        {activeTab === "generated"
          ? (
              <>
                {generatedCaslSource ? (
                  <div className="generated-casl-heading" data-testid="generated-casl-heading">
                    Generated from C++ subset
                  </div>
                ) : null}
                {visibleLines.map((line, index) => {
                  const lineNumber = index + 1;
                  const isCurrent = currentCaslLine === lineNumber;
                  const isRelated = relatedCaslLines.has(lineNumber);
                  const kinds = mappingKindsForCaslLine(cppToCaslMapping, lineNumber);
                  const isGenerated = kinds.has("generated-label") || kinds.has("loop-label") || kinds.has("constant");
                  return (
                    <div
                      key={`${line}-${index}`}
                      className={`console-line generated-casl-line ${isCurrent ? "current" : ""} ${isRelated ? "related" : ""} ${isGenerated ? "generated-meta" : ""}`}
                      data-testid={isCurrent ? "generated-casl-line-current" : "generated-casl-line"}
                      data-line={lineNumber}
                      data-current={isCurrent ? "true" : "false"}
                      data-related={isRelated ? "true" : "false"}
                    >
                      <span className="console-prefix">{String(lineNumber).padStart(2, "0")}</span>
                      <span>{line}</span>
                    </div>
                  );
                })}
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
