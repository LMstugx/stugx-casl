import { useState } from "react";
import { CometState } from "../core/types";
import MemoryPanel from "./MemoryPanel";
import RegisterPanel from "./RegisterPanel";
import SourceMapPanel from "./SourceMapPanel";
import TracePanel from "./TracePanel";
import { handleHorizontalTabListKeyDown } from "./tabKeyboard";
import { translateRunState } from "../i18n/locale";
import { useI18n } from "../i18n/useI18n";
import type { TranslationKey } from "../i18n/types";
import type { InspectorActiveTab } from "../preferences/types";

type InspectorTab = "registers" | "memory" | "sourceMap" | "trace";

const tabs: Array<{ id: InspectorTab; labelKey: TranslationKey }> = [
  { id: "registers", labelKey: "inspector.registers" },
  { id: "memory", labelKey: "inspector.memory" },
  { id: "sourceMap", labelKey: "inspector.sourceMap" },
  { id: "trace", labelKey: "inspector.trace" }
];

type InspectorPanelProps = {
  state: CometState;
  initialTab?: InspectorActiveTab;
  onActiveTabChange?: (tab: InspectorActiveTab) => void;
};

function fromPreferenceTab(tab: InspectorActiveTab): InspectorTab {
  return tab === "source-map" ? "sourceMap" : tab;
}

function toPreferenceTab(tab: InspectorTab): InspectorActiveTab {
  return tab === "sourceMap" ? "source-map" : tab;
}

export default function InspectorPanel({ state, initialTab = "registers", onActiveTabChange }: InspectorPanelProps) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<InspectorTab>(() => fromPreferenceTab(initialTab));

  return (
    <section className="panel inspector-panel" data-active-tab={activeTab}>
      <header className="panel-header inspector-header">
        <div>
          <h2>{t("panel.inspector")}</h2>
          <span>{translateRunState(t, state.runState)}</span>
        </div>
      </header>

      <div className="tab-list compact-tabs" role="tablist" aria-label={t("accessibility.inspectorPanels")} aria-orientation="horizontal" onKeyDown={handleHorizontalTabListKeyDown}>
        {tabs.map((tab) => {
          const label = t(tab.labelKey);
          return (
          <button
            key={tab.id}
            id={`inspector-tab-${tab.id}`}
            className={activeTab === tab.id ? "tab-button active" : "tab-button"}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`inspector-panel-${tab.id}`}
            aria-label={t("accessibility.openInspectorTab", { tab: label })}
            tabIndex={activeTab === tab.id ? 0 : -1}
            title={label}
            onClick={() => {
              setActiveTab(tab.id);
              onActiveTabChange?.(toPreferenceTab(tab.id));
            }}
          >
            {label}
          </button>
          );
        })}
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
