// @vitest-environment jsdom
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import LearningFlowPanel from "../components/LearningFlowPanel";
import { createCometStateFromDto } from "../core/coreStateAdapter";
import { toAssembleResultDto, toStepResultDto } from "../core/coreDto";
import { mockCaslCore } from "../core/mockCaslCore";
import type { CometState } from "../core/types";
import { getDemoProgram } from "../examples/demoPrograms";
import { prepareSourceForCoreAssembly } from "../store/useAppStore";

function stateFromRaw(raw: CometState, previous?: CometState): CometState {
  const dto = raw.stepIndex === 0 ? toAssembleResultDto(raw).state : toStepResultDto(raw).state;
  return createCometStateFromDto(dto, previous ? { previous } : {});
}

function prepareBreakContinue() {
  const program = getDemoProgram("cpp-break-continue");
  expect(program).toBeDefined();
  const prepared = prepareSourceForCoreAssembly(program!.source, "cpp");
  expect(prepared.ok).toBe(true);
  return { program: program!, prepared };
}

describe("LearningFlowPanel control flow", () => {
  it("learning_flow_shows_current_jump_target", () => {
    const { program, prepared } = prepareBreakContinue();
    let raw = mockCaslCore.assemble(prepared.coreSourceText);
    let state = stateFromRaw(raw);
    for (let step = 0; step < 100 && !state.currentInstruction?.includes("JUMP FOR_CONTINUE_0"); step += 1) {
      raw = mockCaslCore.step(raw);
      state = stateFromRaw(raw, state);
    }

    const markup = renderToStaticMarkup(
      <LearningFlowPanel
        state={state}
        sourceMode="cpp"
        sourceText={program.source}
        generatedCaslSource={prepared.generatedCaslSource}
        cppToCaslMapping={prepared.mapping}
      />
    );

    expect(markup).toContain('data-testid="learning-flow-control-flow"');
    expect(markup).toContain("FOR_CONTINUE_0");
    expect(markup).toContain("continue");
  });

  it("learning_flow_shows_sequential_execution_for_non_jump", () => {
    const { program, prepared } = prepareBreakContinue();
    const state = stateFromRaw(mockCaslCore.assemble(prepared.coreSourceText));

    const markup = renderToStaticMarkup(
      <LearningFlowPanel
        state={state}
        sourceMode="cpp"
        sourceText={program.source}
        generatedCaslSource={prepared.generatedCaslSource}
        cppToCaslMapping={prepared.mapping}
      />
    );

    expect(markup).toContain("Flow: Fallthrough");
    expect(markup).not.toContain("Sequential exe");
  });

  it("learning_flow_cards_use_short_values", () => {
    const { program, prepared } = prepareBreakContinue();
    const state = stateFromRaw(mockCaslCore.assemble(prepared.coreSourceText));

    const markup = renderToStaticMarkup(
      <LearningFlowPanel
        state={state}
        sourceMode="cpp"
        sourceText={program.source}
        generatedCaslSource={prepared.generatedCaslSource}
        cppToCaslMapping={prepared.mapping}
      />
    );

    expect(markup).toContain("nowrap-symbol");
    expect(markup).toContain("secondary-note");
    expect(markup).toContain("Flow: Fallthrough");
  });
});
