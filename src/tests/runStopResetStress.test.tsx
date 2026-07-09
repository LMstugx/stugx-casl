// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { setCoreAdapter } from "../core/coreBridge";
import { MockCoreAdapter } from "../core/mockCoreAdapter";
import { getDemoProgram } from "../examples/demoPrograms";
import { AppStoreProvider, useAppStore } from "../store/useAppStore";

type Store = ReturnType<typeof useAppStore>;

const simpleSource = `MAIN START
     LAD   GR1,1
     RET
     END`;

const infiniteLoopSource = `MAIN START
LOOP JUMP  LOOP
     END`;

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

async function assembleCasl(source: string) {
  await act(async () => {
    store.setSourceMode("casl");
    store.setSourceText(source);
  });
  await act(async () => {
    store.assemble();
  });
  await waitFor(() => store.cometState.runState === "Ready" || store.cometState.runState === "Error");
}

describe("Run / Stop / Reset stress regressions", () => {
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

  it("repeated_assemble_run_reset_cycles_leave_store_usable", async () => {
    for (let index = 0; index < 5; index += 1) {
      await assembleCasl(simpleSource);

      await act(async () => {
        store.run();
      });
      await waitFor(() => store.cometState.runState === "Finished");
      expect(store.cometState.gr[1]).toBe(1);

      await act(async () => {
        store.reset();
      });
      await waitFor(() => store.cometState.runState === "Ready");
      expect(store.cometState.stepIndex).toBe(0);
      expect(store.runStopReason).toBeNull();
    }
  });

  it("max_steps_stop_then_reset_and_step_remains_usable", async () => {
    await assembleCasl(infiniteLoopSource);

    await act(async () => {
      store.run(25);
    });
    await waitFor(() => store.cometState.runState === "Stopped");
    expect(store.runStopReason).toBe("maxSteps");

    await act(async () => {
      store.reset();
    });
    await waitFor(() => store.cometState.runState === "Ready");

    await act(async () => {
      store.step();
    });
    await waitFor(() => store.cometState.stepIndex === 1);
    expect(store.cometState.runState).toBe("Ready");
  });

  it("stop_during_batch_run_then_load_demo_and_reassemble_is_safe", async () => {
    await assembleCasl(infiniteLoopSource);

    await act(async () => {
      store.run(100000);
    });
    await waitFor(() => store.cometState.runState === "Running");

    await act(async () => {
      store.stop();
    });
    await waitFor(() => store.cometState.runState === "Stopped");
    expect(store.runStopReason).toBe("manual");

    const demo = getDemoProgram("casl-gr2-addition")!;
    await act(async () => {
      store.selectDemoProgram(demo.id);
    });
    expect(store.isSourceDirty).toBe(true);
    expect(store.cometState.runState).toBe("Dirty");

    await act(async () => {
      store.assemble();
    });
    await waitFor(() => store.cometState.runState === "Ready");
    expect(store.cometState.program?.[0].op).toBe("LD");
  });

  it("dirty_source_disables_step_and_run_until_reassembled", async () => {
    await assembleCasl(simpleSource);

    await act(async () => {
      store.setSourceText(`${simpleSource}\n; edit`);
    });
    expect(store.isSourceDirty).toBe(true);
    expect(store.cometState.runState).toBe("Dirty");

    await act(async () => {
      store.step();
      store.run();
    });

    expect(store.cometState.runState).toBe("Dirty");
    expect(store.cometState.stepIndex).toBe(0);
  });
});
