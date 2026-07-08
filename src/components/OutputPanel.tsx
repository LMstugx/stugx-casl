import { useState } from "react";

type OutputPanelProps = {
  lines: string[];
  onClear: () => void;
};

type OutputTab = "output" | "console" | "messages";

const tabs: Array<{ id: OutputTab; label: string }> = [
  { id: "output", label: "Output" },
  { id: "console", label: "Console" },
  { id: "messages", label: "Messages" }
];

export default function OutputPanel({ lines, onClear }: OutputPanelProps) {
  const [activeTab, setActiveTab] = useState<OutputTab>("output");
  const visibleLines =
    activeTab === "output"
      ? lines.length
        ? lines
        : ["Ready. Assemble the program to begin."]
      : activeTab === "console"
        ? ["No console entries."]
        : ["No messages."];

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
      <div className="console-lines">
        {visibleLines.map((line, index) => (
          <div key={`${line}-${index}`}>{line}</div>
        ))}
      </div>
    </section>
  );
}
