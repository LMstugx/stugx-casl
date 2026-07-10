import { describe, expect, it } from "vitest";
import {
  findFrameSlotMappingByStaticLabel,
  findFrameSlotMappingInCaslText,
  frameSlotMappingsForSourceLine,
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
});
