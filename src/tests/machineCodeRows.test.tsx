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
    expect(explanation.indexRegister).toBeUndefined();
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

  it("machine_code_word_encodes_index_register", () => {
    let raw = mockCaslCore.assemble(getDemoProgram("casl-index-addressing")!.source);
    raw = mockCaslCore.step(raw);
    raw = mockCaslCore.step(raw);
    const state = stateFromRaw(raw);
    const rows = selectMachineCodeRows(state);
    const ldRow = rows.find((row) => row.sourceText.includes("LD GR1,A,GR2") && row.kind === "instruction");

    expect(ldRow).toEqual(expect.objectContaining({
      word: 0x1012,
      indexRegister: 2,
      indexValue: 1,
      baseAddress: 0x27,
      effectiveAddress: 0x28,
      effectiveLabel: "B"
    }));
  });

  it("machine_code_explanation_shows_index_register_and_effective_address", async () => {
    let raw = mockCaslCore.assemble(getDemoProgram("casl-index-addressing")!.source);
    raw = mockCaslCore.step(raw);
    raw = mockCaslCore.step(raw);
    const state = stateFromRaw(raw);
    const rows = selectMachineCodeRows(state);
    const ldRow = rows.find((row) => row.sourceText.includes("LD GR1,A,GR2") && row.kind === "instruction")!;
    const explanation = explainMachineCodeRow(ldRow);

    expect(explanation.indexRegister).toBe(2);
    expect(explanation.indexValue).toBe(1);
    expect(explanation.baseAddress).toBe(0x27);
    expect(explanation.effectiveAddress).toBe(0x28);
    expect(explanation.meaning).toContain("GR2(0001)");
    expect(explanation.meaning).toContain("B (0028)");

    await renderOutputPanel(<OutputPanel lines={[]} state={state} initialTab="machine" onClear={() => undefined} />);
    await act(async () => {
      (container?.querySelector('[data-testid="machine-code-row-0022"]') as HTMLDivElement).click();
    });
    const panelText = container?.querySelector('[data-testid="machine-code-explanation"]')?.textContent ?? "";
    expect(panelText).toContain("x = GR2");
    expect(panelText).toContain("0028");
    expect(panelText).toContain("B");
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

  it("machine_code_rows_new_instructions", () => {
    const program = getDemoProgram("casl-logic-operations");
    expect(program).toBeDefined();
    const state = stateFromRaw(mockCaslCore.assemble(program!.source));
    const rows = selectMachineCodeRows(state);

    expect(rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ sourceText: "AND GR1,MASK", word: 0x3010, kind: "instruction" }),
      expect.objectContaining({ sourceText: "OR GR1,B", word: 0x3110, kind: "instruction" }),
      expect.objectContaining({ sourceText: "XOR GR1,C", word: 0x3210, kind: "instruction" })
    ]));
  });

  it("machine_code_explanation_addl", () => {
    const program = getDemoProgram("casl-logical-add-compare");
    expect(program).toBeDefined();
    const state = stateFromRaw(mockCaslCore.assemble(program!.source));
    const rows = selectMachineCodeRows(state);
    const addlRow = rows.find((row) => row.sourceText === "ADDL GR1,B" && row.kind === "instruction");

    expect(addlRow).toBeDefined();
    const explanation = explainMachineCodeRow(addlRow!);

    expect(explanation.mnemonic).toBe("ADDL");
    expect(explanation.opcode).toBe(0x22);
    expect(explanation.register).toBe(1);
    expect(explanation.meaning).toContain("Unsigned add");
  });

  it("machine_code_explanation_logic_ops", () => {
    const program = getDemoProgram("casl-logic-operations");
    expect(program).toBeDefined();
    const state = stateFromRaw(mockCaslCore.assemble(program!.source));
    const rows = selectMachineCodeRows(state);

    const andExplanation = explainMachineCodeRow(rows.find((row) => row.sourceText === "AND GR1,MASK" && row.kind === "instruction")!);
    const orExplanation = explainMachineCodeRow(rows.find((row) => row.sourceText === "OR GR1,B" && row.kind === "instruction")!);
    const xorExplanation = explainMachineCodeRow(rows.find((row) => row.sourceText === "XOR GR1,C" && row.kind === "instruction")!);

    expect(andExplanation.meaning).toContain("Bitwise AND");
    expect(orExplanation.meaning).toContain("Bitwise OR");
    expect(xorExplanation.meaning).toContain("Bitwise XOR");
  });

  it("machine_code_rows_shift_instructions", () => {
    const program = getDemoProgram("casl-shift-operations");
    expect(program).toBeDefined();
    const state = stateFromRaw(mockCaslCore.assemble(program!.source));
    const rows = selectMachineCodeRows(state);

    expect(rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ sourceText: "SLL GR1,1", word: 0x5210, kind: "instruction" }),
      expect.objectContaining({ sourceText: "SRL GR1,1", word: 0x5310, kind: "instruction" }),
      expect.objectContaining({ sourceText: "SLA GR1,1", word: 0x5010, kind: "instruction" }),
      expect.objectContaining({ sourceText: "SRA GR1,1", word: 0x5110, kind: "instruction" }),
      expect.objectContaining({ sourceText: "SLL GR1,1", word: 0x0001, kind: "operand", meaning: "shift count / effective address" })
    ]));
  });

  it("machine_code_explanation_shift_instruction", () => {
    const program = getDemoProgram("casl-shift-operations");
    expect(program).toBeDefined();
    const state = stateFromRaw(mockCaslCore.assemble(program!.source));
    const rows = selectMachineCodeRows(state);
    const sllRow = rows.find((row) => row.sourceText === "SLL GR1,1" && row.kind === "instruction");
    const operandRow = rows.find((row) => row.sourceText === "SLL GR1,1" && row.kind === "operand");

    expect(sllRow).toBeDefined();
    const explanation = explainMachineCodeRow(sllRow!);
    expect(explanation.mnemonic).toBe("SLL");
    expect(explanation.opcode).toBe(0x52);
    expect(explanation.register).toBe(1);
    expect(explanation.meaning).toContain("Logical left shift");
    expect(explanation.meaning).toContain("shifted-out bit");

    expect(operandRow).toBeDefined();
    expect(explainMachineCodeRow(operandRow!).meaning).toContain("not a memory data read");
  });

  it("machine_code_jump_explanation_shows_target", async () => {
    const program = getDemoProgram("cpp-break-continue");
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

    const jumpRow = container?.querySelector('[data-flow-kind="break"]');
    expect(jumpRow).toBeDefined();
    await act(async () => {
      (jumpRow as HTMLDivElement).click();
    });

    const explanationText = container?.querySelector('[data-testid="machine-code-explanation"]')?.textContent ?? "";
    expect(explanationText).toContain("Control Flow Target");
    expect(explanationText).toContain("FOR_END_0");
    expect(explanationText).toContain("break");
  });

  it("machine_code_jump_explanation_for_continue", async () => {
    const program = getDemoProgram("cpp-break-continue");
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

    const jumpRow = [...(container?.querySelectorAll('[data-testid^="machine-code-row-"]') ?? [])].find((row) => row.textContent?.includes("JUMP FOR_CONTINUE_0"));
    expect(jumpRow).toBeDefined();
    await act(async () => {
      (jumpRow as HTMLDivElement).click();
    });

    const explanationText = container?.querySelector('[data-testid="machine-code-explanation"]')?.textContent ?? "";
    expect(explanationText).toContain("FOR_CONTINUE_0");
    expect(explanationText).toContain("continue");
  });

  it("machine_code_jump_explanation_for_break", async () => {
    const program = getDemoProgram("cpp-break-continue");
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

    const jumpRow = container?.querySelector('[data-flow-kind="break"]');
    expect(jumpRow).toBeDefined();
    await act(async () => {
      (jumpRow as HTMLDivElement).click();
    });

    expect(container?.querySelector('[data-testid="machine-code-control-flow-target"]')?.textContent).toContain("FOR_END_0");
  });

  it("machine_code_rows_push_pop", () => {
    const program = getDemoProgram("casl-push-pop-stack");
    expect(program).toBeDefined();
    const state = stateFromRaw(mockCaslCore.assemble(program!.source));
    const rows = selectMachineCodeRows(state);

    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ address: 0x22, word: 0x7002, sourceText: "PUSH A,GR2", kind: "instruction" }),
        expect.objectContaining({ address: 0x23, word: 0x0028, sourceText: "PUSH A,GR2", kind: "operand", meaning: expect.stringContaining("effective address value to push") }),
        expect.objectContaining({ address: 0x24, word: 0x7110, sourceText: "POP GR1", kind: "instruction" })
      ])
    );
  });

  it("machine_code_explanation_push", () => {
    let state = mockCaslCore.assemble(getDemoProgram("casl-push-pop-stack")!.source);
    state = mockCaslCore.step(state);
    state = mockCaslCore.step(state);
    const rows = selectMachineCodeRows(stateFromRaw(state));
    const explanation = explainMachineCodeRow(rows.find((row) => row.address === 0x22)!);

    expect(explanation.mnemonic).toBe("PUSH");
    expect(explanation.indexRegister).toBe(2);
    expect(explanation.baseAddress).toBe(0x28);
    expect(explanation.effectiveAddress).toBe(0x29);
    expect(explanation.meaning).toContain("stores the address value");
  });

  it("machine_code_explanation_pop", () => {
    const state = stateFromRaw(mockCaslCore.assemble(getDemoProgram("casl-push-pop-stack")!.source));
    const rows = selectMachineCodeRows(state);
    const explanation = explainMachineCodeRow(rows.find((row) => row.address === 0x24)!);

    expect(explanation.mnemonic).toBe("POP");
    expect(explanation.register).toBe(1);
    expect(explanation.meaning).toContain("Load memory[SP] into GR1");
  });

  it("machine_code_rows_call", () => {
    const state = stateFromRaw(mockCaslCore.assemble(getDemoProgram("casl-call-return")!.source));
    const rows = selectMachineCodeRows(state);

    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ address: 0x22, word: 0x8000, sourceText: "CALL SUB", kind: "instruction" }),
        expect.objectContaining({ address: 0x23, word: 0x0027, sourceText: "CALL SUB", kind: "operand", meaning: expect.stringContaining("subroutine target address") })
      ])
    );
  });

  it("machine_code_explanation_call", () => {
    let state = mockCaslCore.assemble(getDemoProgram("casl-call-return")!.source);
    state = mockCaslCore.step(state);
    state = mockCaslCore.step(state);
    const rows = selectMachineCodeRows(state);
    const explanation = explainMachineCodeRow(rows.find((row) => row.address === 0x22)!);

    expect(explanation.mnemonic).toBe("CALL");
    expect(explanation.opcode).toBe(0x80);
    expect(explanation.meaning).toContain("Push return address");
    expect(explanation.effectiveAddress).toBe(0x27);
    expect(explanation.returnAddress).toBe(0x24);
    expect(explanation.stackAddress).toBe(0xfffd);
    expect(explanation.callDepthBefore).toBe(0);
    expect(explanation.callDepthAfter).toBe(1);
    expect(explanation.meaning).toContain("stack write MEM[FFFD]");
    expect(explanation.meaning).toContain("callDepth 0 -> 1");
  });

  it("machine_code_explanation_ret_stack_vs_finish", () => {
    let stackState = mockCaslCore.assemble(getDemoProgram("casl-call-return")!.source);
    for (let index = 0; index < 4; index += 1) stackState = mockCaslCore.step(stackState);
    const stackRows = selectMachineCodeRows(stackState);
    const stackRet = explainMachineCodeRow(stackRows.find((row) => row.address === 0x29)!);
    const finishRows = selectMachineCodeRows(stateFromRaw(mockCaslCore.assemble(getDemoProgram("casl-call-return")!.source)));
    const topLevelRet = explainMachineCodeRow(finishRows.find((row) => row.address === 0x26)!);

    expect(stackRet.meaning).toContain("Stack return");
    expect(stackRet.meaning).toContain("MEM[FFFD]");
    expect(stackRet.meaning).toContain("callDepth 1 -> 0");
    expect(stackRet.returnAddress).toBe(0x24);
    expect(stackRet.stackAddress).toBe(0xfffd);
    expect(stackRet.isStackReturnContext).toBe(true);
    expect(topLevelRet.meaning).toContain("Top-level return");
    expect(topLevelRet.isStackReturnContext).toBe(false);
  });

  it("machine_code_ret_explanation_distinguishes_stack_return_and_finish_in_panel", async () => {
    let stackState = mockCaslCore.assemble(getDemoProgram("casl-call-return")!.source);
    for (let index = 0; index < 4; index += 1) stackState = mockCaslCore.step(stackState);
    await renderOutputPanel(<OutputPanel lines={[]} state={stackState} initialTab="machine" onClear={() => undefined} />);
    await act(async () => {
      (container?.querySelector('[data-testid="machine-code-row-0029"]') as HTMLDivElement).click();
    });
    let explanationText = container?.querySelector('[data-testid="machine-code-explanation"]')?.textContent ?? "";
    expect(explanationText).toContain("RET Mode");
    expect(explanationText).toContain("stack return");
    expect(explanationText).toContain("MEM[FFFD]");

    await act(async () => {
      root?.unmount();
    });
    container?.remove();
    root = null;
    container = null;

    const finishState = stateFromRaw(mockCaslCore.assemble(getDemoProgram("casl-call-return")!.source));
    await renderOutputPanel(<OutputPanel lines={[]} state={finishState} initialTab="machine" onClear={() => undefined} />);
    const finishContainer = container as unknown as HTMLDivElement;
    await act(async () => {
      (finishContainer.querySelector('[data-testid="machine-code-row-0026"]') as HTMLDivElement).click();
    });
    explanationText = finishContainer.querySelector('[data-testid="machine-code-explanation"]')?.textContent ?? "";
    expect(explanationText).toContain("RET Mode");
    expect(explanationText).toContain("top-level finish");
  });

  it("generated_casl_shows_function_label", () => {
    const program = getDemoProgram("cpp-function-call");
    expect(program).toBeDefined();
    const prepared = prepareSourceForCoreAssembly(program!.source, "cpp");
    expect(prepared.ok).toBe(true);

    expect(prepared.generatedCaslSource).toContain("FUNC_ADDONE");
    expect(prepared.mapping.some((entry) => entry.kind === "function-label" && entry.cppLine === 1)).toBe(true);
  });

  it("machine_code_explanation_shows_call_from_cpp_function", () => {
    const program = getDemoProgram("cpp-function-call");
    expect(program).toBeDefined();
    const prepared = prepareSourceForCoreAssembly(program!.source, "cpp");
    expect(prepared.ok).toBe(true);
    let state = mockCaslCore.assemble(prepared.coreSourceText);
    state = mockCaslCore.step(state);

    const rows = selectMachineCodeRows(state, prepared.mapping);
    const callRow = rows.find((row) => row.sourceText === "CALL FUNC_ADDONE" && row.kind === "instruction");
    expect(callRow).toBeDefined();
    const explanation = explainMachineCodeRow(callRow!);

    expect(callRow!.relatedCppLine).toBe(7);
    expect(explanation.mnemonic).toBe("CALL");
    expect(explanation.returnAddress).toBe(0x22);
    expect(explanation.stackAddress).toBe(0xfffd);
    expect(explanation.meaning).toContain("Push return address");
  });

  it("source_mapping_function_call_line", () => {
    const program = getDemoProgram("cpp-function-call");
    expect(program).toBeDefined();
    const prepared = prepareSourceForCoreAssembly(program!.source, "cpp");
    expect(prepared.ok).toBe(true);
    const state = stateFromRaw(mockCaslCore.assemble(prepared.coreSourceText));
    const rows = selectMachineCodeRows(state, prepared.mapping);

    expect(rows.find((row) => row.sourceText === "CALL FUNC_ADDONE")?.relatedCppLine).toBe(7);
    expect(rows.find((row) => row.sourceText === "ST GR0,MAIN_X")?.relatedCppLine).toBe(7);
  });

  it("generated_casl_shows_gr1_argument_load", () => {
    const program = getDemoProgram("cpp-function-argument");
    expect(program).toBeDefined();
    const prepared = prepareSourceForCoreAssembly(program!.source, "cpp");
    expect(prepared.ok).toBe(true);

    expect(prepared.generatedCaslSource).toContain("LAD   GR1,5");
    expect(prepared.mapping.some((entry) => entry.kind === "function-call" && entry.cppLine === 7)).toBe(true);
  });

  it("generated_casl_shows_parameter_save", () => {
    const program = getDemoProgram("cpp-function-argument");
    expect(program).toBeDefined();
    const prepared = prepareSourceForCoreAssembly(program!.source, "cpp");
    expect(prepared.ok).toBe(true);

    expect(prepared.generatedCaslSource).toContain("FUNC_ADDONE ST    GR1,FUNC_ADDONE_X");
    expect(prepared.generatedCaslSource).toContain("FUNC_ADDONE_X DS    1");
  });

  it("machine_code_shows_call_for_single_argument_function", () => {
    const program = getDemoProgram("cpp-function-argument");
    expect(program).toBeDefined();
    const prepared = prepareSourceForCoreAssembly(program!.source, "cpp");
    expect(prepared.ok).toBe(true);
    const state = stateFromRaw(mockCaslCore.assemble(prepared.coreSourceText));
    const rows = selectMachineCodeRows(state, prepared.mapping);

    expect(rows.find((row) => row.sourceText === "LAD GR1,5")).toBeDefined();
    const callRow = rows.find((row) => row.sourceText === "CALL FUNC_ADDONE" && row.kind === "instruction");
    expect(callRow).toBeDefined();
    expect(explainMachineCodeRow(callRow!).mnemonic).toBe("CALL");
  });
});
