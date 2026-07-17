// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import MemoryPanel from "../components/MemoryPanel";
import SourceMapPanel from "../components/SourceMapPanel";
import TracePanel from "../components/TracePanel";
import { mockCaslCore } from "../core/mockCaslCore";
import type { CometState } from "../core/types";
import { I18nProvider } from "../i18n/I18nProvider";
import { appStoreReducer, createInitialAppState } from "../store/useAppStore";
import { transpileCppToCasl } from "../transpiler/cppTranspiler";

const source = `int main() {
    double x = 3.5;
    double y = -1.25;
    y = x;
    return 0;
}`;

let root: Root;
let container: HTMLDivElement;

function runToEnd(caslSource: string): CometState {
  let state = mockCaslCore.assemble(caslSource);
  for (let step = 0; step < 200 && state.runState !== "Finished" && state.runState !== "Error"; step += 1) {
    state = mockCaslCore.step(state);
  }
  return state;
}

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe("double storage observation UI", () => {
  it("groups four memory rows and decodes current VM memory", async () => {
    const transpiled = transpileCppToCasl(source);
    expect(transpiled.ok).toBe(true);
    const state = runToEnd(transpiled.caslSource);

    await act(async () => root.render(
      <I18nProvider initialLocale="en">
        <MemoryPanel state={state} storageObjects={transpiled.storageObjects} />
      </I18nProvider>
    ));

    expect(container.querySelectorAll('[data-double-object="cpp-storage:main:x"]')).toHaveLength(4);
    expect(container.querySelector('[data-testid="double-value-inspector"]')?.textContent).toContain("400C000000000000");
    expect(container.querySelector('[data-testid="double-value-inspector"]')?.textContent).toContain("3.5");
    expect(container.querySelectorAll(".double-word-strip > span")).toHaveLength(4);
  });

  it.each(["en", "ja", "zh-CN"] as const)("renders technical bits unchanged in %s", async (locale) => {
    const transpiled = transpileCppToCasl(source);
    const state = runToEnd(transpiled.caslSource);
    await act(async () => root.render(
      <I18nProvider initialLocale={locale}>
        <MemoryPanel state={state} storageObjects={transpiled.storageObjects} />
      </I18nProvider>
    ));
    expect(container.textContent).toContain("400C000000000000");
    expect(container.textContent).toContain("binary64");
  });

  it("annotates trace and source mapping with one semantic operation and word index", async () => {
    const transpiled = transpileCppToCasl(source);
    const state = runToEnd(transpiled.caslSource);
    await act(async () => root.render(
      <I18nProvider initialLocale="en">
        <TracePanel state={state} storageObjects={transpiled.storageObjects} cppToCaslMapping={transpiled.mapping} />
        <SourceMapPanel state={state} cppToCaslMapping={transpiled.mapping} />
      </I18nProvider>
    ));
    expect(container.querySelectorAll('[data-testid="trace-double-operation"]').length).toBeGreaterThanOrEqual(8);
    expect(container.textContent).toContain("double copy assignment: y = x");
    expect(container.textContent).toContain("word 4 / 4");
  });

  it("invalidates non-persistent storage metadata on source edit", () => {
    const transpiled = transpileCppToCasl(source);
    const initial = createInitialAppState();
    const assembled = appStoreReducer(initial, {
      type: "assembled",
      sourceUnitId: initial.currentDocument.sourceUnitId,
      sourceText: source,
      cometState: runToEnd(transpiled.caslSource),
      assembleStatus: "success",
      generatedCaslSource: transpiled.caslSource,
      cppToCaslMapping: transpiled.mapping,
      cppStorageObjects: transpiled.storageObjects
    });
    expect(assembled.cppStorageObjects).toHaveLength(2);
    expect(assembled.cppStorageObjects[0].sourceUnitId).toBe(initial.currentDocument.sourceUnitId);

    const edited = appStoreReducer(assembled, { type: "setSourceText", sourceText: `${source}\n` });
    expect(edited.cppStorageObjects).toEqual([]);
    expect(edited.isSourceDirty).toBe(true);
  });
});
