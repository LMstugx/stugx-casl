// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import CircuitFocusLayout from "../components/CircuitFocusLayout";
import InspectorPanel from "../components/InspectorPanel";
import MemoryPanel from "../components/MemoryPanel";
import OutputPanel from "../components/OutputPanel";
import RegisterPanel from "../components/RegisterPanel";
import StatusBar from "../components/StatusBar";
import Toolbar from "../components/Toolbar";
import TracePanel from "../components/TracePanel";
import { mockCaslCore } from "../core/mockCaslCore";
import type { CometState } from "../core/types";
import { getDemoProgram } from "../examples/demoPrograms";
import { prepareSourceForCoreAssembly, type ObservationMode } from "../store/useAppStore";

const gr2Source = getDemoProgram("casl-gr2-addition")!.source;
const pushPopSource = getDemoProgram("casl-push-pop-stack")!.source;
const callReturnSource = getDemoProgram("casl-call-return")!.source;
const nestedCallReturnSource = getDemoProgram("casl-nested-call-return")!.source;
const appCss = readFileSync("src/styles/app.css", "utf8");
const timelineItems = [
  { key: "ready", index: 0, label: "Ready", phase: "completed" },
  { key: "ld", index: 1, label: "LD", phase: "current" },
  { key: "adda", index: 2, label: "ADDA", phase: "pending" },
];

function renderFocus(state: CometState, sourceText = gr2Source, observationMode: ObservationMode = "cpu-flow"): string {
  return renderToStaticMarkup(
    <CircuitFocusLayout
      state={state}
      sourceMode="casl"
      sourceText={sourceText}
      generatedCaslSource=""
      cppToCaslMapping={[]}
      isSourceDirty={false}
      timelineItems={timelineItems}
      observationMode={observationMode}
    />
  );
}

function renderCppFocus(
  state: CometState,
  sourceText: string,
  generatedCaslSource: string,
  mapping: ReturnType<typeof prepareSourceForCoreAssembly>["mapping"],
  observationMode: ObservationMode = "cpu-flow"
): string {
  return renderToStaticMarkup(
    <CircuitFocusLayout
      state={state}
      sourceMode="cpp"
      sourceText={sourceText}
      generatedCaslSource={generatedCaslSource}
      cppToCaslMapping={mapping}
      isSourceDirty={false}
      timelineItems={timelineItems}
      observationMode={observationMode}
    />
  );
}

function activeWireIds(markup: string): string[] {
  return Array.from(markup.matchAll(/data-active="true" data-path-id="([^"]+)"/g)).map((match) => match[1]);
}

function stepTimes(count: number): CometState {
  let state = mockCaslCore.assemble(gr2Source);
  for (let index = 0; index < count; index += 1) {
    state = mockCaslCore.step(state);
  }
  return state;
}

function stepSource(source: string, count: number): CometState {
  let state = mockCaslCore.assemble(source);
  for (let index = 0; index < count; index += 1) {
    state = mockCaslCore.step(state);
  }
  return state;
}

function currentPanel(markup: string): string {
  return /data-testid="focus-current-instruction-panel"[\s\S]*?<\/section>/.exec(markup)?.[0] ?? "";
}

function programCurrentLine(markup: string): string {
  return /data-testid="focus-program-current-line"[\s\S]*?<\/div>/.exec(markup)?.[0] ?? "";
}

function sourceContext(markup: string): string {
  return /data-testid="focus-source-context-text"[^>]*>([\s\S]*?)<\/code>/.exec(markup)?.[1] ?? "";
}

function traceLatest(markup: string): string {
  return /data-testid="focus-trace-latest"[\s\S]*?<\/article>/.exec(markup)?.[0] ?? "";
}

function expectFocusAligned(markup: string, instruction: string, line: number, address: string): void {
  expect(programCurrentLine(markup).replace(/\s+/g, " ")).toContain(instruction);
  expect(currentPanel(markup)).toContain(instruction.split(/\s+/)[0]);
  expect(markup).toContain(`data-testid="source-map-highlight" data-current-line="${line}"`);
  expect(markup).toContain(`Addr ${address}`);
  expect(markup).toContain(`CASL ${instruction}`);
  expect(sourceContext(markup).replace(/\s+/g, " ")).toContain(instruction);
  expect(traceLatest(markup)).toContain(instruction.split(/\s+/)[0]);
}

