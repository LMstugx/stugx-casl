// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CircuitCanvas } from "../components/workbench/CircuitCanvas";
import { ControlBar, type ControlBarProps } from "../components/workbench/ControlBar";
import {
  isShortcutSuppressed,
  shortcutForKeyEvent,
  useWorkbenchShortcuts,
  type WorkbenchShortcutHandlers
} from "../components/workbench/useWorkbenchShortcuts";
import { setCoreAdapter } from "../core/coreBridge";
import { mockCaslCore } from "../core/mockCaslCore";
import { MockCoreAdapter } from "../core/mockCoreAdapter";
import type { CometState } from "../core/types";
import { I18nProvider } from "../i18n/I18nProvider";
import type { SupportedLocale } from "../i18n/types";
import { AppStoreProvider, useAppStore } from "../store/useAppStore";

/**
 * The parts of the v1.0 workbench that are new behaviour rather than a new arrangement:
 * global shortcuts, the control bar, the words that explain the run state on the datapath,
 * and run to breakpoint.
 */

const source = `MAIN START
     LAD   GR1,1
     LAD   GR2,2
     ADDA  GR1,GR2
     ST    GR1,SUM
     RET
SUM  DS    1
     END`;

let root: Root | null = null;
let container: HTMLDivElement | null = null;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  container?.remove();
  container = null;
});

function key(init: KeyboardEventInit): KeyboardEvent {
  return new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init });
}

describe("workbench shortcuts", () => {
  it("maps exactly the registered keys", () => {
    expect(shortcutForKeyEvent(key({ key: " ", code: "Space" }))).toBe("step");
    expect(shortcutForKeyEvent(key({ key: " ", code: "Space", shiftKey: true }))).toBe("reverseInstruction");
    expect(shortcutForKeyEvent(key({ key: "F5" }))).toBe("run");
    expect(shortcutForKeyEvent(key({ key: "F6" }))).toBe("stop");
    expect(shortcutForKeyEvent(key({ key: "Enter", ctrlKey: true }))).toBe("assemble");
    expect(shortcutForKeyEvent(key({ key: "s", ctrlKey: true }))).toBe("save");
    expect(shortcutForKeyEvent(key({ key: "S", metaKey: true }))).toBe("save");

    expect(shortcutForKeyEvent(key({ key: "Enter" }))).toBeUndefined();
    expect(shortcutForKeyEvent(key({ key: "s" }))).toBeUndefined();
    expect(shortcutForKeyEvent(key({ key: " ", code: "Space", ctrlKey: true }))).toBeUndefined();
    expect(shortcutForKeyEvent(key({ key: "F5", shiftKey: true }))).toBeUndefined();
    expect(shortcutForKeyEvent(key({ key: "F5", altKey: true }))).toBeUndefined();
  });

  it("never acts inside the editor, a text field, a select, or a dialog", () => {
    document.body.innerHTML = `
      <div class="monaco-editor"><div id="editor-inner" tabindex="0"></div></div>
      <input id="field" /><textarea id="area"></textarea><select id="choice"></select>
      <div role="dialog"><button id="dialog-button">ok</button></div>
      <main id="plain" tabindex="-1"></main>`;
    for (const id of ["editor-inner", "field", "area", "choice", "dialog-button"]) {
      for (const shortcut of ["step", "run", "stop", "assemble", "save", "reverseInstruction"] as const) {
        expect(isShortcutSuppressed(document.getElementById(id), shortcut), `${id} ${shortcut}`).toBe(true);
      }
    }
    expect(isShortcutSuppressed(document.getElementById("plain"), "step")).toBe(false);
    expect(isShortcutSuppressed(document.body, "run")).toBe(false);
  });

  it("space keeps its own meaning on buttons and tabs, while the other shortcuts still work there", () => {
    document.body.innerHTML = `<button id="button">go</button><div role="tab" id="tab" tabindex="0"></div><summary id="summary"></summary>`;
    for (const id of ["button", "tab", "summary"]) {
      expect(isShortcutSuppressed(document.getElementById(id), "step")).toBe(true);
      expect(isShortcutSuppressed(document.getElementById(id), "reverseInstruction")).toBe(true);
      expect(isShortcutSuppressed(document.getElementById(id), "run")).toBe(false);
      expect(isShortcutSuppressed(document.getElementById(id), "save")).toBe(false);
    }
  });

  it("calls the available command once, swallows the key, and ignores auto-repeat", async () => {
    const handlers: WorkbenchShortcutHandlers = { step: vi.fn(), run: vi.fn(), save: undefined };
    function Harness() {
      useWorkbenchShortcuts(handlers);
      return <input id="shortcut-field" />;
    }
    await act(async () => root?.render(<Harness />));

    const space = key({ key: " ", code: "Space" });
    document.body.dispatchEvent(space);
    expect(handlers.step).toHaveBeenCalledTimes(1);
    expect(space.defaultPrevented).toBe(true);

    document.body.dispatchEvent(key({ key: " ", code: "Space", repeat: true }));
    expect(handlers.step).toHaveBeenCalledTimes(1);

    // Ctrl+S is swallowed even while saving is unavailable, so the browser dialog never opens.
    const save = key({ key: "s", ctrlKey: true });
    document.body.dispatchEvent(save);
    expect(save.defaultPrevented).toBe(true);

    // Inside a text field the key is left alone.
    const typed = key({ key: " ", code: "Space" });
    container!.querySelector("#shortcut-field")!.dispatchEvent(typed);
    expect(typed.defaultPrevented).toBe(false);
    expect(handlers.step).toHaveBeenCalledTimes(1);

    // A key somebody else already handled is not handled again.
    const handled = key({ key: "F5" });
    handled.preventDefault();
    document.body.dispatchEvent(handled);
    expect(handlers.run).not.toHaveBeenCalled();
  });

  it("every shortcut is registered in the keyboard reference", () => {
    const reference = readFileSync("docs/reference/keyboard-accessibility.md", "utf8");
    for (const keys of ["Space", "Shift+Space", "F5", "F6", "Ctrl+Enter", "Ctrl+S", "F9"]) expect(reference).toContain(keys);
  });
});

