// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import CircuitFocusLayout from "../components/CircuitFocusLayout";
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

describe("Circuit Focus Mode layout", () => {
  it("focus_mode_layout_renders_program_display_instruction", () => {
    const markup = renderFocus(mockCaslCore.assemble(gr2Source));

    expect(markup).toContain('data-testid="circuit-focus-layout"');
    expect(markup).toContain('data-testid="focus-program-panel"');
    expect(markup).toContain('data-testid="focus-display-panel"');
    expect(markup).toContain("No output");
    expect(markup).toContain('data-testid="focus-current-instruction-panel"');
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
  });

  it("focus_mode_alu_path_visible_for_adda", () => {
    let state = mockCaslCore.assemble(gr2Source);
    state = mockCaslCore.step(state);
    state = mockCaslCore.step(state);
    const markup = renderFocus(state);

    expect(markup).toContain('data-testid="module-alu" data-active="true"');
    expect(activeWireIds(markup)).toContain("gr-to-alu");
    expect(activeWireIds(markup)).toContain("mdr-to-alu");
    expect(activeWireIds(markup)).toContain("alu-to-gr");
    expect(activeWireIds(markup)).toContain("alu-to-fr");
  });

  it("focus_mode_st_path_targets_memory_row", () => {
    let state = mockCaslCore.assemble(gr2Source);
    state = mockCaslCore.step(state);
    state = mockCaslCore.step(state);
    state = mockCaslCore.step(state);
    const markup = renderFocus(state);

    expect(markup).toContain('data-testid="memory-row-0029"');
    expect(markup).toContain('data-write="true"');
    expect(activeWireIds(markup)).toContain("gr-to-mdr");
    expect(activeWireIds(markup)).toContain("mdr-to-memory");
  });

  it("focus_mode_display_does_not_show_pr_as_output", () => {
    const markup = renderFocus(mockCaslCore.assemble(gr2Source));

    const displayMatch = /data-testid="focus-display-panel"[\s\S]*?<\/section>/.exec(markup)?.[0] ?? "";
    expect(displayMatch).toContain("No output");
    expect(displayMatch).not.toContain("0020");
  });
});
