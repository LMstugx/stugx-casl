import { describe, expect, it } from "vitest";
import { mockCaslCore } from "../core/mockCaslCore";
import { selectControlFlowGraph } from "../core/controlFlowGraph";
import { selectMachineCodeRows } from "../core/machineCodeRows";
import { createCometStateFromDto } from "../core/coreStateAdapter";
import { toAssembleResultDto } from "../core/coreDto";
import { getDemoProgram } from "../examples/demoPrograms";
import { prepareSourceForCoreAssembly } from "../store/useAppStore";
import { transpileCppToCasl } from "../transpiler/cppTranspiler";
import type { CometState } from "../core/types";

function assembleCpp(source: string) {
  const result = transpileCppToCasl(source);
  expect(result.ok).toBe(true);
  const rawState = mockCaslCore.assemble(result.caslSource);
  const state = createCometStateFromDto(toAssembleResultDto(rawState).state);
  const machineRows = selectMachineCodeRows(state, result.mapping);
  return { result, state, machineRows, graph: selectControlFlowGraph(result.caslSource, result.mapping, machineRows, state) };
}

function stateFromDemo(id: string): { state: CometState; mapping: Parameters<typeof selectControlFlowGraph>[1]; generatedCaslSource: string } {
  const program = getDemoProgram(id);
  expect(program).toBeDefined();
  const prepared = prepareSourceForCoreAssembly(program!.source, "cpp");
  expect(prepared.ok).toBe(true);
  const state = createCometStateFromDto(toAssembleResultDto(mockCaslCore.assemble(prepared.coreSourceText)).state);
  return { state, mapping: prepared.mapping, generatedCaslSource: prepared.generatedCaslSource };
}

describe("control flow graph selector", () => {
  it("control_flow_labels_for_if_else", () => {
    const { graph } = assembleCpp(`int main() {
    int a = 1;
    int b = 1;
    int c;
    if (a == b) {
        c = 1;
    } else {
        c = 0;
    }
    return c;
}`);

    expect(graph.labels).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "IF_TRUE_0", kind: "if-label" }),
        expect.objectContaining({ label: "IF_FALSE_0", kind: "if-label" }),
        expect.objectContaining({ label: "IF_END_0", kind: "end-label" })
      ])
    );
  });

  it("control_flow_edges_for_while", () => {
    const { graph } = assembleCpp(`int main() {
    int i = 2;
    while (i > 0) {
        i--;
    }
    return i;
}`);

    expect(graph.edges.some((edge) => edge.kind === "conditional-true" && edge.targetLabel === "LOOP_BODY_0")).toBe(true);
    expect(graph.edges.some((edge) => edge.kind === "loop-back" && edge.targetLabel === "LOOP_BEGIN_0")).toBe(true);
  });

  it("control_flow_edges_for_for_continue_label", () => {
    const { graph } = assembleCpp(`int main() {
    int sum = 0;
    for (int i = 1; i <= 3; i++) {
        sum += i;
    }
    return sum;
}`);

    expect(graph.labels.some((label) => label.label === "FOR_CONTINUE_0" && label.kind === "continue-label")).toBe(true);
    expect(graph.edges.some((edge) => edge.kind === "loop-back" && edge.targetLabel === "FOR_BEGIN_0")).toBe(true);
  });

  it("control_flow_edge_for_break_jump", () => {
    const { state, mapping, generatedCaslSource } = stateFromDemo("cpp-break-continue");
    const machineRows = selectMachineCodeRows(state, mapping);
    const cfg = selectControlFlowGraph(generatedCaslSource, mapping, machineRows, state);

    expect(cfg.edges.some((edge) => edge.kind === "break" && edge.targetLabel === "FOR_END_0")).toBe(true);
  });

  it("control_flow_edge_for_continue_jump", () => {
    const { state, mapping, generatedCaslSource } = stateFromDemo("cpp-break-continue");
    const machineRows = selectMachineCodeRows(state, mapping);
    const cfg = selectControlFlowGraph(generatedCaslSource, mapping, machineRows, state);

    expect(cfg.edges.some((edge) => edge.kind === "continue" && edge.targetLabel === "FOR_CONTINUE_0")).toBe(true);
  });

  it("control_flow_nested_loop_targets_inner_loop", () => {
    const { graph } = assembleCpp(`int main() {
    int outer = 0;
    int inner = 0;
    while (outer < 2) {
        inner = 0;
        while (inner < 2) {
            break;
        }
        outer++;
    }
    return outer;
}`);

    expect(graph.edges.some((edge) => edge.kind === "break" && edge.targetLabel === "LOOP_END_1")).toBe(true);
    expect(graph.edges.some((edge) => edge.kind === "break" && edge.targetLabel === "LOOP_END_0")).toBe(false);
  });

  it("control_flow_unresolved_label_safe", () => {
    const graph = selectControlFlowGraph("MAIN START\n     JUMP  MISSING\n     END", [], [], undefined);

    expect(graph.edges).toEqual([
      expect.objectContaining({
        kind: "unconditional-jump",
        targetLabel: "MISSING",
        toCaslLine: null,
        toAddress: undefined
      })
    ]);
  });
});
