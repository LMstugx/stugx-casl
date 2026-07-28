// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import CometMicrocyclePanel from "../components/CometMicrocyclePanel";
import CircuitFocusLayout from "../components/CircuitFocusLayout";
import { setCoreAdapter } from "../core/coreBridge";
import { MockCoreAdapter } from "../core/mockCoreAdapter";
import { mockCaslCore } from "../core/mockCaslCore";
import type { CometState } from "../core/types";
import { I18nProvider } from "../i18n/I18nProvider";
import { AppStoreProvider, useAppStore } from "../store/useAppStore";
import CometCircuitSvg from "../visual/CometCircuitSvg";

type Store = ReturnType<typeof useAppStore>;

let root: Root | null = null;
let container: HTMLDivElement | null = null;
let store: Store;

function Harness() {
  store = useAppStore();
  return null;
}

async function waitFor(predicate: () => boolean, timeoutMs = 3000): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) throw new Error("Timed out waiting for store state.");
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
  }
}

async function renderStore() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(
      <AppStoreProvider>
        <Harness />
      </AppStoreProvider>
    );
  });
}

async function assemble(source: string) {
  await act(async () => {
    store.setSourceText(source);
  });
  await act(async () => {
    store.assemble();
  });
  await waitFor(() => store.cometState.runState === "Ready");
}

function activeWireIds(state: CometState): string[] {
  document.body.innerHTML = renderToStaticMarkup(
    <I18nProvider initialLocale="en">
      <CometCircuitSvg state={state} />
    </I18nProvider>
  );
  return [...document.querySelectorAll<SVGPathElement>("[data-active='true']")]
    .map((path) => path.dataset.pathId ?? "")
    .filter(Boolean)
    .sort();
}

describe("Phase 20C COMET Mode UI", () => {
  beforeEach(async () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    setCoreAdapter(new MockCoreAdapter());
    await renderStore();
  });

  afterEach(async () => {
    await act(async () => {
      root?.unmount();
    });
    root = null;
    container?.remove();
    container = null;
    document.body.innerHTML = "";
    setCoreAdapter(new MockCoreAdapter());
  });

  it("store_switches_between_instruction_and_microcycle_step_without_persistence", async () => {
    await assemble(`MAIN START
     LD GR1,DATA
     RET
DATA DC 1
     END`);
    await act(async () => {
      store.setExecutionGranularity("microcycle");
    });
    await waitFor(() => store.executionGranularity === "microcycle");
    await act(async () => {
      store.step();
    });
    await waitFor(() => store.cometState.microcycle.phase === "fetch");
    expect(store.executionGranularity).toBe("microcycle");
    expect(store.cometState.stepIndex).toBe(0);
    expect(store.cometState.ir).toBe(store.cometState.memory[0x20]);
    expect(store.cometState.trace[0]).toMatchObject({
      kind: "microcycle",
      microcyclePhase: "fetch",
      microIndex: 1,
      instructionComplete: false
    });

    await act(async () => {
      store.setExecutionGranularity("instruction");
    });
    await waitFor(() => store.executionGranularity === "instruction");
    await act(async () => {
      store.step();
    });
    await waitFor(() => store.cometState.stepIndex === 1);
    expect(store.cometState.gr[1]).toBe(1);
  });

  it("continuous_microcycle_run_uses_the_existing_stop_and_bound_contract", async () => {
    await assemble(`MAIN START
     NOP
     RET
     END`);
    await act(async () => {
      store.setExecutionGranularity("microcycle");
    });
    await waitFor(() => store.executionGranularity === "microcycle");
    await act(async () => {
      store.run(32);
    });
    await waitFor(() => store.cometState.runState === "Finished");
    expect(store.cometState.stepIndex).toBe(2);
    expect(store.cometState.output).toContain("Run started. Max microsteps: 32.");
    expect(store.cometState.trace.filter((event) => event.kind === "microcycle").length).toBeGreaterThanOrEqual(8);
  });

  it("panel_exposes_phase_machine_source_and_bounded_trace", () => {
    let state = mockCaslCore.assemble(`MAIN START
     LD GR1,DATA
     RET
DATA DC 1
     END`);
    state = mockCaslCore.microStep(state);
    const markup = renderToStaticMarkup(
      <I18nProvider initialLocale="en">
        <CometMicrocyclePanel state={state} />
      </I18nProvider>
    );

    expect(markup).toContain("stugx.CASL Teaching Microarchitecture v1");
    expect(markup).toContain("Fetch");
    expect(markup).toContain("LD GR1,DATA");
    expect(markup).toContain("Microcycle trace");
    expect(markup).toContain('data-testid="comet-current-microstep">1/8');
  });

  it("comet_timeline_uses_instruction_cycle_terms_and_real_phases", () => {
    const source = `MAIN START
     LD GR1,DATA
     RET
DATA DC 1
     END`;
    const state = mockCaslCore.microStep(mockCaslCore.assemble(source));
    const markup = renderToStaticMarkup(
      <I18nProvider initialLocale="en">
        <CircuitFocusLayout
          state={state}
          sourceMode="casl"
          sourceText={source}
          generatedCaslSource=""
          cppToCaslMapping={[]}
          isSourceDirty={false}
          timelineItems={[]}
          observationMode="cpu-flow"
        />
      </I18nProvider>
    );

    expect(markup).toContain("Instruction cycle view");
    expect(markup).toContain("Current phase");
    expect(markup).toContain("Effective Address");
    expect(markup).toContain("Flag Update");
    expect(markup).not.toContain("Instruction pipeline view");
    expect(markup).not.toContain("Pipeline:");
  });

  it("circuit_lights_only_the_current_real_microcycle_path", () => {
    let state = mockCaslCore.assemble(`MAIN START
     LD GR1,DATA
     RET
DATA DC 1
     END`);
    state = mockCaslCore.microStep(state);
    expect(activeWireIds(state)).toEqual(["memory-to-mdr", "pr-to-mar"]);

    state = mockCaslCore.microStep(state);
    expect(activeWireIds(state)).toEqual(["decoder-to-controller", "ir-to-decoder"]);

    state = mockCaslCore.microStep(state);
    expect(activeWireIds(state)).toEqual(["base-to-eau", "eau-to-mar"]);

    state = mockCaslCore.microStep(state);
    expect(activeWireIds(state)).toEqual(["memory-to-mdr"]);

    state = mockCaslCore.microStep(state);
    expect(activeWireIds(state)).toEqual([]);

    state = mockCaslCore.microStep(state);
    expect(activeWireIds(state)).toEqual(["mdr-to-gr"]);
  });

  it.each(["en", "ja", "zh-CN"] as const)("microcycle_labels_are_complete_in_%s", (locale) => {
    const state = mockCaslCore.microStep(mockCaslCore.assemble(`MAIN START
     NOP
     RET
     END`));
    const markup = renderToStaticMarkup(
      <I18nProvider initialLocale={locale}>
        <CometMicrocyclePanel state={state} />
      </I18nProvider>
    );
    expect(markup).not.toContain("cometMode.");
    expect(markup).toContain("stugx.CASL Teaching Microarchitecture v1");
  });
});
