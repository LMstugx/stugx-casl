import { describe, expect, it } from "vitest";
import { parseCpp } from "../cppParser";
import { transpileCppToCasl } from "../cppTranspiler";
import { buildFramePlans, type StackFramePlan } from "../framePlan";

function parseProgram(source: string) {
  const parsed = parseCpp(source);
  expect(parsed.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([]);
  expect(parsed.program).not.toBeNull();
  return parsed.program!;
}

function buildPlans(source: string) {
  return buildFramePlans(parseProgram(source));
}

function planByName(plans: StackFramePlan[], name: string): StackFramePlan {
  const plan = plans.find((candidate) => candidate.functionName === name);
  expect(plan).toBeDefined();
  return plan!;
}

const multiFunctionSource = `int add(int a, int b) {
    int c;
    c = a + b;
    return c;
}

int main() {
    int result;
    result = add(2, 3);
    return result;
}`;

describe("FramePlan generator scaffold", () => {
  it("represents double locals as four-word static storage", () => {
    const collection = buildPlans(`int main() {
    double value = 3.5;
    return 0;
}`);
    const slot = collection.functions[0].localSlots[0];
    expect(slot).toMatchObject({
      name: "value",
      sizeWords: 4,
      storage: "static-label-current",
      currentLowering: "static-label",
      labelForDebug: "VALUE"
    });
    expect(collection.functions[0].frameSizeWords).toBe(5);
  });

  it("frame_plan_exists_for_main", () => {
    const collection = buildPlans(`int main() {
    int x;
    return 0;
}`);

    expect(collection.functions.map((plan) => plan.functionName)).toContain("main");
  });

  it("frame_plan_exists_for_multiple_functions", () => {
    const collection = buildPlans(multiFunctionSource);

    expect(collection.functions.map((plan) => plan.functionName)).toEqual(["add", "main"]);
  });

  it("frame_plan_records_return_value_register_gr0", () => {
    const plan = planByName(buildPlans(multiFunctionSource).functions, "add");

    expect(plan.returnValueRegister).toBe("GR0");
  });

  it("frame_plan_records_argument_registers_gr1_gr2_gr3", () => {
    const collection = buildPlans(`int sum3(int a, int b, int c) {
    return a + b;
}

int main() {
    return sum3(1, 2, 3);
}`);
    const plan = planByName(collection.functions, "sum3");

    expect(plan.argumentRegisters).toEqual(["GR1", "GR2", "GR3"]);
  });

  it("frame_plan_records_return_address_slot", () => {
    const plan = planByName(buildPlans(multiFunctionSource).functions, "add");

    expect(plan.returnAddressSlot).toMatchObject({
      name: "return-address",
      kind: "return-address",
      offset: 0,
      sizeWords: 1,
      storage: "return-address-current",
      currentLowering: "call-stack-return-address",
      labelForDebug: "FUNC_ADD_RETURN_ADDRESS"
    });
  });

  it("frame_plan_records_argument_slots", () => {
    const plan = planByName(buildPlans(multiFunctionSource).functions, "add");

    expect(plan.argumentSlots.map((slot) => slot.name)).toEqual(["a", "b"]);
    expect(plan.argumentSlots.map((slot) => slot.labelForDebug)).toEqual(["FUNC_ADD_A", "FUNC_ADD_B"]);
    expect(plan.argumentSlots.map((slot) => slot.offset)).toEqual([1, 2]);
  });

  it("frame_plan_records_local_slots", () => {
    const plan = planByName(buildPlans(multiFunctionSource).functions, "add");

    expect(plan.localSlots.map((slot) => slot.name)).toEqual(["c"]);
    expect(plan.localSlots[0]).toMatchObject({
      kind: "local",
      offset: 3,
      sizeWords: 1,
      labelForDebug: "ADD_C"
    });
  });

  it("frame_plan_uses_static_label_current_for_locals", () => {
    const plan = planByName(buildPlans(multiFunctionSource).functions, "main");

    expect(plan.localSlots[0]).toMatchObject({
      name: "result",
      storage: "static-label-current",
      currentLowering: "static-label",
      labelForDebug: "MAIN_RESULT"
    });
  });

  it("frame_plan_uses_register_argument_storage_for_args", () => {
    const plan = planByName(buildPlans(multiFunctionSource).functions, "add");

    expect(plan.argumentSlots.every((slot) => slot.storage === "register-argument")).toBe(true);
    expect(plan.argumentSlots.every((slot) => slot.currentLowering === "static-label")).toBe(true);
  });

  it("frame_plan_does_not_change_transpiled_casl", () => {
    const before = transpileCppToCasl(multiFunctionSource);
    expect(before.ok).toBe(true);

    const collection = buildFramePlans(parseProgram(multiFunctionSource));
    const after = transpileCppToCasl(multiFunctionSource);

    expect(collection.functions).toHaveLength(2);
    expect(after.caslSource).toBe(before.caslSource);
    expect(after.mapping).toEqual(before.mapping);
  });

  it("frame_plan_for_no_arg_function_has_empty_argument_slots", () => {
    const collection = buildPlans(`int one() {
    return 1;
}

int main() {
    return one();
}`);
    const plan = planByName(collection.functions, "one");

    expect(plan.argumentRegisters).toEqual([]);
    expect(plan.argumentSlots).toEqual([]);
  });

  it("frame_plan_for_main_mentions_top_level_finish_warning", () => {
    const plan = planByName(buildPlans(multiFunctionSource).functions, "main");

    expect(plan.warnings.join("\n")).toContain("top-level finish compatibility");
  });

  it("frame_plan_frame_size_is_deterministic", () => {
    const first = planByName(buildPlans(multiFunctionSource).functions, "add");
    const second = planByName(buildPlans(multiFunctionSource).functions, "add");

    expect(first.frameSizeWords).toBe(4);
    expect(second.frameSizeWords).toBe(4);
    expect(first.argumentSlots.map((slot) => slot.offset)).toEqual(second.argumentSlots.map((slot) => slot.offset));
    expect(first.localSlots.map((slot) => slot.offset)).toEqual(second.localSlots.map((slot) => slot.offset));
  });

  it("frame_plan_has_no_temporary_slots_currently", () => {
    const plan = planByName(buildPlans(multiFunctionSource).functions, "add");

    expect(plan.temporarySlots).toEqual([]);
    expect(plan.warnings.join("\n")).toContain("Temporary frame slots are future work");
  });

  it("frame_plan_has_design_only_mode", () => {
    const collection = buildPlans(multiFunctionSource);

    expect(collection.functions.every((plan) => plan.mode === "design-only")).toBe(true);
    expect(collection.functions.every((plan) => plan.stackGrowth === "down")).toBe(true);
    expect(collection.functions.every((plan) => plan.usesFramePointer === false)).toBe(true);
    expect(collection.globalWarnings.join("\n")).toContain("does not change current transpiler output");
  });
});
