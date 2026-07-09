// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import CircuitFocusLayout from "../components/CircuitFocusLayout";
import OutputPanel from "../components/OutputPanel";
import StatusBar from "../components/StatusBar";
import { mockCaslCore } from "../core/mockCaslCore";
import type { CometState } from "../core/types";
import { getDemoProgram } from "../examples/demoPrograms";

const gr2Source = getDemoProgram("casl-gr2-addition")!.source;
const timelineItems = [
  { key: "ready", index: 0, label: "Ready", phase: "completed" },
  { key: "ld", index: 1, label: "LD", phase: "current" },
  { key: "adda", index: 2, label: "ADDA", phase: "pending" },
];

function renderFocus(state: CometState, sourceText = gr2Source): string {
  return renderToStaticMarkup(
    <CircuitFocusLayout
      state={state}
      sourceMode="casl"
      sourceText={sourceText}
      generatedCaslSource=""
      cppToCaslMapping={[]}
      isSourceDirty={false}
      timelineItems={timelineItems}
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

  it("focus_mode_renders_registers_and_trace_side_panel", () => {
    const markup = renderFocus(mockCaslCore.assemble(gr2Source));

    expect(markup).toContain('data-testid="focus-registers-panel"');
    expect(markup).toContain("General Registers");
    expect(markup).toContain('data-testid="focus-trace-panel"');
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
    expect(activeWireIds(markup)).not.toContain("sp-reference");
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

  it("circuit_ld_data_bus_does_not_cross_alu_active_region", () => {
    const markup = renderFocus(stepTimes(1));

    expect(markup).toContain('data-testid="wire-mdr-to-gr"');
    expect(markup).toContain('data-path-id="mdr-to-gr"');
    expect(markup).toContain('data-lane="data-bypass"');
    expect(markup).toContain('data-avoids-alu="true"');
    expect(markup).toContain('data-testid="module-alu" data-active="false"');
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

  it("signal_probe_card_renders_compact", () => {
    const markup = renderFocus(stepTimes(1));

    expect(markup).toContain('data-testid="focus-signal-probe"');
    expect(markup).toContain("Signal Probe");
    expect(markup).toContain("Read-only nodes");
    expect(markup).toContain('data-testid="signal-probe-evolution"');
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

  it("focus_mode_memory_target_badge_not_overlapping_title", () => {
    const markup = renderFocus(stepTimes(3));

    expect(markup).toContain('data-testid="memory-target-badge"');
    expect(markup).toContain("Target @0029");
  });
});
