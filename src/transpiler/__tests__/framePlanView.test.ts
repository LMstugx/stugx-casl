import { describe, expect, it } from "vitest";
import {
  findFrameSlotMappingByStaticLabel,
  findFrameSlotMappingInCaslText,
  frameSlotMappingsForSourceLine,
  selectFrameSymbolRelations,
  selectStackFramePreviewState,
  stackFramePreviewMappings
} from "../framePlanView";
import { transpileCppToCasl } from "../cppTranspiler";

const functionArgumentsSource = `int add(int a, int b) {
    int c;
    c = a + b;
    return c;
}

int main() {
    int result;
    result = add(2, 3);
    return result;
}`;

describe("FramePlan preview selector", () => {
  it("frameplan_preview_available_for_cpp_function_source", () => {
    const preview = selectStackFramePreviewState("cpp", functionArgumentsSource, "add");

    expect(preview.available).toBe(true);
    expect(preview.mode).toBe("frameplan-preview");
    expect(preview.activeFunction?.functionName).toBe("add");
    expect(preview.activeFunction?.frameSizeWords).toBe(4);
  });

  it("frameplan_preview_unavailable_for_casl_mode", () => {
    const preview = selectStackFramePreviewState("casl", "MAIN START\n RET\n END");

    expect(preview.available).toBe(false);
    expect(preview.mode).toBe("simple-static-locals");
    expect(preview.reason).toContain("C++ source only");
  });

  it("frameplan_preview_unavailable_for_invalid_cpp", () => {
    const preview = selectStackFramePreviewState("cpp", "int main(");

    expect(preview.available).toBe(false);
    expect(preview.isRuntimeState).toBe(false);
    expect(preview.reason).toBeTruthy();
  });

  it("frameplan_preview_lists_main_and_other_functions", () => {
    const preview = selectStackFramePreviewState("cpp", functionArgumentsSource);

    expect(preview.functions.map((fn) => fn.functionName)).toEqual(["add", "main"]);
    expect(preview.selectedFunctionName).toBe("main");
  });

  it("frameplan_preview_marks_runtime_state_false", () => {
    const preview = selectStackFramePreviewState("cpp", functionArgumentsSource, "add");

    expect(preview.isRuntimeState).toBe(false);
    expect(preview.activeFunction?.returnValueRegister).toBe("GR0");
    expect(preview.activeFunction?.argumentRegisters).toEqual(["GR1", "GR2"]);
  });

  it("frameplan_preview_preserves_current_emitted_casl", () => {
    const before = transpileCppToCasl(functionArgumentsSource);
    const preview = selectStackFramePreviewState("cpp", functionArgumentsSource, "add");
    const after = transpileCppToCasl(functionArgumentsSource);

    expect(preview.available).toBe(true);
    expect(after.caslSource).toBe(before.caslSource);
    expect(after.mapping).toEqual(before.mapping);
  });

  it("frame_slot_mapping_exists_for_arguments", () => {
    const preview = selectStackFramePreviewState("cpp", functionArgumentsSource, "add");
    const mappings = preview.activeFunction?.slotMappings ?? [];

    expect(mappings.filter((mapping) => mapping.slotKind === "argument").map((mapping) => mapping.symbolName)).toEqual(["a", "b"]);
    expect(mappings.filter((mapping) => mapping.slotKind === "argument").map((mapping) => mapping.futureStorage)).toEqual(["register-argument", "register-argument"]);
    expect(mappings.find((mapping) => mapping.symbolName === "a")?.argumentRegister).toBe("GR1");
    expect(mappings.find((mapping) => mapping.symbolName === "b")?.argumentRegister).toBe("GR2");
  });

  it("frame_slot_mapping_exists_for_locals", () => {
    const preview = selectStackFramePreviewState("cpp", functionArgumentsSource, "add");
    const local = preview.activeFunction?.slotMappings.find((mapping) => mapping.slotKind === "local");

    expect(local).toMatchObject({
      functionName: "add",
      symbolName: "c",
      frameSlotName: "c",
      futureStorage: "future-stack-slot"
    });
  });

  it("frame_slot_mapping_includes_current_static_label", () => {
    const preview = selectStackFramePreviewState("cpp", functionArgumentsSource, "add");
    const mappings = preview.activeFunction?.slotMappings ?? [];

    expect(mappings.find((mapping) => mapping.symbolName === "a")?.currentLabelForDebug).toBe("FUNC_ADD_A");
    expect(mappings.find((mapping) => mapping.symbolName === "b")?.currentLabelForDebug).toBe("FUNC_ADD_B");
    expect(mappings.find((mapping) => mapping.symbolName === "c")?.currentLabelForDebug).toBe("ADD_C");
    expect(mappings.find((mapping) => mapping.symbolName === "c")?.currentLowering).toBe("static-label");
  });

  it("frame_slot_mapping_marks_runtime_values_unavailable", () => {
    const preview = selectStackFramePreviewState("cpp", functionArgumentsSource, "add");
    const mappings = preview.activeFunction?.slotMappings ?? [];

    expect(mappings.length).toBeGreaterThan(0);
    expect(mappings.every((mapping) => mapping.runtimeValueAvailable === false)).toBe(true);
    expect(mappings.map((mapping) => mapping.explanation).join("\n")).toContain("Current lowering");
  });

  it("signal_probe_shows_selected_argument_slot_relation", () => {
    const preview = selectStackFramePreviewState("cpp", functionArgumentsSource, "add");
    const argument = preview.activeFunction?.slotMappings.find((mapping) => mapping.symbolName === "a");

    expect(argument?.currentCircuitRelation).toBe("GR1 -> FUNC_ADD_A");
    expect(argument?.futureCircuitRelation).toBe("stack frame argument slot");
    expect(argument?.signalProbeRelationRows.map((row) => `${row.label}:${row.value}:${row.note}`)).toEqual([
      "Slot:a:argument",
      "Current:GR1:-> FUNC_ADD_A",
      "Future:frame arg:not runtime"
    ]);
  });

  it("signal_probe_shows_selected_local_slot_relation", () => {
    const preview = selectStackFramePreviewState("cpp", functionArgumentsSource, "add");
    const local = preview.activeFunction?.slotMappings.find((mapping) => mapping.symbolName === "c");

    expect(local?.currentCircuitRelation).toBe("static label ADD_C");
    expect(local?.futureCircuitRelation).toBe("stack frame local slot");
    expect(local?.signalProbeRelationRows.map((row) => `${row.label}:${row.value}:${row.note}`)).toEqual([
      "Slot:c:local",
      "Current:ADD_C:static label",
      "Future:frame local:not runtime"
    ]);
  });

  it("signal_probe_shows_return_address_slot_relation", () => {
    const preview = selectStackFramePreviewState("cpp", functionArgumentsSource, "add");
    const returnAddress = preview.activeFunction?.slotMappings.find((mapping) => mapping.slotKind === "return-address");

    expect(returnAddress?.currentCircuitRelation).toBe("CALL/RET return-address stack path");
    expect(returnAddress?.futureCircuitRelation).toBe("stack frame return-address slot");
    expect(returnAddress?.signalProbeRelationRows.map((row) => `${row.label}:${row.value}:${row.note}`)).toEqual([
      "Slot:return:return-address",
      "Current:CALL/RET:stack path",
      "Future:frame return:trace only"
    ]);
  });

  it("emitted_casl_unchanged_after_slot_mapping", () => {
    const before = transpileCppToCasl(functionArgumentsSource);
    const preview = selectStackFramePreviewState("cpp", functionArgumentsSource, "add");
    const mappingSummary = preview.activeFunction?.slotMappings.map((mapping) => `${mapping.symbolName}:${mapping.currentLabelForDebug ?? ""}`).join(",");
    const after = transpileCppToCasl(functionArgumentsSource);

    expect(mappingSummary).toContain("a:FUNC_ADD_A");
    expect(after.caslSource).toBe(before.caslSource);
    expect(after.mapping).toEqual(before.mapping);
  });

  it("source_symbol_relation_finds_frame_slots_by_source_line", () => {
    const preview = selectStackFramePreviewState("cpp", functionArgumentsSource, "add");
    const mappings = stackFramePreviewMappings(preview);
    const lineOneMappings = frameSlotMappingsForSourceLine(mappings, 1);

    expect(lineOneMappings.map((mapping) => mapping.symbolName)).toEqual(["a", "b"]);
    expect(lineOneMappings.every((mapping) => mapping.slotKind === "argument")).toBe(true);
  });

  it("generated_casl_static_label_relation_finds_frame_slot", () => {
    const preview = selectStackFramePreviewState("cpp", functionArgumentsSource, "add");
    const mappings = stackFramePreviewMappings(preview);

    expect(findFrameSlotMappingByStaticLabel(mappings, "FUNC_ADD_A")?.symbolName).toBe("a");
    expect(findFrameSlotMappingInCaslText(mappings, "ST GR1,FUNC_ADD_A")?.symbolName).toBe("a");
    expect(findFrameSlotMappingInCaslText(mappings, "ST GR2,FUNC_ADD_B")?.symbolName).toBe("b");
  });

  it("editor_symbol_relations_exist_for_arguments", () => {
    const relations = selectFrameSymbolRelations("cpp", functionArgumentsSource);
    const argumentsOnly = relations.filter((relation) => relation.functionName === "add" && relation.slotKind === "argument");

    expect(argumentsOnly.map((relation) => relation.symbolName)).toEqual(["a", "b"]);
    expect(argumentsOnly.map((relation) => relation.currentCircuitRelation)).toEqual(["GR1 -> FUNC_ADD_A", "GR2 -> FUNC_ADD_B"]);
  });

  it("editor_symbol_relations_exist_for_locals", () => {
    const relations = selectFrameSymbolRelations("cpp", functionArgumentsSource);
    const result = relations.find((relation) => relation.functionName === "main" && relation.symbolName === "result");

    expect(result).toMatchObject({
      slotKind: "local",
      currentLabelForDebug: "MAIN_RESULT",
      futureCircuitRelation: "stack frame local slot"
    });
  });

  it("editor_symbol_relation_includes_static_label", () => {
    const relations = selectFrameSymbolRelations("cpp", functionArgumentsSource);
    const a = relations.find((relation) => relation.symbolName === "a");

    expect(a?.currentLabelForDebug).toBe("FUNC_ADD_A");
    expect(a?.title).toContain("Current: GR1 -> FUNC_ADD_A");
    expect(a?.title).toContain("Future: stack frame argument slot");
  });

  it("editor_symbol_relation_marks_runtime_unavailable", () => {
    const relations = selectFrameSymbolRelations("cpp", functionArgumentsSource);

    expect(relations.length).toBeGreaterThan(0);
    expect(relations.every((relation) => relation.runtimeValueAvailable === false)).toBe(true);
    expect(relations.every((relation) => relation.title.includes("Runtime: not available in simple mode"))).toBe(true);
  });

  it("source_editor_handles_invalid_cpp_without_crash", () => {
    expect(selectFrameSymbolRelations("cpp", "int main(")).toEqual([]);
  });

  it("source_editor_does_not_render_markers_for_casl_mode", () => {
    expect(selectFrameSymbolRelations("casl", "MAIN START\n RET\n END")).toEqual([]);
  });
});