describe("Circuit Focus Mode layout", () => {
  it("observation_mode_selector_renders", () => {
    const markup = renderFocus(mockCaslCore.assemble(gr2Source));

    expect(markup).toContain('data-testid="observation-mode-selector"');
    expect(markup).toContain('role="tablist" aria-label="Observation mode"');
    expect(markup).toContain('data-testid="observation-mode-cpu-flow"');
    expect(markup).toContain('data-testid="observation-mode-register-stack"');
    expect(markup).toContain('data-testid="observation-mode-code-machine"');
  });

  it("observation_mode_buttons_are_accessible", () => {
    const markup = renderFocus(mockCaslCore.assemble(gr2Source), gr2Source, "register-stack");

    expect(markup).toContain('aria-label="Observation mode: CPU Flow"');
    expect(markup).toContain('aria-label="Observation mode: Registers / Stack"');
    expect(markup).toContain('aria-label="Observation mode: Code / Machine"');
    expect(markup).toContain('role="tab"');
    expect(markup).toContain('aria-selected="true"');
  });

  it("focus_mode_layout_renders_program_display_instruction", () => {
    const markup = renderFocus(mockCaslCore.assemble(gr2Source));

    expect(markup).toContain('data-testid="circuit-focus-layout"');
    expect(markup).toContain('data-testid="focus-program-panel"');
    expect(markup).toContain('data-testid="focus-display-panel"');
    expect(markup).toContain("No output");
    expect(markup).toContain('data-testid="focus-current-instruction-panel"');
  });

  it("focus_mode_current_instruction_is_primary_left_info", () => {
    const markup = renderFocus(stepTimes(1));

    expect(markup.indexOf('data-testid="focus-program-panel"')).toBeLessThan(markup.indexOf('data-testid="focus-current-instruction-panel"'));
    expect(markup.indexOf('data-testid="focus-current-instruction-panel"')).toBeLessThan(markup.indexOf('data-testid="focus-display-panel"'));
    expect(markup).toContain('class="panel focus-current-panel"');
    expect(markup).toContain('data-testid="focus-current-mnemonic"');
    expect(currentPanel(markup)).toContain("LD");
    expect(currentPanel(markup)).toContain("Current 0020");
  });

  it("current_instruction_uses_layered_structure", () => {
    const markup = renderFocus(stepTimes(1));
    const current = currentPanel(markup);

    expect(current).toContain("focus-current-header");
    expect(current).toContain("focus-current-semantic");
    expect(current).toContain("focus-current-runtime");
    expect(current).toContain('data-testid="focus-current-runtime-summary"');
    expect(current).toContain("aria-label=\"Current 0020");
  });

  it("focus_mode_aligns_program_current_instruction_sourcemap_and_source_context", () => {
    const state = stepTimes(1);
    const markup = renderFocus(state);
    const normalizedProgram = programCurrentLine(markup).replace(/\s+/g, " ");
    const normalizedSourceContext = sourceContext(markup).replace(/\s+/g, " ");

    expect(normalizedProgram).toContain("LD GR2,A");
    expect(normalizedProgram).not.toContain("ADDA GR2,B");
    expect(currentPanel(markup)).toContain("LD");
    expect(currentPanel(markup)).toContain("Current 0020");
    expect(currentPanel(markup)).toContain("Next PR 0022");
    expect(currentPanel(markup)).toContain("Next ADDA GR2,B");
    expect(currentPanel(markup)).not.toContain(">Ready<");
    expect(markup).toContain('data-testid="source-map-highlight" data-current-line="2"');
    expect(markup).toContain("Addr 0020");
    expect(normalizedSourceContext).toContain("LD GR2,A");
  });

  it("focus_mode_current_instruction_aligns_for_ld_adda_and_st", () => {
    expectFocusAligned(renderFocus(stepTimes(1)), "LD GR2,A", 2, "0020");
    expectFocusAligned(renderFocus(stepTimes(2)), "ADDA GR2,B", 3, "0022");
    expectFocusAligned(renderFocus(stepTimes(3)), "ST GR2,C", 4, "0024");
  });

  it("focus_mode_footer_distinguishes_current_and_next", () => {
    const state = stepTimes(1);
    const markup = renderToStaticMarkup(<StatusBar state={state} backendInfo={{ kind: "mock", label: "Mock Core", status: "ready" }} />);

    expect(markup).toContain("Machine: ");
    expect(markup).toContain(">Ready<");
    expect(markup).toContain("Current: LD GR2,A");
    expect(markup).toContain("Next PR: 0022");
    expect(markup).toContain("Next Instruction: ADDA GR2,B");
  });

  it("focus_mode_separates_machine_state_and_pipeline_stage", () => {
    const markup = renderFocus(stepTimes(3));

    expect(currentPanel(markup)).toContain("Write Back");
    expect(markup).toContain("Pipeline: Write Back");
    expect(markup).toContain("Machine: Ready");
  });

  it("focus_mode_renders_circuit_as_primary_panel", () => {
    const markup = renderFocus(mockCaslCore.assemble(gr2Source));

    expect(markup).toContain('data-testid="focus-circuit-panel"');
    expect(markup).toContain("Circuit Focus Mode");
    expect(markup).toContain('data-testid="comet-circuit-svg"');
  });

  it("cpu_flow_mode_prioritizes_circuit", () => {
    const markup = renderFocus(mockCaslCore.assemble(gr2Source));

    expect(markup).toContain('data-observation-mode="cpu-flow"');
    expect(markup).toContain('data-testid="focus-circuit-panel"');
    expect(markup).toContain('data-testid="focus-memory-window"');
    expect(markup).toContain('data-testid="focus-signal-probe"');
    expect(markup).toContain('data-testid="focus-trace-panel"');
    expect(markup).not.toContain('data-testid="focus-register-bank"');
  });

  it("cpu_flow_mode_shows_memory_5_to_10_rows", () => {
    const markup = renderFocus(stepTimes(1));

    expect(markup).toContain('data-testid="focus-memory-window"');
    const rowCount = (markup.match(/data-testid="focus-memory-window-row"/g) ?? []).length;
    expect(rowCount).toBeGreaterThanOrEqual(5);
    expect(rowCount).toBeLessThanOrEqual(10);
  });

  it("register_stack_mode_shows_all_gr_registers", () => {
    const markup = renderFocus(mockCaslCore.assemble(gr2Source), gr2Source, "register-stack");

    expect(markup).toContain('data-testid="focus-register-bank"');
    for (let index = 0; index <= 7; index += 1) {
      expect(markup).toContain(`data-testid="register-gr${index}"`);
    }
  });

  it("register_stack_mode_shows_pr_sp_fr", () => {
    const markup = renderFocus(mockCaslCore.assemble(gr2Source), gr2Source, "register-stack");

    expect(markup).toContain('data-testid="register-pr"');
    expect(markup).toContain('data-testid="register-sp"');
    expect(markup).toContain('data-testid="register-fr"');
  });

  it("register_stack_mode_shows_stack_preview", () => {
    const markup = renderFocus(mockCaslCore.assemble(gr2Source), gr2Source, "register-stack");

    expect(markup).toContain('data-testid="focus-stack-preview"');
    expect(markup).toContain("Stack Preview");
  });

  it("register_stack_mode_shows_memory_5_to_10_rows", () => {
    const markup = renderFocus(stepTimes(1), gr2Source, "register-stack");
    const rowCount = (markup.match(/data-testid="focus-memory-window-row"/g) ?? []).length;

    expect(markup).toContain('data-testid="focus-register-stack-dashboard"');
    expect(rowCount).toBeGreaterThanOrEqual(5);
    expect(rowCount).toBeLessThanOrEqual(10);
  });

  it("code_machine_mode_shows_generated_casl_machine_code_and_trace_mapping", () => {
    const markup = renderFocus(stepTimes(1), gr2Source, "code-machine");

    expect(markup).toContain('data-testid="focus-generated-casl-panel"');
    expect(markup).toContain('data-testid="focus-machine-code-panel"');
    expect(markup).toContain('data-testid="focus-source-mapping-panel"');
    expect(markup).toContain('data-testid="focus-trace-panel"');
    expect(markup).toContain("LD GR2,A");
  });

  it("code_machine_mode_uses_single_mapping_panel_to_prevent_density_overflow", () => {
    const markup = renderFocus(stepTimes(1), gr2Source, "code-machine");

    expect(markup.match(/data-testid="focus-source-mapping-panel"/g)).toHaveLength(1);
  });

  it("focus_mode_step_timeline_visible", () => {
    const markup = renderFocus(mockCaslCore.assemble(gr2Source));

    expect(markup).toContain('data-testid="focus-step-timeline"');
    expect(markup).toContain("Fetch");
    expect(markup).toContain("Operand Read");
    expect(markup).toContain("Write Back");
  });

  it("focus_mode_sp_visible_but_not_active", () => {
    const markup = renderFocus(mockCaslCore.assemble(gr2Source));

    expect(markup).toContain('data-testid="module-sp"');
    expect(markup).toContain('data-testid="module-sp" data-active="false"');
    expect(markup).toContain('data-testid="sp-anchor-output"');
    expect(markup).toContain('data-testid="sp-anchor-adjust"');
    expect(activeWireIds(markup)).not.toContain("sp-to-mar-preview");
    expect(activeWireIds(markup)).not.toContain("mar-to-stack-memory-preview");
  });

  it("stack_preview_renders_sp_value", () => {
    const markup = renderFocus(mockCaslCore.assemble(gr2Source), gr2Source, "register-stack");

    expect(markup).toContain('data-testid="focus-stack-preview"');
    expect(markup).toContain("Stack Preview");
    expect(markup).toContain("Stack path preview only.");
    expect(markup).toContain("SP FFFE");
    expect(markup).toContain('data-sp="true"');
  });

  it("stack_preview_renders_nearby_memory_window", () => {
    const markup = renderFocus(mockCaslCore.assemble(gr2Source), gr2Source, "register-stack");

    expect((markup.match(/data-testid="stack-preview-row"/g) ?? []).length).toBe(7);
    expect(markup).toContain('data-address="FFFC"');
    expect(markup).toContain('data-address="FFFD"');
    expect(markup).toContain('data-address="FFFE" data-sp="true"');
    expect(markup).toContain('data-address="FFFF"');
    expect(markup).toContain('data-address="0000"');
  });

  it("stack_preview_does_not_render_full_memory", () => {
    const markup = renderFocus(mockCaslCore.assemble(gr2Source), gr2Source, "register-stack");

    expect((markup.match(/data-testid="stack-preview-row"/g) ?? []).length).toBeLessThan(16);
    expect(markup).not.toContain('data-address="0020" data-sp="true"');
  });

  it("stack_path_guide_is_inactive_by_default", () => {
    const markup = renderFocus(stepTimes(1));

    expect(markup).toContain('data-testid="wire-guide-sp-to-mar-preview"');
    expect(markup).toContain('data-testid="wire-guide-mar-to-stack-memory-preview"');
    expect(markup).toContain('data-active="false" data-path-id="sp-to-mar-preview"');
    expect(markup).toContain('data-active="false" data-path-id="mar-to-stack-memory-preview"');
    expect(activeWireIds(markup)).not.toContain("sp-to-mar-preview");
    expect(activeWireIds(markup)).not.toContain("mar-to-stack-memory-preview");
  });

  it("circuit_push_activates_sp_memory_write", () => {
    const state = stepSource(pushPopSource, 2);
    const markup = renderFocus(state, pushPopSource);

    expect(markup).toContain('data-testid="module-sp" data-active="true"');
    expect(markup).toContain('data-testid="effective-address-unit" data-active="true"');
    expect(activeWireIds(markup)).toEqual(expect.arrayContaining(["base-to-eau", "eau-to-mdr", "sp-to-mar-preview", "mar-to-memory", "mdr-to-memory"]));
    expect(markup).toContain('data-testid="memory-row-FFFD"');
    expect(markup).toContain('data-write="true"');
    expect(markup).toContain("SP: FFFE -&gt; FFFD");
  });

  it("circuit_pop_activates_sp_memory_read_gr_write", () => {
    const state = stepSource(pushPopSource, 3);
    const markup = renderFocus(state, pushPopSource);

    expect(markup).toContain('data-testid="module-sp" data-active="true"');
    expect(markup).toContain('data-testid="register-gr1" data-active="true"');
    expect(activeWireIds(markup)).toEqual(expect.arrayContaining(["sp-to-mar-preview", "mar-to-memory", "memory-to-mdr", "mdr-to-gr"]));
    expect(markup).toContain('data-testid="memory-row-FFFD"');
    expect(markup).toContain('data-read="true"');
    expect(markup).toContain("Read MEM[FFFD]");
  });

  it("circuit_call_activates_sp_memory_write_pr_target", () => {
    const state = stepSource(callReturnSource, 2);
    const markup = renderFocus(state, callReturnSource);

    expect(markup).toContain('data-testid="module-sp" data-active="true"');
    expect(markup).toContain('data-testid="module-pr" data-active="true"');
    expect(markup).toContain('data-testid="effective-address-unit" data-active="true"');
    expect(activeWireIds(markup)).toEqual(expect.arrayContaining(["pr-to-plus2", "return-address-to-mdr", "sp-to-mar-preview", "mar-to-memory", "mdr-to-memory", "base-to-eau", "eau-to-pr"]));
    expect(markup).toContain('data-testid="memory-row-FFFD"');
    expect(markup).toContain('data-write="true"');
    expect(markup).toContain("return 0024");
    expect(markup).toContain("Call depth");
  });

  it("call_stack_view_shows_call_depth_and_top_return_address", () => {
    const state = stepSource(callReturnSource, 2);
    const markup = renderFocus(state, callReturnSource, "register-stack");

    expect(markup).toContain('data-testid="focus-call-stack"');
    expect(markup).toContain('data-testid="call-stack-depth">1</code>');
    expect(markup).toContain('data-testid="call-stack-return-address">0024</code>');
    expect(markup).toContain("MEM[FFFD]");
    expect(markup).toContain('data-testid="call-stack-routine">SUB</code>');
    expect(markup).toContain('data-testid="call-stack-ret-mode">Stack return</code>');
    expect(markup).toContain("Call target SUB; return 0024");
  });

  it("call_stack_view_updates_for_cpp_function_call", () => {
    const program = getDemoProgram("cpp-function-call");
    expect(program).toBeDefined();
    const prepared = prepareSourceForCoreAssembly(program!.source, "cpp");
    expect(prepared.ok).toBe(true);
    let rawState = mockCaslCore.assemble(prepared.coreSourceText);
    rawState = mockCaslCore.step(rawState);

    const markup = renderCppFocus(rawState, program!.source, prepared.generatedCaslSource, prepared.mapping, "register-stack");

    expect(markup).toContain('data-testid="call-stack-depth">1</code>');
    expect(markup).toContain('data-testid="call-stack-routine">FUNC_ADDONE</code>');
    expect(markup).toContain("Call target FUNC_ADDONE");
  });

  it("call_stack_view_updates_for_single_argument_function", () => {
    const program = getDemoProgram("cpp-function-argument");
    expect(program).toBeDefined();
    const prepared = prepareSourceForCoreAssembly(program!.source, "cpp");
    expect(prepared.ok).toBe(true);
    let rawState = mockCaslCore.assemble(prepared.coreSourceText);
    rawState = mockCaslCore.step(rawState);
    rawState = mockCaslCore.step(rawState);

    const markup = renderCppFocus(rawState, program!.source, prepared.generatedCaslSource, prepared.mapping, "register-stack");

    expect(markup).toContain('data-testid="call-stack-depth">1</code>');
    expect(markup).toContain('data-testid="call-stack-routine">FUNC_ADDONE</code>');
    expect(markup).toContain("Call target FUNC_ADDONE");
  });

  it("call_stack_view_updates_for_multi_argument_call", () => {
    const program = getDemoProgram("cpp-function-arguments");
    expect(program).toBeDefined();
    const prepared = prepareSourceForCoreAssembly(program!.source, "cpp");
    expect(prepared.ok).toBe(true);
    let rawState = mockCaslCore.assemble(prepared.coreSourceText);
    rawState = mockCaslCore.step(rawState);
    rawState = mockCaslCore.step(rawState);
    rawState = mockCaslCore.step(rawState);

    const markup = renderCppFocus(rawState, program!.source, prepared.generatedCaslSource, prepared.mapping, "register-stack");

    expect(markup).toContain('data-testid="call-stack-depth">1</code>');
    expect(markup).toContain('data-testid="call-stack-routine">FUNC_ADD</code>');
    expect(markup).toContain("Call target FUNC_ADD");
  });

  it("call_stack_view_shows_top_level_ret_mode", () => {
    const state = mockCaslCore.assemble(gr2Source);
    const markup = renderFocus(state, gr2Source, "register-stack");

    expect(markup).toContain('data-testid="focus-call-stack"');
    expect(markup).toContain('data-testid="call-stack-depth">0</code>');
    expect(markup).toContain('data-testid="call-stack-return-address">none</code>');
    expect(markup).toContain('data-testid="call-stack-ret-mode">Top-level finish</code>');
    expect(markup).toContain("Program finish");
  });

  it("call_stack_view_shows_stack_return_mode", () => {
    const state = stepSource(callReturnSource, 4);
    const markup = renderFocus(state, callReturnSource, "register-stack");

    expect(markup).toContain('data-testid="call-stack-depth">0</code>');
    expect(markup).toContain('data-testid="call-stack-return-address">0024</code>');
    expect(markup).toContain('data-testid="call-stack-ret-mode">Stack return</code>');
    expect(markup).toContain("Return to 0024 from MEM[FFFD]");
  });

  it("nested_call_demo_shows_depth_two_and_lifo_return_order", () => {
    const afterSecondCall = stepSource(nestedCallReturnSource, 3);
    const afterSub2Ret = stepSource(nestedCallReturnSource, 5);
    const depthMarkup = renderFocus(afterSecondCall, nestedCallReturnSource, "register-stack");
    const retMarkup = renderFocus(afterSub2Ret, nestedCallReturnSource, "register-stack");

    expect(depthMarkup).toContain('data-testid="call-stack-depth">2</code>');
    expect(depthMarkup).toContain('data-testid="call-stack-return-address">0029</code>');
    expect(depthMarkup).toContain('data-testid="call-stack-routine">SUB2</code>');
    expect(retMarkup).toContain('data-testid="call-stack-depth">1</code>');
    expect(retMarkup).toContain("Return to 0029 from MEM[FFFC]");
  });

  it("circuit_stack_ret_activates_sp_memory_read_pr", () => {
    const state = stepSource(callReturnSource, 4);
    const markup = renderFocus(state, callReturnSource);

    expect(markup).toContain('data-testid="module-sp" data-active="true"');
    expect(markup).toContain('data-testid="module-pr" data-active="true"');
    expect(activeWireIds(markup)).toEqual(expect.arrayContaining(["sp-to-mar-preview", "mar-to-memory", "memory-to-mdr", "mdr-to-pr"]));
    expect(markup).toContain('data-testid="memory-row-FFFD"');
    expect(markup).toContain('data-read="true"');
    expect(markup).toContain("RET stack return");
    expect(markup).toContain("Return address");
  });

  it("circuit_top_level_ret_does_not_activate_sp", () => {
    const state = stepSource(gr2Source, 4);
    const markup = renderFocus(state, gr2Source);

    expect(markup).toContain('data-testid="module-sp" data-active="false"');
    expect(activeWireIds(markup)).not.toContain("sp-to-mar-preview");
    expect(activeWireIds(markup)).not.toContain("memory-to-mdr");
    expect(markup).toContain("RET top-level finish");
  });

  it("non_stack_instructions_do_not_activate_sp", () => {
    for (const state of [stepTimes(1), stepTimes(2), stepTimes(3)]) {
      const markup = renderFocus(state);
      expect(markup).toContain('data-testid="module-sp" data-active="false"');
      expect(activeWireIds(markup)).not.toContain("sp-to-mar-preview");
    }
  });

  it("focus_mode_memory_row_arrow_visible and focus_mode_gr_row_arrow_visible", () => {
    const state = mockCaslCore.step(mockCaslCore.assemble(gr2Source));
    const markup = renderFocus(state);

    expect(markup).toContain('data-testid="memory-row-0027"');
    expect(markup).toContain('data-testid="register-gr2" data-active="true"');
    expect(activeWireIds(markup)).toContain("memory-to-mdr");
    expect(activeWireIds(markup)).toContain("mdr-to-gr");
    expect(markup).toContain('data-testid="module-alu" data-active="false"');
  });

  it("circuit_bus_labels_render_data_addr_ctrl", () => {
    const markup = renderFocus(stepTimes(1));

    expect(markup).toContain("DATA BUS");
    expect(markup).toContain("ADDR BUS");
    expect(markup).toContain("CTRL");
    expect(markup).toContain('data-testid="bus-guide-data"');
    expect(markup).toContain('data-testid="bus-guide-addr"');
    expect(markup).toContain('data-testid="bus-guide-ctrl"');
  });

  it("focus_mode_bus_labels_are_subtle and inactive_wires_are_deemphasized", () => {
    const markup = renderFocus(stepTimes(1));

    expect(markup).toContain('class="bus-labels"');
    expect(markup).toContain("DATA BUS");
    expect(markup).toContain("ADDR BUS");
    expect(markup).toContain("CTRL");
    expect(markup).toContain('class="wire wire-data"');
    expect(markup).toContain('data-active="false" data-path-id="memory-to-mdr"');
    expect(markup).toContain('class="wire wire-data wire-active circuit-wire--active circuit-wire--flow circuit-wire--data-flow"');
  });

  it("focus_mode_primary_active_path_is_prominent", () => {
    const markup = renderFocus(stepTimes(2));

    expect(markup).toContain('class="wire wire-data wire-active circuit-wire--active circuit-wire--flow circuit-wire--data-flow"');
    expect(markup).toContain('data-primary="true"');
    expect(markup).toContain('data-semantic-type="data"');
    expect(markup).toContain('marker-end="url(#arrow-red)"');
    expect(markup).not.toContain('marker-mid="url(#arrow-red-mid)"');
  });

  it("circuit_status_indicators_render_without_fake_state", () => {
    const ldMarkup = renderFocus(stepTimes(1));
    const addaMarkup = renderFocus(stepTimes(2));
    const stMarkup = renderFocus(stepTimes(3));

    expect(ldMarkup).toContain('data-testid="status-indicator-read" data-active="true"');
    expect(ldMarkup).toContain('data-testid="status-indicator-write" data-active="false"');
    expect(ldMarkup).toContain('data-testid="status-indicator-exec" data-active="false"');
    expect(addaMarkup).toContain('data-testid="status-indicator-exec" data-active="true"');
    expect(addaMarkup).toContain('data-testid="status-indicator-flag" data-active="true"');
    expect(stMarkup).toContain('data-testid="status-indicator-write" data-active="true"');
    expect(stMarkup).toContain('data-testid="status-indicator-exec" data-active="false"');
  });

  it("focus_mode_status_indicators_are_compact", () => {
    const markup = renderFocus(stepTimes(2));

    expect(markup).toContain('data-testid="circuit-status-indicators"');
    expect(markup).toContain("SIGNALS");
    expect(markup).toContain('data-testid="status-indicator-exec" data-active="true"');
    expect(markup).toContain('data-testid="status-indicator-flag" data-active="true"');
    expect(markup).toContain('data-testid="status-indicator-write" data-active="false"');
  });

  it("circuit_index_path_highlights_index_register_and_effective_memory_row", () => {
    const source = getDemoProgram("casl-index-addressing")!.source;
    const state = stepSource(source, 2);
    const markup = renderFocus(state, source);

    expect(markup).toContain('data-testid="register-gr2" data-active="true"');
    expect(markup).toContain('data-index="true"');
    expect(markup).toContain("IDX");
    expect(markup).toContain('data-testid="effective-address-unit"');
    expect(markup).toContain('data-active="true" data-base-address="0027" data-index-register="GR2" data-effective-address="0028"');
    expect(markup).toContain("Address Unit");
    expect(markup).toContain('data-testid="effective-address-base-row"');
    expect(markup).toContain('data-testid="effective-address-index-row"');
    expect(markup).toContain('data-testid="effective-address-ea-row"');
    expect(markup).toContain("BASE");
    expect(markup).toContain("GR2=0001");
    expect(markup).toContain("EA");
    expect(markup).toContain("GR1 &lt;- memory[A+GR2]");
    expect(markup).toContain('data-testid="memory-row-0028"');
    expect(markup).toContain('data-read="true"');
    expect(activeWireIds(markup)).toContain("base-to-eau");
    expect(activeWireIds(markup)).toContain("index-to-eau");
    expect(activeWireIds(markup)).toContain("eau-to-mar");
    expect(activeWireIds(markup)).not.toContain("index-to-effective");
    expect(markup).toContain('data-testid="signal-probe-row"');
    expect(markup).toContain("base + index");
  });

  it("effective_address_unit_hidden_or_inactive_for_non_index_instruction", () => {
    const markup = renderFocus(stepTimes(1));

    expect(markup).toContain('data-testid="effective-address-unit"');
    expect(markup).toContain('data-testid="effective-address-unit" data-active="false"');
    expect(markup).toContain("bypass");
    expect(activeWireIds(markup)).not.toContain("base-to-eau");
    expect(activeWireIds(markup)).not.toContain("index-to-eau");
    expect(activeWireIds(markup)).not.toContain("eau-to-mar");
  });

  it("eau_rows_are_readable", () => {
    const source = getDemoProgram("casl-index-addressing")!.source;
    const markup = renderFocus(stepSource(source, 2), source);

    expect(markup).toContain('data-testid="effective-address-base-row"');
    expect(markup).toContain('data-testid="effective-address-index-row"');
    expect(markup).toContain('data-testid="effective-address-ea-row"');
    expect(appCss).toContain(".effective-address-row .eau-row-value");
    expect(appCss).toContain("font-size: 10.2px");
  });

  it("eau_index_input_label_visible", () => {
    const source = getDemoProgram("casl-index-addressing")!.source;
    const markup = renderFocus(stepSource(source, 2), source);

    expect(markup).toContain('data-testid="eau-index-input-label"');
    expect(markup).toContain(">INDEX</text>");
  });

  it("eau_base_input_label_visible", () => {
    const source = getDemoProgram("casl-index-addressing")!.source;
    const markup = renderFocus(stepSource(source, 2), source);

    expect(markup).toContain('data-testid="eau-base-input-label"');
    expect(markup).toContain(">BASE</text>");
  });

  it("eau_output_label_visible", () => {
    const source = getDemoProgram("casl-index-addressing")!.source;
    const markup = renderFocus(stepSource(source, 2), source);

    expect(markup).toContain('data-testid="eau-output-label"');
    expect(markup).toContain(">EA</text>");
  });

  it("non_index_eau_remains_inactive", () => {
    const markup = renderFocus(stepTimes(1));

    expect(markup).toContain('data-testid="effective-address-unit" data-active="false"');
    expect(markup).toContain("bypass");
    expect(markup).not.toContain('data-testid="eau-index-input-label"');
  });

  it("index_lad_uses_eau_without_memory_read", () => {
    const source = `MAIN START
     LAD   GR2,1
     LAD   GR1,A,GR2
     RET
A    DC    10
     END`;
    const markup = renderFocus(stepSource(source, 2), source);

    expect(markup).toContain('data-testid="effective-address-unit" data-active="true"');
    expect(activeWireIds(markup)).toContain("base-to-eau");
    expect(activeWireIds(markup)).toContain("index-to-eau");
    expect(activeWireIds(markup)).toContain("eau-to-gr");
    expect(activeWireIds(markup)).not.toContain("eau-to-mar");
    expect(activeWireIds(markup)).not.toContain("memory-to-mdr");
    expect(markup).toContain('data-testid="module-memory" data-active="false"');
  });

  it("index_shift_uses_eau_as_count_without_memory_read", () => {
    const source = `MAIN START
     LAD   GR2,1
     LD    GR1,A
     SLL   GR1,0,GR2
     RET
A    DC    3
     END`;
    const markup = renderFocus(stepSource(source, 3), source);

    expect(markup).toContain('data-testid="effective-address-unit" data-active="true"');
    expect(activeWireIds(markup)).toContain("base-to-eau");
    expect(activeWireIds(markup)).toContain("index-to-eau");
    expect(activeWireIds(markup)).toContain("eau-to-mar");
    expect(activeWireIds(markup)).toContain("shift-count-to-alu");
    expect(activeWireIds(markup)).not.toContain("memory-to-mdr");
    expect(markup).toContain('data-testid="module-memory" data-active="false"');
  });

  it("index_jump_uses_eau_to_pr", () => {
    const source = `MAIN START
     LAD   GR2,1
     JUMP  SKIP,GR2
SKIP LAD   GR1,0
DONE RET
     END`;
    const markup = renderFocus(stepSource(source, 2), source);

    expect(markup).toContain('data-testid="effective-address-unit" data-active="true"');
    expect(activeWireIds(markup)).toContain("base-to-eau");
    expect(activeWireIds(markup)).toContain("index-to-eau");
    expect(activeWireIds(markup)).toContain("eau-to-pr");
    expect(activeWireIds(markup)).not.toContain("address-to-pr");
    expect(activeWireIds(markup)).not.toContain("memory-to-mdr");
  });

  it("circuit_ld_data_bus_does_not_cross_alu_active_region", () => {
    const markup = renderFocus(stepTimes(1));

    expect(markup).toContain('data-testid="wire-mdr-to-gr"');
    expect(markup).toContain('data-path-id="mdr-to-gr"');
    expect(markup).toContain('data-lane="data-bypass"');
    expect(markup).toContain('data-avoids-alu="true"');
    expect(markup).toContain('data-testid="module-alu" data-active="false"');
  });

  it("sp_is_inactive_for_ld_st_and_adda", () => {
    for (const markup of [renderFocus(stepTimes(1)), renderFocus(stepTimes(2)), renderFocus(stepTimes(3))]) {
      expect(markup).toContain('data-testid="module-sp" data-active="false"');
      expect(activeWireIds(markup)).not.toContain("sp-to-mar-preview");
      expect(activeWireIds(markup)).not.toContain("mar-to-stack-memory-preview");
    }
  });

  it("focus_mode_alu_path_visible_for_adda", () => {
    const markup = renderFocus(stepTimes(2));

    expect(markup).toContain('data-testid="module-alu" data-active="true"');
    expect(markup).toContain('data-testid="module-fr" data-active="true"');
    expect(activeWireIds(markup)).toContain("gr-to-alu");
    expect(activeWireIds(markup)).toContain("mdr-to-alu");
    expect(activeWireIds(markup)).toContain("alu-to-gr");
    expect(activeWireIds(markup)).toContain("alu-to-fr");
    expect(markup).toContain('data-path-id="gr-to-alu"');
    expect(markup).toContain('data-lane="data-compute"');
  });

  it("focus_mode_st_path_targets_memory_row", () => {
    const markup = renderFocus(stepTimes(3));

    expect(markup).toContain('data-testid="memory-row-0029"');
    expect(markup).toContain('data-write="true"');
    expect(markup).toContain('data-testid="module-alu" data-active="false"');
    expect(markup).toContain('data-testid="module-fr" data-active="false"');
    expect(activeWireIds(markup)).toContain("gr-to-mdr");
    expect(activeWireIds(markup)).toContain("mdr-to-memory");
    expect(markup).toContain('data-path-id="gr-to-mdr"');
    expect(markup).toContain('data-lane="data-bypass"');
    expect(markup).toContain('data-avoids-alu="true"');
  });

  it("focus_mode_display_does_not_show_pr_as_output", () => {
    const markup = renderFocus(mockCaslCore.assemble(gr2Source));

    const displayMatch = /data-testid="focus-display-panel"[\s\S]*?<\/section>/.exec(markup)?.[0] ?? "";
    expect(displayMatch).toContain("No output");
    expect(displayMatch).not.toContain("0020");
  });

  it("focus_mode_output_log_label_distinct_from_out_display", () => {
    const outputMarkup = renderToStaticMarkup(
      <OutputPanel lines={["Assemble succeeded."]} onClear={() => undefined} />
    );
    const focusMarkup = renderFocus(mockCaslCore.assemble(gr2Source));

    expect(outputMarkup).toContain("Output Log");
    expect(focusMarkup).toContain("OUT Display");
    expect(focusMarkup).toContain("Display Device");
  });

  it("focus_mode_output_dock_is_compact", () => {
    const outputMarkup = renderToStaticMarkup(
      <div className="app-shell circuit-focus-active">
        <OutputPanel lines={["Run finished after 4 steps."]} onClear={() => undefined} />
      </div>
    );

    expect(outputMarkup).toContain('class="app-shell circuit-focus-active"');
    expect(outputMarkup).toContain('class="output-panel"');
    expect(outputMarkup).toContain("Output Log");
    expect(outputMarkup).toContain("Run finished after 4 steps.");
  });

  it("output_log_compact_height_unchanged", () => {
    expect(appCss).toContain(".output-panel");
    expect(appCss).toContain("grid-template-rows: 34px minmax(0, 1fr)");
  });

  it("focus_mode_out_display_is_low_emphasis_when_empty", () => {
    const markup = renderFocus(mockCaslCore.assemble(gr2Source));
    const displayMatch = /data-testid="focus-display-panel"[\s\S]*?<\/section>/.exec(markup)?.[0] ?? "";

    expect(markup).toContain('data-testid="focus-display-value"');
    expect(displayMatch).toContain("OUT Display");
    expect(displayMatch).toContain("No output");
    expect(displayMatch).not.toContain("PR");
  });

  it("focus_mode_trace_history_rows_are_deemphasized", () => {
    const markup = renderFocus(stepTimes(3));

    expect(markup).toContain('data-testid="focus-trace-latest"');
    expect(markup).toContain('data-latest="true"');
    expect(markup).toContain('data-testid="focus-trace-item"');
    expect(markup).toContain('data-latest="false"');
  });

  it("trace_item_has_main_effect_note_structure", () => {
    const markup = renderFocus(stepTimes(3));

    expect(markup).toContain("focus-trace-lines");
    expect(markup).toContain("trace-main text-ellipsis");
    expect(markup).toContain("trace-effect text-ellipsis");
    expect(markup).toContain("trace-note text-ellipsis");
  });

  it("trace_latest_row_prominent_but_not_excessively_tall", () => {
    const markup = renderFocus(stepSource(callReturnSource, 3), callReturnSource);

    expect(markup).toContain('class="focus-trace-item latest"');
    expect(markup).toContain('data-latest="true"');
    expect(markup).toContain("trace-effect text-ellipsis");
  });

  it("trace_history_rows_compact", () => {
    const markup = renderFocus(stepSource(callReturnSource, 4), callReturnSource);

    expect(markup).toContain('data-testid="focus-trace-item"');
    expect(markup).toContain('data-latest="false"');
  });

  it("trace_long_text_ellipsis_with_title", () => {
    const markup = renderFocus(stepSource(callReturnSource, 2), callReturnSource);

    expect(markup).toContain('class="trace-main text-ellipsis"');
    expect(markup).toContain('class="trace-effect text-ellipsis"');
    expect(markup).toContain('class="trace-note text-ellipsis"');
    expect(markup).toContain('title="#2 CALL SUB"');
  });

  it("trace_latest_secondary_note_allows_two_lines", () => {
    expect(appCss).toContain(".focus-trace-item.latest .trace-note");
    expect(appCss).toContain("-webkit-line-clamp: 2");
  });

  it("trace_history_secondary_note_ellipsis", () => {
    expect(appCss).toContain(".focus-trace-item:not(.latest) .trace-note");
    expect(appCss).toContain("opacity: 0.52");
  });

  it("trace_call_ret_key_note_readable", () => {
    const markup = renderFocus(stepSource(callReturnSource, 2), callReturnSource);

    expect(markup).toContain("SP: FFFE -&gt; FFFD");
    expect(markup).toContain("callDepth: 0 -&gt; 1");
  });

  it("signal_probe_card_renders_compact", () => {
    const markup = renderFocus(stepTimes(1));

    expect(markup).toContain('data-testid="focus-signal-probe"');
    expect(markup).toContain("Signal Probe");
    expect(markup).toContain("Read-only nodes");
    expect(markup).toContain('data-testid="signal-probe-evolution"');
  });

  it("signal_probe_uses_compact_rows_without_overflow", () => {
    const markup = renderFocus(stepTimes(2));

    expect(markup).toContain('data-testid="signal-probe-compact-rows"');
    expect(markup).toContain("signal-probe-row compact-grid");
    expect(markup).toContain("compact-label signal-probe-label");
    expect(markup).toContain("mono-value");
    expect(markup).toContain("secondary-note text-ellipsis");
    expect(markup).not.toContain("signal-probe-grid");
  });

  it("signal_probe_shows_details_without_overlapping", () => {
    const state = stepSource(callReturnSource, 2);
    const markup = renderFocus(state, callReturnSource);

    expect(markup).toContain('data-testid="signal-probe-details"');
    expect(markup).toContain("+ ");
    expect(markup).toContain("Call depth");
  });

  it("signal_probe_does_not_show_unhelpful_truncated_labels", () => {
    const markup = renderFocus(stepSource(callReturnSource, 2), callReturnSource, "register-stack");

    expect(markup).not.toContain(">RETADDR<");
    expect(markup).not.toContain(">CALLDEPTH<");
    expect(markup).not.toContain(">MEMIF");
  });

  it("signal_probe_uses_short_stable_labels", () => {
    const markup = renderFocus(stepSource(callReturnSource, 2), callReturnSource, "register-stack");

    expect(markup).toContain(">Return</span>");
    expect(markup).toContain(">Depth</span>");
    expect(markup).toContain(">SP</span>");
  });

  it("signal_probe_details_keep_title_for_full_meaning", () => {
    const markup = renderFocus(stepSource(callReturnSource, 2), callReturnSource, "register-stack");

    expect(markup).toContain('title="Return address"');
    expect(markup).toContain('title="Call depth"');
    expect(markup).toContain('title="Stack write"');
  });

  it("signal_probe_defaults_to_three_primary_rows", () => {
    const source = getDemoProgram("casl-index-addressing")!.source;
    const markup = renderFocus(stepSource(source, 2), source);
    const compactRows = /data-testid="signal-probe-compact-rows"[\s\S]*?<details/.exec(markup)?.[0] ?? "";

    expect(compactRows.match(/data-testid="signal-probe-row"/g)?.length).toBe(3);
    expect(compactRows).toContain(">GR1<");
    expect(compactRows).toContain(">EA<");
    expect(compactRows).not.toContain(">Base<");
  });

  it("signal_probe_index_details_collapsed_by_default", () => {
    const source = getDemoProgram("casl-index-addressing")!.source;
    const markup = renderFocus(stepSource(source, 2), source);

    expect(markup).toContain('data-testid="signal-probe-details"');
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain(">Base<");
    expect(markup).toContain("index register");
  });

  it("signal_probe_stack_details_collapsed_by_default", () => {
    const markup = renderFocus(stepSource(callReturnSource, 2), callReturnSource, "register-stack");
    const compactRows = /data-testid="signal-probe-compact-rows"[\s\S]*?<details/.exec(markup)?.[0] ?? "";

    expect(compactRows.match(/data-testid="signal-probe-row"/g)?.length).toBe(3);
    expect(compactRows).toContain(">Return<");
    expect(compactRows).toContain(">SP<");
    expect(markup).toContain('aria-expanded="false"');
  });

  it("signal_probe_rows_do_not_overlap", () => {
    const markup = renderFocus(stepSource(callReturnSource, 2), callReturnSource, "register-stack");

    expect(markup).toContain("signal-probe-row compact-grid");
    expect(markup).toContain("compact-label signal-probe-label");
    expect(markup).toContain("secondary-note text-ellipsis");
  });

  it("signal_probe_details_has_aria_expanded", () => {
    const markup = renderFocus(stepSource(callReturnSource, 2), callReturnSource);

    expect(markup).toContain('data-testid="signal-probe-details-summary"');
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain('aria-controls="signal-probe-detail-rows"');
    expect(markup).toContain("additional signal probe rows");
  });

  it("signal_probe_shows_current_involved_values", () => {
    const addaMarkup = renderFocus(stepTimes(2));
    const stMarkup = renderFocus(stepTimes(3));

    expect(addaMarkup).toContain("GR2");
    expect(addaMarkup).toContain("0007");
    expect(addaMarkup).toContain("ALU.Y");
    expect(addaMarkup).toContain('data-testid="signal-probe-row" data-active="true"');
    expect(stMarkup).toContain("MEM[0029]");
    expect(stMarkup).toContain("0007");
  });

  it("signal_probe_shows_sp_preview_without_fake_activity", () => {
    const markup = renderFocus(stepTimes(1));

    expect(markup).toContain("SP");
    expect(markup).toContain("FFFE");
    expect(markup).toContain("stack preview only");
    expect(markup).toContain('data-testid="signal-probe-row" data-active="false"');
  });

  it("call_stack_uses_summary_and_detail_rows", () => {
    const markup = renderFocus(stepSource(callReturnSource, 2), callReturnSource, "register-stack");

    expect(markup).toContain('data-testid="call-stack-summary"');
    expect(markup).toContain('data-testid="call-stack-details"');
    expect(markup).toContain('data-testid="call-stack-details-summary"');
    expect(markup).toContain("call-stack-row call-stack-row-wide");
    expect(markup).toContain("Depth change");
  });

  it("call_stack_uses_human_readable_depth_change", () => {
    const markup = renderFocus(stepSource(callReturnSource, 2), callReturnSource, "register-stack");

    expect(markup).toContain("Depth change");
    expect(markup).toContain('title="0 -&gt; 1"');
    expect(markup).not.toContain("last 0 -&gt; 1");
  });

  it("call_stack_top_level_finish_wording_clear", () => {
    const markup = renderFocus(mockCaslCore.assemble(gr2Source), gr2Source, "register-stack");

    expect(markup).toContain("Top-level finish");
    expect(markup).toContain("Program finish");
    expect(markup).toContain("Stack activity: none");
  });

  it("call_stack_stack_return_wording_clear", () => {
    const markup = renderFocus(stepSource(callReturnSource, 4), callReturnSource, "register-stack");

    expect(markup).toContain("Stack return");
    expect(markup).toContain("Return address read");
    expect(markup).toContain("Return to 0024 from MEM[FFFD]");
  });

  it("call_stack_details_do_not_overflow", () => {
    const markup = renderFocus(stepSource(callReturnSource, 2), callReturnSource, "register-stack");

    expect(markup).toContain("call-stack-row");
    expect(markup).toContain("secondary-note text-ellipsis");
    expect(markup).toContain("nowrap-symbol");
  });

  it("call_stack_details_has_aria_expanded", () => {
    const markup = renderFocus(stepSource(callReturnSource, 2), callReturnSource, "register-stack");

    expect(markup).toContain('data-testid="call-stack-details-summary"');
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain('aria-controls="call-stack-detail-rows"');
    expect(markup).toContain('title="Toggle Call Stack detail rows"');
  });

  it("register_stack_mode_compacts_low_priority_probe_and_call_stack_cards", () => {
    const markup = renderFocus(stepSource(callReturnSource, 2), callReturnSource, "register-stack");

    expect(markup).toContain('class="call-stack-body card-overflow-safe" data-active="true" data-density="compact"');
    expect(markup).toContain('class="signal-probe-body card-overflow-safe" data-density="compact"');
    expect(markup).toContain('title="Call target SUB; return 0024"');
  });

  it("call_stack_top_level_mode_does_not_overflow", () => {
    const markup = renderFocus(mockCaslCore.assemble(gr2Source), gr2Source, "register-stack");

    expect(markup).toContain('data-testid="call-stack-summary"');
    expect(markup).toContain('data-testid="call-stack-ret-mode">Top-level finish</code>');
    expect(markup).toContain("secondary-note text-ellipsis");
  });

  it("ret_semantics_unchanged", () => {
    const state = stepTimes(4);
    const markup = renderFocus(state);

    expect(state.runState).toBe("Finished");
    expect(state.sp).toBe(0xfffe);
    expect(markup).toContain('title="FFFE"');
    expect(markup).toContain("stack preview only");
    expect(activeWireIds(markup)).not.toContain("sp-to-mar-preview");
    expect(activeWireIds(markup)).not.toContain("mar-to-stack-memory-preview");
  });

  it("signal_probe_shows_shift_result", () => {
    const source = `MAIN START
     LD    GR1,A
     SLL   GR1,1
     RET
A    DC    3
     END`;
    const markup = renderFocus(stepSource(source, 2), source);

    expect(markup).toContain('data-testid="module-alu" data-active="true"');
    expect(markup).toContain('data-testid="alu-shift-badge"');
    expect(markup).toContain("SLL");
    expect(markup).toContain("ALU.Y");
    expect(markup).toContain("0006");
    expect(markup).toContain('data-testid="module-mdr" data-active="false"');
    expect(markup).toContain('data-testid="module-memory" data-active="false"');
  });

  it("focus_mode_memory_target_badge_not_overlapping_title", () => {
    const markup = renderFocus(stepTimes(3));

    expect(markup).toContain('data-testid="memory-target-badge"');
    expect(markup).toContain("Target @0029");
  });

  it("text_overflow_utilities_exist", () => {
    const focusMarkup = renderFocus(stepSource(callReturnSource, 2), callReturnSource);
    const machineMarkup = renderToStaticMarkup(
      <OutputPanel lines={[]} state={mockCaslCore.assemble(gr2Source)} sourceMode="casl" initialTab="machine" onClear={() => undefined} />
    );
    const markup = `${focusMarkup}${machineMarkup}`;

    expect(markup).toContain("text-ellipsis");
    expect(markup).toContain("mono-value");
    expect(markup).toContain("compact-label");
    expect(markup).toContain("secondary-note");
    expect(markup).toContain("nowrap-symbol");
    expect(markup).toContain("wrap-explanation");
    expect(markup).toContain("compact-grid");
    expect(markup).toContain("card-overflow-safe");
  });

  it("generated_casl_table_ellipsis_long_labels", () => {
    const program = getDemoProgram("cpp-function-arguments");
    expect(program).toBeDefined();
    const prepared = prepareSourceForCoreAssembly(program!.source, "cpp");
    expect(prepared.ok).toBe(true);
    const markup = renderToStaticMarkup(
      <OutputPanel
        lines={[]}
        generatedCaslSource={prepared.generatedCaslSource}
        cppToCaslMapping={prepared.mapping}
        sourceMode="cpp"
        initialTab="generated"
        onClear={() => undefined}
      />
    );

    expect(markup).toContain("FUNC_ADD_A");
    expect(markup).toContain("text-ellipsis");
    expect(markup).toContain("nowrap-symbol");
    expect(markup).toContain('title="FUNC_ADD"');
  });

  it("code_machine_generated_casl_primary_columns_readable", () => {
    const program = getDemoProgram("cpp-function-arguments");
    expect(program).toBeDefined();
    const prepared = prepareSourceForCoreAssembly(program!.source, "cpp");
    expect(prepared.ok).toBe(true);
    const state = mockCaslCore.assemble(prepared.coreSourceText);
    const markup = renderCppFocus(state, program!.source, prepared.generatedCaslSource, prepared.mapping, "code-machine");

    expect(markup).toContain('data-testid="focus-generated-casl-panel"');
    expect(markup).toContain("focus-code-cell-primary");
    expect(markup).toContain("FUNC_ADD");
    expect(markup).toContain("CALL");
  });

  it("code_machine_secondary_columns_deemphasized", () => {
    const program = getDemoProgram("cpp-function-arguments");
    expect(program).toBeDefined();
    const prepared = prepareSourceForCoreAssembly(program!.source, "cpp");
    expect(prepared.ok).toBe(true);
    const state = mockCaslCore.assemble(prepared.coreSourceText);
    const markup = renderCppFocus(state, program!.source, prepared.generatedCaslSource, prepared.mapping, "code-machine");

    expect(markup).toContain("focus-code-cell-secondary");
    expect(markup).toContain("focus-code-cell-meaning");
  });

  it("machine_code_meaning_ellipsis_with_title", () => {
    const program = getDemoProgram("cpp-function-arguments");
    expect(program).toBeDefined();
    const prepared = prepareSourceForCoreAssembly(program!.source, "cpp");
    expect(prepared.ok).toBe(true);
    const state = mockCaslCore.assemble(prepared.coreSourceText);
    const markup = renderCppFocus(state, program!.source, prepared.generatedCaslSource, prepared.mapping, "code-machine");

    expect(markup).toContain('class="text-ellipsis focus-code-cell-secondary focus-code-cell-meaning"');
    expect(markup).toContain('title="subroutine target address"');
  });

  it("selected_word_explanation_no_overflow", () => {
    const program = getDemoProgram("cpp-function-arguments");
    expect(program).toBeDefined();
    const prepared = prepareSourceForCoreAssembly(program!.source, "cpp");
    expect(prepared.ok).toBe(true);
    const state = mockCaslCore.assemble(prepared.coreSourceText);
    const markup = renderToStaticMarkup(
      <OutputPanel
        lines={[]}
        state={state}
        generatedCaslSource={prepared.generatedCaslSource}
        cppToCaslMapping={prepared.mapping}
        sourceMode="cpp"
        initialTab="machine"
        onClear={() => undefined}
      />
    );

    expect(markup).toContain('data-testid="machine-code-explanation"');
    expect(markup).toContain("wrap-explanation");
    expect(markup).toContain("text-ellipsis");
  });

  it("generated_casl_long_cells_have_title", () => {
    const program = getDemoProgram("cpp-function-arguments");
    expect(program).toBeDefined();
    const prepared = prepareSourceForCoreAssembly(program!.source, "cpp");
    expect(prepared.ok).toBe(true);
    const markup = renderToStaticMarkup(
      <OutputPanel
        lines={[]}
        generatedCaslSource={prepared.generatedCaslSource}
        cppToCaslMapping={prepared.mapping}
        sourceMode="cpp"
        initialTab="generated"
        onClear={() => undefined}
      />
    );

    expect(markup).toContain('title="FUNC_ADD_A"');
    expect(markup).toContain('title="GR1,FUNC_ADD_A"');
    expect(markup).toContain('title="function-declaration"');
  });

  it("machine_code_explanation_does_not_overflow", () => {
    const program = getDemoProgram("cpp-function-arguments");
    expect(program).toBeDefined();
    const prepared = prepareSourceForCoreAssembly(program!.source, "cpp");
    expect(prepared.ok).toBe(true);
    const state = mockCaslCore.assemble(prepared.coreSourceText);
    const markup = renderToStaticMarkup(
      <OutputPanel
        lines={[]}
        state={state}
        generatedCaslSource={prepared.generatedCaslSource}
        cppToCaslMapping={prepared.mapping}
        sourceMode="cpp"
        initialTab="machine"
        onClear={() => undefined}
      />
    );

    expect(markup).toContain('data-testid="machine-code-explanation"');
    expect(markup).toContain("wrap-explanation");
    expect(markup).toContain("text-ellipsis");
    expect(markup).toContain("machine-code-explanation");
  });

  it("machine_code_selected_explanation_shows_meaning", () => {
    const state = mockCaslCore.assemble(gr2Source);
    const markup = renderToStaticMarkup(
      <OutputPanel lines={[]} state={state} sourceMode="casl" initialTab="machine" onClear={() => undefined} />
    );

    expect(markup).toContain('data-testid="machine-code-explanation-summary"');
    expect(markup).toContain("<dt>Source</dt>");
    expect(markup).toContain("<dt>Meaning</dt>");
  });

  it("machine_code_selected_explanation_not_too_short", () => {
    expect(appCss).toContain(".machine-code-explanation-summary");
    expect(appCss).toContain("grid-template-columns: minmax(0, 0.86fr) minmax(0, 1.14fr)");
  });

  it("machine_code_call_explanation_remains_visible", () => {
    const program = getDemoProgram("cpp-function-arguments");
    expect(program).toBeDefined();
    const prepared = prepareSourceForCoreAssembly(program!.source, "cpp");
    expect(prepared.ok).toBe(true);
    const state = mockCaslCore.assemble(prepared.coreSourceText);
    const markup = renderToStaticMarkup(
      <OutputPanel
        lines={[]}
        state={state}
        generatedCaslSource={prepared.generatedCaslSource}
        cppToCaslMapping={prepared.mapping}
        sourceMode="cpp"
        initialTab="machine"
        onClear={() => undefined}
      />
    );

    expect(markup).toContain("CALL FUNC_ADD");
    expect(markup).toContain("subroutine target address");
    expect(markup).toContain('data-testid="machine-code-explanation-summary"');
  });

  it("machine_code_long_cells_have_title", () => {
    const program = getDemoProgram("cpp-function-arguments");
    expect(program).toBeDefined();
    const prepared = prepareSourceForCoreAssembly(program!.source, "cpp");
    expect(prepared.ok).toBe(true);
    const state = mockCaslCore.assemble(prepared.coreSourceText);
    const markup = renderToStaticMarkup(
      <OutputPanel
        lines={[]}
        state={state}
        generatedCaslSource={prepared.generatedCaslSource}
        cppToCaslMapping={prepared.mapping}
        sourceMode="cpp"
        initialTab="machine"
        onClear={() => undefined}
      />
    );

    expect(markup).toContain('title="CALL FUNC_ADD"');
    expect(markup).toContain('title="call -&gt; FUNC_ADD"');
    expect(markup).toContain('aria-label="Select machine word');
  });

  it("memory_rows_keep_address_value_label_columns", () => {
    const markup = renderToStaticMarkup(<MemoryPanel state={stepTimes(1)} embedded />);

    expect(markup).toContain('class="data-table memory-table"');
    expect(markup).toContain("<th>Addr</th>");
    expect(markup).toContain("<th>Value</th>");
    expect(markup).toContain("<th>Label</th>");
    expect(markup).toContain('class="hex mono-value"');
    expect(markup).toContain('class="text-ellipsis nowrap-symbol"');
  });

  it("registers_source_column_ellipsis", () => {
    const markup = renderToStaticMarkup(<RegisterPanel state={stepTimes(1)} embedded />);

    expect(markup).toContain('class="data-table"');
    expect(markup).toContain("<th>Name</th>");
    expect(markup).toContain("<th>Value</th>");
    expect(markup).toContain("<th>(Dec)</th>");
    expect(markup).toContain('class="hex mono-value"');
    expect(markup).toContain('class="text-ellipsis"');
  });

  it("output_tabs_have_accessible_labels", () => {
    const markup = renderToStaticMarkup(<OutputPanel lines={[]} sourceMode="casl" initialTab="output" onClear={() => undefined} />);

    expect(markup).toContain('role="tablist"');
    expect(markup).toContain('aria-label="Output panels"');
    expect(markup).toContain('id="output-tab-output"');
    expect(markup).toContain('aria-controls="output-panel-output"');
    expect(markup).toContain('aria-label="Open Output Log tab"');
    expect(markup).toContain('role="tabpanel"');
    expect(markup).toContain('aria-labelledby="output-tab-output"');
  });

  it("inspector_tabs_have_accessible_state", () => {
    const markup = renderToStaticMarkup(<InspectorPanel state={stepTimes(1)} />);

    expect(markup).toContain('role="tablist"');
    expect(markup).toContain('aria-label="Inspector panels"');
    expect(markup).toContain('id="inspector-tab-registers"');
    expect(markup).toContain('aria-controls="inspector-panel-registers"');
    expect(markup).toContain('aria-selected="true"');
    expect(markup).toContain('role="tabpanel"');
    expect(markup).toContain('aria-labelledby="inspector-tab-registers"');
  });

  it("icon_buttons_have_aria_labels", () => {
    const noop = () => undefined;
    const markup = renderToStaticMarkup(
      <Toolbar
        assembleStatus="default"
        canRun={true}
        canStep={true}
        canReset={true}
        isRunning={false}
        isCircuitFocusMode={false}
        onToggleCircuitFocusMode={noop}
        onAssemble={noop}
        onRun={noop}
        onStep={noop}
        onReset={noop}
        onStop={noop}
      />
    );

    expect(markup).toContain('aria-label="Open Circuit Focus Mode"');
    expect(markup).toContain('aria-label="Run with max step protection"');
    expect(markup).toContain('aria-label="Step"');
    expect(markup).toContain('aria-label="Theme toggle"');
  });

  it("long_symbols_have_title", () => {
    const markup = renderFocus(stepSource(callReturnSource, 2), callReturnSource, "register-stack");

    expect(markup).toContain('title="#2 CALL SUB"');
    expect(markup).toContain('title="Return address"');
    expect(markup).toContain('title="Call target SUB; return 0024"');
  });

  it("current_instruction_title_not_uselessly_truncated", () => {
    const markup = renderFocus(stepSource(callReturnSource, 2), callReturnSource);

    expect(markup).toContain('<h2 title="Current Instruction">Instruction</h2>');
    expect(markup).not.toContain(">Current Instruction</h2>");
  });

  it("current_instruction_runtime_summary_uses_stable_rows", () => {
    const markup = renderFocus(stepSource(callReturnSource, 2), callReturnSource);

    expect(markup).toContain("Current PR");
    expect(markup).toContain("Next PR");
    expect(markup).toContain("MAR");
    expect(markup).toContain("FR");
  });

  it("current_instruction_next_instruction_has_title", () => {
    const markup = renderFocus(stepSource(callReturnSource, 2), callReturnSource);

    expect(markup).toContain('title="SUB ADDA GR1,ONE"');
  });

  it("cpu_flow_source_context_does_not_clip_at_bottom", () => {
    expect(appCss).toContain('.circuit-focus-workspace[data-observation-mode="cpu-flow"] .focus-source-context');
    expect(appCss).toContain("grid-template-rows: minmax(0, 1fr)");
  });

  it("right_column_scroll_safe_when_content_exceeds_height", () => {
    expect(appCss).toContain(".focus-right-column");
    expect(appCss).toContain("overflow-y: auto");
  });

  it("source_context_compact_in_cpu_flow", () => {
    const markup = renderFocus(stepTimes(1));

    expect(markup).toContain('data-testid="focus-source-context"');
    expect(appCss).toContain('.circuit-focus-workspace[data-observation-mode="cpu-flow"] .focus-source-context .panel-header');
    expect(appCss).toContain("display: none");
  });

  it("push_stack_terms_are_clear", () => {
    const markup = renderFocus(stepSource(pushPopSource, 2), pushPopSource, "register-stack");

    expect(markup).toContain("Stack write");
  });

  it("pop_stack_terms_are_clear", () => {
    const markup = renderFocus(stepSource(pushPopSource, 3), pushPopSource, "register-stack");

    expect(markup).toContain("Stack read");
  });

  it("call_ret_stack_terms_are_clear", () => {
    const callMarkup = renderFocus(stepSource(callReturnSource, 2), callReturnSource, "register-stack");
    const retMarkup = renderFocus(stepSource(callReturnSource, 4), callReturnSource, "register-stack");
    const finishMarkup = renderFocus(stepSource(callReturnSource, 6), callReturnSource, "register-stack");

    expect(callMarkup).toContain("Return address write");
    expect(retMarkup).toContain("Return address read");
    expect(finishMarkup).toContain("Program finish");
  });

  it("trace_secondary_note_has_title_when_truncated", () => {
    const markup = renderToStaticMarkup(<TracePanel state={stepSource(callReturnSource, 2)} embedded />);

    expect(markup).toContain('data-testid="trace-row-note"');
    expect(markup).toContain('title="SP: FFFE -&gt; FFFD | callDepth: 0 -&gt; 1 | State: Ready"');
  });
});
