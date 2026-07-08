// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import DemoGuidePanel from "../components/DemoGuidePanel";
import OutputPanel from "../components/OutputPanel";
import { mockCaslCore } from "../core/mockCaslCore";
import { demoPrograms, getDemoProgram } from "../examples/demoPrograms";
import { appStoreReducer, createInitialAppState, prepareSourceForCoreAssembly } from "../store/useAppStore";
import { transpileCppToCasl } from "../transpiler/cppTranspiler";

let root: Root | null = null;
let container: HTMLDivElement | null = null;

async function renderOutputPanel(element: React.ReactElement) {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(element);
  });
}

describe("demo recording experience", () => {
  afterEach(async () => {
    await act(async () => {
      root?.unmount();
    });
    root = null;
    container?.remove();
    container = null;
  });

  it("example_programs_exist", () => {
    expect(demoPrograms.map((program) => program.name)).toEqual([
      "CASL: GR2 Addition",
      "C++: Addition",
      "C++: If Else",
      "C++: While Sum",
      "C++: For Sum",
      "C++: For Sum Sugar"
    ]);
  });

  it("selecting_casl_example_sets_casl_mode", () => {
    const program = getDemoProgram("casl-gr2-addition");
    expect(program).toBeDefined();

    const state = appStoreReducer(createInitialAppState(), { type: "demoProgramSelected", program: program! });

    expect(state.sourceMode).toBe("casl");
    expect(state.sourceText).toContain("LD    GR2,A");
  });

  it("selecting_cpp_example_sets_cpp_mode", () => {
    const program = getDemoProgram("cpp-addition");
    expect(program).toBeDefined();

    const state = appStoreReducer(createInitialAppState(), { type: "demoProgramSelected", program: program! });

    expect(state.sourceMode).toBe("cpp");
    expect(state.sourceText).toContain("int main()");
  });

  it("selecting_example_marks_dirty", () => {
    const program = getDemoProgram("cpp-if-else");
    expect(program).toBeDefined();

    const state = appStoreReducer(createInitialAppState(), { type: "demoProgramSelected", program: program! });

    expect(state.isSourceDirty).toBe(true);
    expect(state.assembleResult).toBeNull();
    expect(state.cometState.runState).toBe("Dirty");
  });

  it("generated_casl_visible_after_cpp_assemble", async () => {
    const result = transpileCppToCasl(getDemoProgram("cpp-addition")!.source);
    expect(result.ok).toBe(true);

    await renderOutputPanel(
      <OutputPanel
        lines={["Assemble succeeded."]}
        generatedCaslSource={result.caslSource}
        cppToCaslMapping={result.mapping}
        sourceMode="cpp"
        autoOpenGenerated
        onClear={() => undefined}
      />
    );

    expect(container?.querySelector('[data-testid="generated-casl-output"]')?.textContent).toContain("generated from the C++ subset source");
    expect(container?.querySelector('[data-testid="generated-casl-output"]')?.textContent).toContain("ADDA");
  });

  it("demo_while_sum_run_finishes", () => {
    const program = getDemoProgram("cpp-while-sum");
    expect(program).toBeDefined();
    const prepared = prepareSourceForCoreAssembly(program!.source, "cpp");
    expect(prepared.ok).toBe(true);

    let state = mockCaslCore.assemble(prepared.coreSourceText);
    for (let step = 0; step < 100 && state.runState !== "Finished"; step += 1) {
      state = mockCaslCore.step(state);
    }

    expect(state.runState).toBe("Finished");
    expect(state.gr[0]).toBe(0x0006);
  });

  it("demo_for_sum_run_finishes", () => {
    const program = getDemoProgram("cpp-for-sum");
    expect(program).toBeDefined();
    const prepared = prepareSourceForCoreAssembly(program!.source, "cpp");
    expect(prepared.ok).toBe(true);

    let state = mockCaslCore.assemble(prepared.coreSourceText);
    for (let step = 0; step < 120 && state.runState !== "Finished"; step += 1) {
      state = mockCaslCore.step(state);
    }

    expect(state.runState).toBe("Finished");
    expect(state.gr[0]).toBe(0x0006);
  });

  it("demo_for_sum_sugar_run_finishes", () => {
    const program = getDemoProgram("cpp-for-sum-sugar");
    expect(program).toBeDefined();
    const prepared = prepareSourceForCoreAssembly(program!.source, "cpp");
    expect(prepared.ok).toBe(true);

    let state = mockCaslCore.assemble(prepared.coreSourceText);
    for (let step = 0; step < 120 && state.runState !== "Finished"; step += 1) {
      state = mockCaslCore.step(state);
    }

    expect(state.runState).toBe("Finished");
    expect(state.gr[0]).toBe(0x0006);
  });

  it("demo_guide_displays_expected_result", () => {
    const program = getDemoProgram("cpp-while-sum");
    expect(program).toBeDefined();

    const markup = renderToStaticMarkup(<DemoGuidePanel program={program!} />);

    expect(markup).toContain('data-testid="demo-guide"');
    expect(markup).toContain("SUM = 0006");
    expect(markup).toContain("GR0 = 0006");
  });
});
