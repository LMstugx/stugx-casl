// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, expect, it, afterEach } from "vitest";
import OutputPanel from "../components/OutputPanel";
import { createCometStateFromDto } from "../core/coreStateAdapter";
import { toAssembleResultDto, toStepResultDto } from "../core/coreDto";
import { explainMachineCodeRow, selectMachineCodeRows } from "../core/machineCodeRows";
import { DEFAULT_CASL_SOURCE, mockCaslCore } from "../core/mockCaslCore";
import { getDemoProgram } from "../examples/demoPrograms";
import { prepareSourceForCoreAssembly } from "../store/useAppStore";
import type { CometState } from "../core/types";

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function stateFromRaw(raw: CometState, previous?: CometState): CometState {
  const dto = raw.stepIndex === 0 ? toAssembleResultDto(raw).state : toStepResultDto(raw).state;
  return createCometStateFromDto(dto, previous ? { previous } : {});
}

async function renderOutputPanel(element: React.ReactElement) {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(element);
  });
}

describe("machine code rows", () => {
  afterEach(async () => {
    await act(async () => {
      root?.unmount();
    });
    root = null;
    container?.remove();
    container = null;
  });

  it("machine_code_rows_simple_program", () => {
    const state = stateFromRaw(mockCaslCore.assemble(DEFAULT_CASL_SOURCE));
    const rows = selectMachineCodeRows(state);

    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ address: 0x20, word: 0x1010, sourceText: "LD GR1,A", kind: "instruction", meaning: "opcode/register word" }),
        expect.objectContaining({ address: 0x21, word: 0x0027, sourceText: "LD GR1,A", kind: "operand", meaning: "operand address" }),
        expect.objectContaining({ address: 0x27, word: 0x000a, sourceText: "A DC 10", kind: "data", label: "A" }),
        expect.objectContaining({ address: 0x29, word: 0x0000, sourceText: "C DS 1", kind: "reserved", label: "C" })
      ])
    );
  });

  it("machine_code_highlights_pr", () => {
    const state = stateFromRaw(mockCaslCore.assemble(DEFAULT_CASL_SOURCE));
    const rows = selectMachineCodeRows(state);

    expect(rows.find((row) => row.address === 0x20)?.isCurrentPr).toBe(true);
  });

  it("machine_code_maps_to_casl_source", () => {
    const state = stateFromRaw(mockCaslCore.assemble(DEFAULT_CASL_SOURCE));
    const rows = selectMachineCodeRows(state);

    expect(rows.find((row) => row.address === 0x22)?.relatedCaslLine).toBe(3);
  });

  it("machine_code_maps_to_cpp_line", () => {
    const program = getDemoProgram("cpp-addition");
    expect(program).toBeDefined();
    const prepared = prepareSourceForCoreAssembly(program!.source, "cpp");
    expect(prepared.ok).toBe(true);
    const state = stateFromRaw(mockCaslCore.assemble(prepared.coreSourceText));

    const rows = selectMachineCodeRows(state, prepared.mapping);

    expect(rows.find((row) => row.sourceText === "LD GR1,A")?.relatedCppLine).toBe(5);
    expect(rows.find((row) => row.sourceText === "LD GR0,C")?.relatedCppLine).toBe(6);
  });

  it("machine_code_tab_visible_after_assemble", async () => {
    const state = stateFromRaw(mockCaslCore.assemble(DEFAULT_CASL_SOURCE));

    await renderOutputPanel(<OutputPanel lines={[]} state={state} initialTab="machine" onClear={() => undefined} />);

    expect(container?.querySelector('[data-testid="machine-code-output"]')?.textContent).toContain("COMET II Machine Code");
    expect(container?.querySelector('[data-testid="machine-code-output"]')?.textContent).toContain("1010");
  });

  it("decode_ld_instruction_word", () => {
    const state = stateFromRaw(mockCaslCore.assemble(DEFAULT_CASL_SOURCE));
    const rows = selectMachineCodeRows(state);
    const explanation = explainMachineCodeRow(rows.find((row) => row.address === 0x20)!);

    expect(explanation.mnemonic).toBe("LD");
    expect(explanation.wordRole).toBe("instruction");
    expect(explanation.opcode).toBe(0x10);
    expect(explanation.register).toBe(1);
    expect(explanation.indexRegister).toBe(0);
    expect(explanation.operandAddress).toBe(0x27);
    expect(explanation.resolvedLabel).toBe("A");
    expect(explanation.meaning).toContain("GR1");
  });

  it("decode_ld_operand_word", () => {
    const state = stateFromRaw(mockCaslCore.assemble(DEFAULT_CASL_SOURCE));
    const rows = selectMachineCodeRows(state);
    const explanation = explainMachineCodeRow(rows.find((row) => row.address === 0x21)!);

    expect(explanation.wordRole).toBe("operand");
    expect(explanation.operandAddress).toBe(0x27);
    expect(explanation.resolvedLabel).toBe("A");
    expect(explanation.meaning).toContain("address of A");
  });

  it("decode_adda_instruction_word", () => {
    const state = stateFromRaw(mockCaslCore.assemble(DEFAULT_CASL_SOURCE));
    const rows = selectMachineCodeRows(state);
    const explanation = explainMachineCodeRow(rows.find((row) => row.address === 0x22)!);

    expect(explanation.mnemonic).toBe("ADDA");
    expect(explanation.opcode).toBe(0x20);
    expect(explanation.register).toBe(1);
    expect(explanation.operandAddress).toBe(0x28);
    expect(explanation.resolvedLabel).toBe("B");
  });

  it("decode_ret_word", () => {
    const state = stateFromRaw(mockCaslCore.assemble(DEFAULT_CASL_SOURCE));
    const rows = selectMachineCodeRows(state);
    const explanation = explainMachineCodeRow(rows.find((row) => row.address === 0x26)!);

    expect(explanation.mnemonic).toBe("RET");
    expect(explanation.wordRole).toBe("instruction");
    expect(explanation.opcode).toBe(0x81);
    expect(explanation.meaning).toContain("finish execution");
  });

  it("decode_data_word", () => {
    const state = stateFromRaw(mockCaslCore.assemble(DEFAULT_CASL_SOURCE));
    const rows = selectMachineCodeRows(state);
    const explanation = explainMachineCodeRow(rows.find((row) => row.address === 0x27)!);

    expect(explanation.wordRole).toBe("data");
    expect(explanation.resolvedLabel).toBe("A");
    expect(explanation.meaning).toContain("Data value");
  });

  it("machine_code_explanation_resolves_label", () => {
    const state = stateFromRaw(mockCaslCore.assemble(DEFAULT_CASL_SOURCE));
    const rows = selectMachineCodeRows(state);
    const row = rows.find((entry) => entry.address === 0x23);

    expect(row?.resolvedLabel).toBe("B");
    expect(explainMachineCodeRow(row!).meaning).toContain("address of B");
  });

  it("machine_code_panel_defaults_to_current_pr", async () => {
    const state = stateFromRaw(mockCaslCore.assemble(DEFAULT_CASL_SOURCE));

    await renderOutputPanel(<OutputPanel lines={[]} state={state} initialTab="machine" onClear={() => undefined} />);

    expect(container?.querySelector('[data-testid="machine-code-row-0020"]')?.getAttribute("data-selected")).toBe("true");
    const explanationText = container?.querySelector('[data-testid="machine-code-explanation"]')?.textContent ?? "";
    expect(explanationText).toContain("0020");
    expect(explanationText).toContain("LD");
    expect(explanationText).toContain("GR1");
  });

  it("machine_code_panel_updates_on_row_select", async () => {
    const state = stateFromRaw(mockCaslCore.assemble(DEFAULT_CASL_SOURCE));

    await renderOutputPanel(<OutputPanel lines={[]} state={state} initialTab="machine" onClear={() => undefined} />);
    await act(async () => {
      (container?.querySelector('[data-testid="machine-code-row-0021"]') as HTMLDivElement).click();
    });

    expect(container?.querySelector('[data-testid="machine-code-row-0021"]')?.getAttribute("data-selected")).toBe("true");
    const explanationText = container?.querySelector('[data-testid="machine-code-explanation"]')?.textContent ?? "";
    expect(explanationText).toContain("operand word");
    expect(explanationText).toContain("address of A");
  });

  it("cpp_addition_shows_generated_casl_and_machine_code", async () => {
    const program = getDemoProgram("cpp-addition");
    expect(program).toBeDefined();
    const prepared = prepareSourceForCoreAssembly(program!.source, "cpp");
    expect(prepared.ok).toBe(true);
    const state = stateFromRaw(mockCaslCore.assemble(prepared.coreSourceText));

    await renderOutputPanel(
      <OutputPanel
        lines={[]}
        state={state}
        sourceMode="cpp"
        generatedCaslSource={prepared.generatedCaslSource}
        cppToCaslMapping={prepared.mapping}
        initialTab="machine"
        onClear={() => undefined}
      />
    );

    const text = container?.querySelector('[data-testid="machine-code-output"]')?.textContent ?? "";
    expect(text).toContain("LD GR1,A");
    expect(text).toContain("1010");
    expect(text).toContain("L5");
  });

  it("machine_code_rows_for_sum", () => {
    const program = getDemoProgram("cpp-for-sum");
    expect(program).toBeDefined();
    const prepared = prepareSourceForCoreAssembly(program!.source, "cpp");
    expect(prepared.ok).toBe(true);
    const state = stateFromRaw(mockCaslCore.assemble(prepared.coreSourceText));

    const rows = selectMachineCodeRows(state, prepared.mapping);

    expect(rows.some((row) => row.sourceText.includes("FOR_BEGIN_0 LD GR1,I"))).toBe(true);
    expect(rows.some((row) => row.sourceText.includes("JUMP FOR_BEGIN_0"))).toBe(true);
    expect(rows.some((row) => row.relatedCppLine === 4 && row.sourceText.includes("CPA"))).toBe(true);
  });

  it("machine_code_explanation_for_for_generated_jump", () => {
    const program = getDemoProgram("cpp-for-sum");
    expect(program).toBeDefined();
    const prepared = prepareSourceForCoreAssembly(program!.source, "cpp");
    expect(prepared.ok).toBe(true);
    const state = stateFromRaw(mockCaslCore.assemble(prepared.coreSourceText));
    const rows = selectMachineCodeRows(state, prepared.mapping);

    const jumpRow = rows.find((row) => row.sourceText.includes("JUMP FOR_BEGIN_0") && row.kind === "instruction");
    expect(jumpRow).toBeDefined();
    const explanation = explainMachineCodeRow(jumpRow!);

    expect(explanation.mnemonic).toBe("JUMP");
    expect(explanation.opcode).toBe(0x64);
    expect(explanation.meaning).toContain("FOR_BEGIN_0");
  });

  it("machine_code_rows_for_increment_sugar", () => {
    const program = getDemoProgram("cpp-for-sum-sugar");
    expect(program).toBeDefined();
    const prepared = prepareSourceForCoreAssembly(program!.source, "cpp");
    expect(prepared.ok).toBe(true);
    const state = stateFromRaw(mockCaslCore.assemble(prepared.coreSourceText));

    const rows = selectMachineCodeRows(state, prepared.mapping);

    expect(rows.some((row) => row.sourceText.includes("ADDA GR1,CONST_1") && row.relatedCppLine === 4)).toBe(true);
    expect(rows.some((row) => row.sourceText.includes("ST GR1,I") && row.relatedCppLine === 4)).toBe(true);
  });

  it("machine_code_explanation_for_increment_sugar", () => {
    const program = getDemoProgram("cpp-for-sum-sugar");
    expect(program).toBeDefined();
    const prepared = prepareSourceForCoreAssembly(program!.source, "cpp");
    expect(prepared.ok).toBe(true);
    const state = stateFromRaw(mockCaslCore.assemble(prepared.coreSourceText));
    const rows = selectMachineCodeRows(state, prepared.mapping);

    const addaRow = rows.find((row) => row.sourceText.includes("ADDA GR1,CONST_1") && row.kind === "instruction");
    expect(addaRow).toBeDefined();
    const explanation = explainMachineCodeRow(addaRow!);

    expect(explanation.mnemonic).toBe("ADDA");
    expect(explanation.register).toBe(1);
    expect(explanation.meaning).toContain("GR1");
  });

  it("machine_code_rows_break_continue_jump", () => {
    const program = getDemoProgram("cpp-break-continue");
    expect(program).toBeDefined();
    const prepared = prepareSourceForCoreAssembly(program!.source, "cpp");
    expect(prepared.ok).toBe(true);
    const state = stateFromRaw(mockCaslCore.assemble(prepared.coreSourceText));
    const rows = selectMachineCodeRows(state, prepared.mapping);

    expect(rows.some((row) => row.sourceText.includes("JUMP FOR_CONTINUE_0") && row.relatedCppLine === 6)).toBe(true);
    expect(rows.some((row) => row.sourceText.includes("JUMP FOR_END_0") && row.relatedCppLine === 10)).toBe(true);
  });

  it("machine_code_explanation_break_continue_jump", () => {
    const program = getDemoProgram("cpp-break-continue");
    expect(program).toBeDefined();
    const prepared = prepareSourceForCoreAssembly(program!.source, "cpp");
    expect(prepared.ok).toBe(true);
    const state = stateFromRaw(mockCaslCore.assemble(prepared.coreSourceText));
    const rows = selectMachineCodeRows(state, prepared.mapping);

    const continueJump = rows.find((row) => row.sourceText.includes("JUMP FOR_CONTINUE_0") && row.kind === "instruction");
    const breakJump = rows.find((row) => row.sourceText.includes("JUMP FOR_END_0") && row.kind === "instruction");
    expect(continueJump).toBeDefined();
    expect(breakJump).toBeDefined();
    expect(explainMachineCodeRow(continueJump!).meaning).toContain("FOR_CONTINUE_0");
    expect(explainMachineCodeRow(breakJump!).meaning).toContain("FOR_END_0");
  });
});
