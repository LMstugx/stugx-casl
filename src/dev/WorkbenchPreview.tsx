import { StrictMode, useState } from "react";
import type { Root } from "react-dom/client";
import { PhasePills } from "../components/workbench/PhasePills";
import { WorkbenchShell, type WorkbenchLayout } from "../components/workbench/WorkbenchShell";
import type { MicrocyclePhase } from "../core/microcycle";
import { I18nProvider } from "../i18n/I18nProvider";
import { microcyclePhaseKey } from "../i18n/microcycle";
import type { SupportedLocale } from "../i18n/types";
import { useI18n } from "../i18n/useI18n";
import { DatapathCanvas } from "../visual/datapath/DatapathCanvas";
import { DATAPATH_FIXTURES, type DatapathFixtureId } from "../visual/datapath/fixtures";
import { useDatapathLabels } from "../visual/datapath/labels";
import "./workbenchPreview.css";

/**
 * Development-only page for the v2 workbench shell and datapath parts. It is reachable with
 * ?preview=workbench on the dev server and is never part of a production build. Everything it
 * shows comes from static fixtures; it does not touch the core.
 */

const LOAD_PHASES: readonly MicrocyclePhase[] = ["fetch", "decode", "effective-address", "operand-read", "execute", "write-back", "flag-update", "complete"];
const STORE_PHASES: readonly MicrocyclePhase[] = ["fetch", "decode", "effective-address", "execute", "write-back", "complete"];

const FIXTURE_PHASES: Record<DatapathFixtureId, { phases: readonly MicrocyclePhase[]; current: number }> = {
  idle: { phases: [], current: -1 },
  "ld-effective-address": { phases: LOAD_PHASES, current: 2 },
  "ld-operand-read": { phases: LOAD_PHASES, current: 3 },
  "adda-execute": { phases: LOAD_PHASES, current: 4 },
  "adda-write-back": { phases: LOAD_PHASES, current: 5 },
  "st-write": { phases: STORE_PHASES, current: 4 }
};

const FIXTURE_IDS = Object.keys(DATAPATH_FIXTURES) as DatapathFixtureId[];
const LAYOUTS: readonly WorkbenchLayout[] = ["show-both", "circuit-focus", "data-focus"];
const LOCALES: readonly SupportedLocale[] = ["en", "ja", "zh-CN"];

function Choice<T extends string>({ label, options, value, onChange }: { label: string; options: readonly T[]; value: T; onChange: (next: T) => void }) {
  return (
    <span className="wbp-choice" role="group" aria-label={label}>
      <span className="wbp-choice-label">{label}</span>
      {options.map((option) => (
        <button key={option} type="button" className="wbp-button" aria-pressed={option === value} onClick={() => onChange(option)}>
          {option}
        </button>
      ))}
    </span>
  );
}

function WorkbenchPreview() {
  const { t, locale, setLocale } = useI18n();
  const datapathLabels = useDatapathLabels();
  const [fixtureId, setFixtureId] = useState<DatapathFixtureId>("ld-operand-read");
  const [layout, setLayout] = useState<WorkbenchLayout>("show-both");
  const [codeOpen, setCodeOpen] = useState(true);
  const [dockOpen, setDockOpen] = useState(true);
  const [motion, setMotion] = useState(true);
  const [replay, setReplay] = useState(0);
  const plan = FIXTURE_PHASES[fixtureId];

  return (
    <WorkbenchShell
      layout={layout}
      codeOpen={codeOpen}
      dockOpen={dockOpen}
      labels={{
        code: t("workbench.region.code"),
        datapath: t("workbench.region.datapath"),
        observation: t("workbench.region.observation"),
        dock: t("workbench.region.dock"),
        controls: t("workbench.region.controls")
      }}
      topBar={
        <>
          <strong>stugx.CASL</strong>
          <span className="wbp-note">Workbench preview · Phase 1 · static fixtures, no core</span>
          <span className="wbp-spacer" />
          <Choice label="Locale" options={LOCALES} value={locale} onChange={setLocale} />
        </>
      }
      codePane={
        <>
          <h2 className="wbp-pane-title">{t("workbench.region.code")}</h2>
          <p className="wbp-placeholder">Source editor, module list, and breakpoints are wired in Phase 1b.</p>
        </>
      }
      datapathPane={
        <>
          <div className="wbp-pane-head">
            <h2 className="wbp-pane-title">{t("workbench.region.datapath")}</h2>
            <PhasePills
              phases={plan.phases.map((phase) => ({ id: phase, text: t(microcyclePhaseKey(phase)) }))}
              currentIndex={plan.current}
              labels={{
                list: t("workbench.phase.listLabel"),
                position: (index, total) => t("workbench.phase.position", { index, total }),
                done: t("workbench.phase.done")
              }}
            />
          </div>
          <div className="wbp-canvas">
            <DatapathCanvas
              model={DATAPATH_FIXTURES[fixtureId]}
              labels={datapathLabels}
              compact={layout === "data-focus"}
              motion={motion ? "play" : "none"}
              stepKey={`${fixtureId}:${replay}`}
            />
          </div>
        </>
      }
      observationPane={
        <>
          <h2 className="wbp-pane-title">{t("workbench.region.observation")}</h2>
          <p className="wbp-placeholder">Registers, memory, stack, trace, mapping, and inspector are wired in Phase 1b.</p>
        </>
      }
      dock={
        <>
          <h2 className="wbp-pane-title">{t("workbench.region.dock")}</h2>
          <p className="wbp-placeholder">Output, console input, messages, generated CASL, and machine code are wired in Phase 1b.</p>
        </>
      }
      controls={
        <>
          <Choice label="Fixture" options={FIXTURE_IDS} value={fixtureId} onChange={setFixtureId} />
          <Choice label="Layout" options={LAYOUTS} value={layout} onChange={setLayout} />
          <button type="button" className="wbp-button" aria-pressed={codeOpen} onClick={() => setCodeOpen((open) => !open)}>
            source pane
          </button>
          <button type="button" className="wbp-button" aria-pressed={dockOpen} onClick={() => setDockOpen((open) => !open)}>
            dock
          </button>
          <button type="button" className="wbp-button" aria-pressed={motion} onClick={() => setMotion((on) => !on)}>
            motion
          </button>
          <button type="button" className="wbp-button" onClick={() => setReplay((count) => count + 1)}>
            replay
          </button>
        </>
      }
    />
  );
}

export function mountWorkbenchPreview(root: Root): void {
  root.render(
    <StrictMode>
      <I18nProvider>
        <WorkbenchPreview />
      </I18nProvider>
    </StrictMode>
  );
}
