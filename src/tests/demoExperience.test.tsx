// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import DemoGuidePanel from "../components/DemoGuidePanel";
import OutputPanel from "../components/OutputPanel";
import { mockCaslCore } from "../core/mockCaslCore";
import { demoPrograms, getDemoProgram } from "../examples/demoPrograms";
import { getLearningLesson } from "../examples/learningLessons";
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
      "CASL: Logic Operations",
      "CASL: Logical Add Compare",
      "CASL: Shift Operations",
      "CASL: Index Addressing",
      "CASL: Push Pop Stack",
      "CASL: Call Return",
      "CASL: Nested Call Return",
      "C++: Function Call",
      "C++: Function Argument",
      "C++: Function Arguments",
      "C++: Addition",
      "C++: If Else",
      "C++: While Sum",
      "C++: For Sum",
      "C++: For Sum Sugar",
      "C++: Break Continue"
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

  it("demo_break_continue_run_finishes", () => {
    const program = getDemoProgram("cpp-break-continue");
    expect(program).toBeDefined();
    const prepared = prepareSourceForCoreAssembly(program!.source, "cpp");
    expect(prepared.ok).toBe(true);

    let state = mockCaslCore.assemble(prepared.coreSourceText);
    for (let step = 0; step < 200 && state.runState !== "Finished"; step += 1) {
      state = mockCaslCore.step(state);
    }

    expect(state.runState).toBe("Finished");
    expect(state.gr[0]).toBe(0x0004);
  });

  it("demo_cpp_function_call_run_finishes", () => {
    const program = getDemoProgram("cpp-function-call");
    expect(program).toBeDefined();
    const prepared = prepareSourceForCoreAssembly(program!.source, "cpp");
    expect(prepared.ok).toBe(true);
    expect(prepared.generatedCaslSource).toContain("FUNC_ADDONE");
    expect(prepared.generatedCaslSource).toContain("CALL  FUNC_ADDONE");

    let state = mockCaslCore.assemble(prepared.coreSourceText);
    for (let step = 0; step < 100 && state.runState !== "Finished"; step += 1) {
      state = mockCaslCore.step(state);
    }

    expect(state.runState).toBe("Finished");
    expect(state.gr[0]).toBe(0x0001);
    expect(state.trace.some((event) => event.instruction === "CALL")).toBe(true);
  });

  it("demo_cpp_function_argument_run_finishes", () => {
    const program = getDemoProgram("cpp-function-argument");
    expect(program).toBeDefined();
    const prepared = prepareSourceForCoreAssembly(program!.source, "cpp");
    expect(prepared.ok).toBe(true);
    expect(prepared.generatedCaslSource).toContain("LAD   GR1,5");
    expect(prepared.generatedCaslSource).toContain("CALL  FUNC_ADDONE");
    expect(prepared.generatedCaslSource).toContain("ST    GR1,FUNC_ADDONE_X");

    let state = mockCaslCore.assemble(prepared.coreSourceText);
    for (let step = 0; step < 120 && state.runState !== "Finished"; step += 1) {
      state = mockCaslCore.step(state);
    }

    expect(state.runState).toBe("Finished");
    expect(state.gr[0]).toBe(0x0006);
    expect(state.memory[state.symbols.MAIN_Y]).toBe(0x0006);
  });

  it("demo_cpp_function_arguments_run_finishes", () => {
    const program = getDemoProgram("cpp-function-arguments");
    expect(program).toBeDefined();
    const prepared = prepareSourceForCoreAssembly(program!.source, "cpp");
    expect(prepared.ok).toBe(true);
    expect(prepared.generatedCaslSource).toContain("LAD   GR1,2");
    expect(prepared.generatedCaslSource).toContain("LAD   GR2,3");
    expect(prepared.generatedCaslSource).toContain("CALL  FUNC_ADD");
    expect(prepared.generatedCaslSource).toContain("ST    GR1,FUNC_ADD_A");
    expect(prepared.generatedCaslSource).toContain("ST    GR2,FUNC_ADD_B");

    let state = mockCaslCore.assemble(prepared.coreSourceText);
    for (let step = 0; step < 140 && state.runState !== "Finished"; step += 1) {
      state = mockCaslCore.step(state);
    }

    expect(state.runState).toBe("Finished");
    expect(state.gr[0]).toBe(0x0005);
    expect(state.memory[state.symbols.MAIN_RESULT]).toBe(0x0005);
  });

  it("demo_guide_displays_expected_result", () => {
    const program = getDemoProgram("cpp-while-sum");
    expect(program).toBeDefined();

    const markup = renderToStaticMarkup(<DemoGuidePanel program={program!} />);

    expect(markup).toContain('data-testid="demo-guide"');
    expect(markup).toContain("SUM = 0006");
    expect(markup).toContain("GR0 = 0006");
  });

  it("demo_guide_shows_guided_lesson_for_selected_example", () => {
    const program = getDemoProgram("cpp-break-continue");
    const lesson = getLearningLesson("cpp-break-continue");
    expect(program).toBeDefined();
    expect(lesson).toBeDefined();

    const markup = renderToStaticMarkup(<DemoGuidePanel program={program!} lesson={lesson} />);

    expect(markup).toContain('data-testid="guided-lesson"');
    expect(markup).toContain("Guided Lesson");
    expect(markup).toContain("FOR_CONTINUE");
    expect(markup).toContain("FOR_END");
  });

  it("study_mode_shows_lesson_progress", () => {
    const program = getDemoProgram("cpp-addition");
    const lesson = getLearningLesson("cpp-addition");
    expect(program).toBeDefined();
    expect(lesson).toBeDefined();

    const markup = renderToStaticMarkup(
      <DemoGuidePanel
        program={program!}
        lesson={lesson}
        lessonProgress={{ assemble: true, "machine-code": true }}
      />
    );

    expect(markup).toContain('data-testid="study-mode-progress"');
    expect(markup).toContain("2 / 3 steps completed");
  });

  it("study_mode_toggles_step_checkbox", async () => {
    const program = getDemoProgram("cpp-addition");
    const lesson = getLearningLesson("cpp-addition");
    const onToggle = vi.fn();
    expect(program).toBeDefined();
    expect(lesson).toBeDefined();

    await renderOutputPanel(<DemoGuidePanel program={program!} lesson={lesson} onToggleLessonStep={onToggle} />);

    const checkbox = container?.querySelector('[data-testid="study-mode-step-checkbox"]') as HTMLInputElement;
    expect(checkbox).toBeTruthy();

    await act(async () => {
      checkbox.click();
    });

    expect(onToggle).toHaveBeenCalledWith("cpp-addition", "assemble");
  });

  it("study_mode_reset_clears_progress", () => {
    const initial = createInitialAppState();
    const withProgress = appStoreReducer(initial, { type: "lessonStepToggled", exampleId: "cpp-addition", stepId: "assemble" });
    const reset = appStoreReducer(withProgress, { type: "lessonProgressReset", exampleId: "cpp-addition" });

    expect(withProgress.lessonProgress["cpp-addition"].assemble).toBe(true);
    expect(reset.lessonProgress["cpp-addition"]).toBeUndefined();
  });

  it("study_mode_progress_is_per_example", () => {
    let state = createInitialAppState();
    state = appStoreReducer(state, { type: "lessonStepToggled", exampleId: "cpp-addition", stepId: "assemble" });
    state = appStoreReducer(state, { type: "lessonStepToggled", exampleId: "cpp-break-continue", stepId: "open-generated" });

    expect(state.lessonProgress["cpp-addition"].assemble).toBe(true);
    expect(state.lessonProgress["cpp-break-continue"]["open-generated"]).toBe(true);
    expect(state.lessonProgress["cpp-addition"]["open-generated"]).toBeUndefined();
  });

  it("observation_mode_switch_does_not_reset_vm_state", () => {
    const assembled = mockCaslCore.assemble(getDemoProgram("casl-gr2-addition")!.source);
    const initial = appStoreReducer(createInitialAppState(), {
      type: "assembled",
      sourceText: getDemoProgram("casl-gr2-addition")!.source,
      cometState: assembled,
      assembleStatus: "success"
    });
    const switched = appStoreReducer(initial, { type: "observationModeSet", mode: "register-stack" });
    const switchedAgain = appStoreReducer(switched, { type: "observationModeSet", mode: "code-machine" });

    expect(switched.cometState).toBe(initial.cometState);
    expect(switched.cometState.trace).toBe(initial.cometState.trace);
    expect(switched.observationMode).toBe("register-stack");
    expect(switchedAgain.cometState).toBe(initial.cometState);
    expect(switchedAgain.observationMode).toBe("code-machine");
  });

  it("study_mode_shows_recommended_tab", () => {
    const program = getDemoProgram("cpp-break-continue");
    const lesson = getLearningLesson("cpp-break-continue");
    expect(program).toBeDefined();
    expect(lesson).toBeDefined();

    const markup = renderToStaticMarkup(<DemoGuidePanel program={program!} lesson={lesson} />);

    expect(markup).toContain("Recommended tab: Generated CASL");
    expect(markup).toContain("Recommended tab: Machine Code");
    expect(markup).toContain("Recommended tab: Trace");
  });

  it("checkpoint_section_shows_expected_and_where_to_look", () => {
    const program = getDemoProgram("cpp-break-continue");
    const lesson = getLearningLesson("cpp-break-continue");
    expect(program).toBeDefined();
    expect(lesson).toBeDefined();

    const markup = renderToStaticMarkup(<DemoGuidePanel program={program!} lesson={lesson} />);

    expect(markup).toContain("Expected");
    expect(markup).toContain("Where to look");
    expect(markup).toContain("continue should jump to FOR_CONTINUE");
    expect(markup).toContain("break should jump to FOR_END");
  });

  it("demo_guide_shows_no_lesson_for_custom_source", () => {
    const program = getDemoProgram("cpp-addition");
    expect(program).toBeDefined();

    const markup = renderToStaticMarkup(<DemoGuidePanel program={program!} />);

    expect(markup).toContain("No guided lesson for custom source.");
  });

  it("custom_source_shows_no_guided_lesson_and_no_progress", () => {
    const program = getDemoProgram("cpp-addition");
    expect(program).toBeDefined();

    const markup = renderToStaticMarkup(
      <DemoGuidePanel program={program!} lessonProgress={{ assemble: true }} />
    );

    expect(markup).toContain("No guided lesson for custom source.");
    expect(markup).not.toContain("steps completed");
    expect(markup).not.toContain('data-testid="study-mode-step-checkbox"');
  });

  it("about_panel_renders_project_summary", () => {
    const markup = renderToStaticMarkup(<DemoGuidePanel program={getDemoProgram("cpp-break-continue")!} />);

    expect(markup).toContain('data-testid="project-overview"');
    expect(markup).toContain("stugx.CASL");
    expect(markup).toContain("CASL II / COMET II Learning Studio");
  });

  it("about_panel_lists_learning_pipeline", () => {
    const markup = renderToStaticMarkup(<DemoGuidePanel program={getDemoProgram("cpp-break-continue")!} />);

    expect(markup).toContain("C++ subset -&gt; Generated CASL II Assembly -&gt; COMET II Machine Code");
    expect(markup).toContain("opcode explanation");
    expect(markup).toContain("memory, trace, control flow, and circuit state");
  });

  it("about_panel_lists_limitations", () => {
    const markup = renderToStaticMarkup(<DemoGuidePanel program={getDemoProgram("cpp-break-continue")!} />);

    expect(markup).toContain("Not a full C++ compiler");
    expect(markup).toContain("more than three parameters, recursion, stack-frame locals");
    expect(markup).toContain("arrays, pointers, classes, templates");
  });

  it("project_overview_uses_learning_wording", () => {
    const markup = renderToStaticMarkup(<DemoGuidePanel program={getDemoProgram("cpp-break-continue")!} />);

    expect(markup).toContain("What this tool helps you learn");
    expect(markup).toContain("Recommended examples");
    expect(markup.toLowerCase()).not.toContain("hackathon");
    expect(markup.toLowerCase()).not.toContain("contest");
  });

  it("examples_are_ordered_for_learning", () => {
    expect(demoPrograms.map((program) => program.id)).toEqual([
      "casl-gr2-addition",
      "casl-logic-operations",
      "casl-logical-add-compare",
      "casl-shift-operations",
      "casl-index-addressing",
      "casl-push-pop-stack",
      "casl-call-return",
      "casl-nested-call-return",
      "cpp-function-call",
      "cpp-function-argument",
      "cpp-function-arguments",
      "cpp-addition",
      "cpp-if-else",
      "cpp-while-sum",
      "cpp-for-sum",
      "cpp-for-sum-sugar",
      "cpp-break-continue"
    ]);
  });

  it("demo_examples_have_complete_metadata", () => {
    for (const program of demoPrograms) {
      expect(program.id).not.toHaveLength(0);
      expect(program.name).not.toHaveLength(0);
      expect(program.source).not.toHaveLength(0);
      expect(program.description).not.toHaveLength(0);
      expect(program.whatThisShows).not.toHaveLength(0);
      expect(program.expectedResult).not.toHaveLength(0);
      expect(program.suggestedActions.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("examples_have_learning_actions", () => {
    const actions = demoPrograms.flatMap((program) => program.suggestedActions).join(" ");

    expect(actions).toContain("Click Assemble.");
    expect(actions).toContain("Open Generated CASL");
    expect(actions).toContain("Open Machine Code");
    expect(actions).toContain("Trace");
    expect(actions).toContain("Memory");
  });
});
