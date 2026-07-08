// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MockCoreAdapter } from "../core/mockCoreAdapter";
import { mockCaslCore } from "../core/mockCaslCore";
import { setCoreAdapter } from "../core/coreBridge";
import { DEFAULT_CASL_SOURCE } from "../core/defaultSource";
import { AppStoreProvider, useAppStore } from "../store/useAppStore";
import type { CometState } from "../core/types";
import Toolbar from "../components/Toolbar";

type Store = ReturnType<typeof useAppStore>;

const whileSumSource = `int main() {
    int i = 3;
    int sum = 0;
    while (i > 0) {
        sum = sum + i;
        i = i - 1;
    }
    return sum;
}`;

const infiniteLoopSource = `int main() {
    int i = 1;
    while (i > 0) {
        i = i + 1;
    }
    return i;
}`;

let root: Root | null = null;
let container: HTMLDivElement | null = null;
let store: Store;

function Harness() {
  store = useAppStore();
  return null;
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

async function waitFor(predicate: () => boolean, timeoutMs = 3000): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) throw new Error("Timed out waiting for condition.");
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
  }
}

async function loadCppSource(source: string) {
  await act(async () => {
    store.setSourceMode("cpp");
    store.setSourceText(source);
  });
  await act(async () => {
    store.assemble();
  });
  await waitFor(() => store.cometState.runState === "Ready");
}

describe("Run / Stop / Trace UX", () => {
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
    setCoreAdapter(new MockCoreAdapter());
  });

  it("run_finishes_simple_program and output_logs_run_finished", async () => {
    await act(async () => {
      store.setSourceText(DEFAULT_CASL_SOURCE);
    });
    await act(async () => {
      store.assemble();
    });
    await waitFor(() => store.cometState.runState === "Ready");

    await act(async () => {
      store.run();
    });
    await waitFor(() => store.cometState.runState === "Finished");

    expect(store.cometState.stepIndex).toBe(4);
    expect(store.cometState.gr[1]).toBe(0x001e);
    expect(store.cometState.memoryRows.find((row) => row.label === "C")?.value).toBe(0x001e);
    expect(store.cometState.output).toContain("Run finished after 4 steps.");
  });

  it("run_finishes_while_sum", async () => {
    await loadCppSource(whileSumSource);

    await act(async () => {
      store.run();
    });
    await waitFor(() => store.cometState.runState === "Finished");

    expect(store.cometState.gr[0]).toBe(0x0006);
    expect(store.cometState.output).toContain("Run finished after 36 steps.");
  });

  it("run_stops_at_max_steps and output_logs_max_steps", async () => {
    await loadCppSource(infiniteLoopSource);

    await act(async () => {
      store.run(25);
    });
    await waitFor(() => store.cometState.runState === "Stopped");

    expect(store.cometState.output.join("\n")).toContain("Max steps reached. Possible infinite loop.");
    expect(store.cometState.stepIndex).toBe(25);
    expect(store.runStopReason).toBe("maxSteps");
  });

  it("stop_interrupts_running", async () => {
    await loadCppSource(infiniteLoopSource);

    await act(async () => {
      store.run(100000);
    });
    await waitFor(() => store.cometState.runState === "Running");
    await act(async () => {
      store.stop();
    });
    await waitFor(() => store.cometState.runState === "Stopped");

    expect(store.cometState.output.join("\n")).toContain("Run stopped after");
    expect(store.cometState.stepIndex).toBeLessThan(100000);
    expect(store.runStopReason).toBe("manual");

    await act(async () => {
      store.step();
    });
    await waitFor(() => store.cometState.runState === "Ready");
    expect(store.runStopReason).toBeNull();
  });
});

describe("Trace limits", () => {
  it("trace_keeps_recent_1000_steps", () => {
    let state: CometState = mockCaslCore.assemble(`MAIN START
LOOP LAD   GR1,1
     JUMP  LOOP
     END`);

    for (let index = 0; index < 1105; index += 1) {
      state = mockCaslCore.step(state);
    }

    expect(state.trace).toHaveLength(1000);
    expect(state.trace[0].index).toBe(1105);
    expect(state.trace[0].visualPath).toBeDefined();
    expect(state.trace[0].runState).toBe("Ready");
  });
});

describe("Toolbar run states", () => {
  it("toolbar_state_running", () => {
    const markup = renderToStaticMarkup(
      <Toolbar
        assembleStatus="success"
        canRun={false}
        canStep={false}
        canReset={false}
        isRunning
        onAssemble={() => undefined}
        onRun={() => undefined}
        onStep={() => undefined}
        onReset={() => undefined}
        onStop={() => undefined}
      />
    );

    expect(markup).toContain('data-testid="run-button"');
    expect(markup).toContain('data-testid="stop-button"');
    expect(markup).toContain("Running...");
    expect(markup).toMatch(/data-testid="run-button"[^>]*disabled/);
    expect(markup).toMatch(/data-testid="step-button"[^>]*disabled/);
    expect(markup).toMatch(/data-testid="reset-button"[^>]*disabled/);
    expect(markup).not.toMatch(/data-testid="stop-button"[^>]*disabled/);
  });

  it("toolbar_state_finished", () => {
    const markup = renderToStaticMarkup(
      <Toolbar
        assembleStatus="success"
        canRun={false}
        canStep={false}
        canReset
        isRunning={false}
        onAssemble={() => undefined}
        onRun={() => undefined}
        onStep={() => undefined}
        onReset={() => undefined}
        onStop={() => undefined}
      />
    );

    expect(markup).toMatch(/data-testid="run-button"[^>]*disabled/);
    expect(markup).toMatch(/data-testid="step-button"[^>]*disabled/);
    expect(markup).not.toMatch(/data-testid="reset-button"[^>]*disabled/);
    expect(markup).toMatch(/data-testid="stop-button"[^>]*disabled/);
  });
});