function controlBar(overrides: Partial<ControlBarProps> = {}, locale: SupportedLocale = "en"): HTMLElement {
  const props: ControlBarProps = {
    granularity: "instruction",
    canStep: true,
    onStep: () => undefined,
    breakpointCount: 0,
    canRunToBreakpoint: false,
    onRunToBreakpoint: () => undefined,
    onClearBreakpoints: () => undefined,
    historyRetained: 0,
    historyCapacity: 1000,
    ...overrides
  };
  const host = document.createElement("div");
  host.innerHTML = renderToStaticMarkup(
    <I18nProvider initialLocale={locale}>
      <ControlBar {...props} />
    </I18nProvider>
  );
  return host;
}

describe("control bar", () => {
  it("names the step after the granularity", () => {
    expect(controlBar({ granularity: "instruction" }).querySelector('[data-testid="control-step-button"]')?.textContent).toContain("Next instruction");
    expect(controlBar({ granularity: "microcycle" }).querySelector('[data-testid="control-step-button"]')?.textContent).toContain("Next microcycle");
    expect(controlBar({ granularity: "microcycle" }, "zh-CN").querySelector('[data-testid="control-step-button"]')?.textContent).toContain("下一个微周期");
    expect(controlBar({ granularity: "instruction" }, "ja").querySelector('[data-testid="control-step-button"]')?.textContent).toContain("次の命令");
  });

  it("explains why run to breakpoint is unavailable while there is no breakpoint", () => {
    const bar = controlBar();
    const button = bar.querySelector<HTMLButtonElement>('[data-testid="run-to-breakpoint-button"]')!;
    expect(button.disabled).toBe(true);
    const reason = bar.querySelector(`[id="${button.getAttribute("aria-describedby")}"]`);
    expect(reason?.textContent).toContain("line number");
    expect(bar.querySelector('[data-testid="clear-breakpoints-button"]')).toBeNull();
  });

  it("counts breakpoints, offers to clear them, and says in words where execution stopped", () => {
    const bar = controlBar({ breakpointCount: 2, canRunToBreakpoint: true, stoppedAt: { line: 4, address: "0026" }, historyRetained: 12 });
    expect(bar.querySelector('[data-testid="breakpoint-count"]')?.textContent).toBe("Breakpoints 2");
    expect(bar.querySelector<HTMLButtonElement>('[data-testid="run-to-breakpoint-button"]')!.disabled).toBe(false);
    expect(bar.querySelector('[data-testid="clear-breakpoints-button"]')?.getAttribute("aria-label")).toBe("Clear breakpoints");
    expect(bar.querySelector('[data-testid="history-count"]')?.textContent).toBe("History 12/1000");
    const notice = bar.querySelector('[data-testid="breakpoint-notice"]')!;
    expect(notice.getAttribute("role")).toBe("status");
    expect(notice.textContent).toBe("Stopped at the breakpoint on line 4, address 0026");
  });
});

function canvasFor(state: CometState, locale: SupportedLocale = "en"): HTMLElement {
  const host = document.createElement("div");
  host.innerHTML = renderToStaticMarkup(
    <I18nProvider initialLocale={locale}>
      <CircuitCanvas state={state} />
    </I18nProvider>
  );
  return host;
}

