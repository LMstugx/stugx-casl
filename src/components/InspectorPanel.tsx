import { useState } from "react";
import { CometState } from "../core/types";
import MemoryPanel from "./MemoryPanel";
import RegisterPanel from "./RegisterPanel";
import SourceMapPanel from "./SourceMapPanel";
import TracePanel from "./TracePanel";

type InspectorTab = "registers" | "memory" | "sourceMap" | "trace";

const tabs: Array<{ id: InspectorTab; label: string }> = [
  { id: "registers", label: "Registers" },
  { id: "memory", label: "Memory" },
  { id: "sourceMap", label: "Source Map" },
  { id: "trace", label: "Trace" }
];

export default function InspectorPanel({ state }: { state: CometState }) {
  const [activeTab, setActiveTab] = useState<InspectorTab>("registers");

  return (
    <section className="panel inspector-panel">
      <header className="panel-header inspector-header">
        <div>
          <h2>Inspector</h2>
          <span>{state.runState}</span>
        </div>
      </header>

      <div className="tab-list compact-tabs" role="tablist" aria-label="Inspector panels">
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

      <div className="tab-content inspector-content">
        {activeTab === "registers" ? <RegisterPanel state={state} embedded /> : null}
        {activeTab === "memory" ? <MemoryPanel state={state} embedded /> : null}
        {activeTab === "sourceMap" ? <SourceMapPanel state={state} embedded /> : null}
        {activeTab === "trace" ? <TracePanel state={state} embedded /> : null}
      </div>
    </section>
  );
}
