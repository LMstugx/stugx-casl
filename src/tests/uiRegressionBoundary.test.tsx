// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import CircuitFocusLayout from "../components/CircuitFocusLayout";
import { createEmptyUiCometState } from "../core/coreStateAdapter";
import { mockCaslCore } from "../core/mockCaslCore";
import type { CometState } from "../core/types";
import { getDemoProgram } from "../examples/demoPrograms";
import type { ObservationMode } from "../store/useAppStore";

const gr2Source = getDemoProgram("casl-gr2-addition")!.source;

function renderFocus(state: CometState, sourceText = gr2Source, observationMode: ObservationMode = "cpu-flow"): string {
  return renderToStaticMarkup(
    <CircuitFocusLayout
      state={state}
      sourceMode="casl"
      sourceText={sourceText}
      generatedCaslSource=""
      cppToCaslMapping={[]}
      isSourceDirty={false}
      timelineItems={[]}
      observationMode={observationMode}
      initialAuxiliaryObservation={observationMode === "register-stack" ? "stack" : undefined}
    />
  );
}

describe("Focus Mode boundary rendering", () => {
  it("no_file_or_source_loaded_state_is_safe", () => {
    const cpuMarkup = renderFocus(createEmptyUiCometState("Idle"), "");
    const markup = renderFocus(createEmptyUiCometState("Idle"), "", "register-stack");

    expect(cpuMarkup).toContain('data-testid="circuit-focus-layout"');
    expect(cpuMarkup).toContain("Assemble a program");
    expect(markup).toContain("No instruction");
    expect(markup).toContain('data-testid="focus-signal-probe"');
    expect(markup).toContain("No signal changes yet.");
    expect(markup).toContain('data-testid="focus-call-stack"');
    expect(markup).toContain("Top-level finish");
  });

  it("signal_probe_and_call_stack_are_safe_without_active_instruction", () => {
    const markup = renderFocus(mockCaslCore.assemble(gr2Source), gr2Source, "register-stack");

    expect(markup).toContain('data-testid="signal-probe-compact-rows"');
    expect(markup).toContain('data-testid="call-stack-summary"');
    expect(markup).toContain('data-testid="call-stack-depth"');
    expect(markup).toContain(">0<");
    expect(markup).toContain("No signal changes yet.");
  });

  it("stack_preview_handles_sp_near_memory_edges", () => {
    const ready = mockCaslCore.assemble("MAIN START\n     RET\n     END");
    const nearZero = renderFocus({ ...ready, sp: 0x0000 }, gr2Source, "register-stack");
    const nearEnd = renderFocus({ ...ready, sp: 0xffff }, gr2Source, "register-stack");

    expect(nearZero).toContain('data-testid="stack-preview-row" data-address="FFFE"');
    expect(nearZero).toContain('data-testid="stack-preview-row" data-address="0000" data-sp="true"');
    expect(nearEnd).toContain('data-testid="stack-preview-row" data-address="FFFD"');
    expect(nearEnd).toContain('data-testid="stack-preview-row" data-address="FFFF" data-sp="true"');
  });

  it("dirty_source_focus_mode_keeps_step_guidance_without_stale_activity", () => {
    const markup = renderToStaticMarkup(
      <CircuitFocusLayout
        state={mockCaslCore.assemble(gr2Source)}
        sourceMode="casl"
        sourceText={`${gr2Source}\n; edited`}
        generatedCaslSource=""
        cppToCaslMapping={[]}
        isSourceDirty
        timelineItems={[]}
      />
    );

    expect(markup).toContain("Modified source; assemble before stepping.");
    expect(markup).toContain("No output");
  });
});