describe("run state on the datapath", () => {
  const ready = mockCaslCore.assemble(source);

  it("says nothing while the program is ready or stepping", () => {
    expect(canvasFor(ready).querySelector('[data-testid="circuit-state-note"]')).toBeNull();
    expect(canvasFor(mockCaslCore.step(ready)).querySelector('[data-testid="circuit-state-note"]')).toBeNull();
    expect(canvasFor(ready).querySelector(".persistent-circuit-canvas")?.getAttribute("data-stale")).toBe("false");
  });

  it("explains idle, stale, waiting, finished and failed pictures in words", () => {
    const cases: Array<[CometState["runState"], string]> = [
      ["Idle", "Assemble to begin"],
      ["Dirty", "Source changed. Assemble to update."],
      ["WaitingInput", "Waiting for console input"],
      ["Finished", "Program finished"],
      ["Error", "Stopped by an error"]
    ];
    for (const [runState, text] of cases) {
      const note = canvasFor({ ...ready, runState }).querySelector('[data-testid="circuit-state-note"]');
      expect(note?.textContent, runState).toBe(text);
      expect(note?.getAttribute("data-run-state")).toBe(runState);
    }
    expect(canvasFor({ ...ready, runState: "Dirty" }, "zh-CN").textContent).toContain("源码已修改，汇编后更新");
    expect(canvasFor({ ...ready, runState: "Idle" }, "ja").textContent).toContain("アセンブルすると開始できます");
  });

  it("marks only the stale picture as stale, and still draws the datapath underneath", () => {
    const stale = canvasFor({ ...ready, runState: "Dirty" });
    expect(stale.querySelector(".persistent-circuit-canvas")?.getAttribute("data-stale")).toBe("true");
    expect(stale.querySelector('[data-testid="comet-circuit-svg"]')).not.toBeNull();
    expect(canvasFor({ ...ready, runState: "Finished" }).querySelector(".persistent-circuit-canvas")?.getAttribute("data-stale")).toBe("false");
  });
});

type Store = ReturnType<typeof useAppStore>;
let store: Store;

function StoreHarness() {
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

describe("run to breakpoint", () => {
  beforeEach(async () => {
    setCoreAdapter(new MockCoreAdapter());
    await act(async () => root?.render(<AppStoreProvider><StoreHarness /></AppStoreProvider>));
    await act(async () => store.setSourceText(source));
    await act(async () => store.assemble());
    await waitFor(() => store.cometState.runState === "Ready");
  });

  afterEach(() => setCoreAdapter(new MockCoreAdapter()));

  function addressOfLine(line: number): number {
    const mapping = store.cometState.sourceMap.find((entry) => entry.line === line);
    if (!mapping) throw new Error(`no instruction on line ${line}`);
    return mapping.address;
  }

  it("stops in front of the breakpoint as a manual stop that can be continued", async () => {
    const adda = addressOfLine(4);
    await act(async () => store.run(undefined, { breakAddresses: new Set([adda]) }));
    await waitFor(() => store.cometState.runState === "Stopped");

    expect(store.cometState.pr).toBe(adda);
    expect(store.runStopReason).toBe("manual");
    // The instruction on the breakpoint line has not been executed yet.
    expect(store.cometState.gr[1]).toBe(1);
    expect(store.cometState.output.at(-1)).toMatch(/^Breakpoint reached at #[0-9A-F]{4} after 2 steps\.$/);

    await act(async () => store.run());
    await waitFor(() => store.cometState.runState === "Finished");
    expect(store.cometState.gr[1]).toBe(3);
  });

  it("continuing from a breakpoint does not stop on the same line again", async () => {
    const adda = addressOfLine(4);
    const breakAddresses = new Set([adda]);
    await act(async () => store.run(undefined, { breakAddresses }));
    await waitFor(() => store.cometState.runState === "Stopped");
    await act(async () => store.run(undefined, { breakAddresses }));
    await waitFor(() => store.cometState.runState === "Finished");
    expect(store.runStopReason).toBe("finished");
  });

  it("in microcycle granularity stops only on an instruction boundary", async () => {
    await act(async () => store.setExecutionGranularity("microcycle"));
    await waitFor(() => store.executionGranularity === "microcycle");
    const second = addressOfLine(3);
    await act(async () => store.run(undefined, { breakAddresses: new Set([second]) }));
    await waitFor(() => store.cometState.runState === "Stopped");

    expect(store.cometState.pr).toBe(second);
    expect(["complete", "none"]).toContain(store.cometState.microcycle.phase);
    expect(store.cometState.gr[1]).toBe(1);
    expect(store.cometState.gr[2]).toBe(0);
  });

  it("a run without breakpoints behaves exactly as before", async () => {
    await act(async () => store.run());
    await waitFor(() => store.cometState.runState === "Finished");
    expect(store.runStopReason).toBe("finished");
    expect(store.cometState.output.some((line) => line.startsWith("Breakpoint reached"))).toBe(false);
  });

  it("breakpoints do not change reverse availability or dirtiness", async () => {
    const adda = addressOfLine(4);
    await act(async () => store.run(undefined, { breakAddresses: new Set([adda]) }));
    await waitFor(() => store.cometState.runState === "Stopped");
    expect(store.isSourceDirty).toBe(false);
    expect(store.cometState.reverseInstructionAvailability.available).toBe(true);
  });
});
