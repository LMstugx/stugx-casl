import { useState } from "react";
import { CometState } from "../core/types";
import MemoryPanel from "./MemoryPanel";
import RegisterPanel from "./RegisterPanel";
import SourceMapPanel from "./SourceMapPanel";
import TracePanel from "./TracePanel";
import { handleHorizontalTabListKeyDown } from "./tabKeyboard";

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
    <section className="panel inspector-panel" data-active-tab={activeTab}>
      <header className="panel-header inspector-header">
        <div>
          <h2>Inspector</h2>
          <span>{state.runState}</span>
        </div>
      </header>

      <div className="tab-list compact-tabs" role="tablist" aria-label="Inspector panels" aria-orientation="horizontal" onKeyDown={handleHorizontalTabListKeyDown}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            id={`inspector-tab-${tab.id}`}
            className={activeTab === tab.id ? "tab-button active" : "tab-button"}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`inspector-panel-${tab.id}`}
            aria-label={`Open ${tab.label} inspector tab`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            title={tab.label}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        id={`inspector-panel-${activeTab}`}
        className="tab-content inspector-content"
        data-active-tab={activeTab}
        role="tabpanel"
        aria-labelledby={`inspector-tab-${activeTab}`}
      >
        {activeTab === "registers" ? <RegisterPanel state={state} embedded /> : null}
        {activeTab === "memory" ? <MemoryPanel state={state} embedded /> : null}
        {activeTab === "sourceMap" ? <SourceMapPanel state={state} embedded /> : null}
        {activeTab === "trace" ? <TracePanel state={state} embedded /> : null}
      </div>
    </section>
  );
}
