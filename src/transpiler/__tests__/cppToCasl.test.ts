import { describe, expect, it } from "vitest";
import { mockCaslCore } from "../../core/mockCaslCore";
import { transpileCppToCasl } from "../cppTranspiler";
import { caslLinesForCppLine, cppLineForCaslLine } from "../cppMapping";

function expectOk(source: string) {
  const result = transpileCppToCasl(source);
  expect(result.diagnostics).toEqual([]);
  expect(result.ok).toBe(true);
  return result;
}

function runToEnd(caslSource: string) {
  let state = mockCaslCore.assemble(caslSource);
  for (let steps = 0; steps < 200 && state.runState !== "Finished" && state.runState !== "Error"; steps += 1) {
    state = mockCaslCore.step(state);
  }
  return state;
}

describe("C++ subset to CASL generator", () => {
  it("transpile_addition", () => {
    const result = expectOk(`int main() {
    int a = 10;
    int b = 20;
    int c;
    c = a + b;
    return c;
}`);

    expect(result.caslSource).toContain("MAIN START");
    expect(result.caslSource).toContain("     LD    GR1,A");
    expect(result.caslSource).toContain("     ADDA  GR1,B");
    expect(result.caslSource).toContain("     ST    GR1,C");
    expect(result.caslSource).toContain("     LD    GR0,C");
    expect(result.caslSource).toContain("A DC    10");
    expect(result.caslSource).toContain("B DC    20");
    expect(result.caslSource).toContain("C DS    1");
  });

  it("transpile_subtraction", () => {
    const result = expectOk(`int main() {
    int a = 20;
    int b = 5;
    int c;
    c = a - b;
    return c;
}`);

    expect(result.caslSource).toContain("     SUBA  GR1,B");
  });

  it("transpile_return_literal", () => {
    const result = expectOk(`int main() {
    return 0;
}`);

    expect(result.caslSource).toContain("     LAD   GR0,0");
    expect(result.caslSource).toContain("     RET");
  });

  it("transpile_return_variable", () => {
    const result = expectOk(`int main() {
    int c = 7;
    return c;
}`);

    expect(result.caslSource).toContain("     LD    GR0,C");
  });

  it("assembles and runs addition through the existing mock core", () => {
    const result = expectOk(`int main() {
    int a = 10;
    int b = 20;
    int c;
    c = a + b;
    return c;
}`);
    let state = mockCaslCore.assemble(result.caslSource);
    while (state.runState !== "Finished" && state.runState !== "Error") {
      state = mockCaslCore.step(state);
    }

    expect(state.runState).toBe("Finished");
    expect(state.memory[state.symbols.C]).toBe(0x001e);
    expect(state.gr[0]).toBe(0x001e);
  });

  it("assembles and runs subtraction through the existing mock core", () => {
    const result = expectOk(`int main() {
    int a = 20;
    int b = 5;
    int c;
    c = a - b;
    return c;
}`);
    let state = mockCaslCore.assemble(result.caslSource);
    while (state.runState !== "Finished" && state.runState !== "Error") {
      state = mockCaslCore.step(state);
    }

    expect(state.runState).toBe("Finished");
    expect(state.memory[state.symbols.C]).toBe(0x000f);
    expect(state.gr[0]).toBe(0x000f);
  });

  it("transpile_if_equal_then", () => {
    const result = expectOk(`int main() {
    int a = 10;
    int b = 10;
    int c;
    if (a == b) {
        c = 1;
    }
    return c;
}`);

    expect(result.caslSource).toContain("     CPA   GR1,B");
    expect(result.caslSource).toContain("     JZE   IF_TRUE_0");
    expect(result.caslSource).toContain("IF_TRUE_0 LAD   GR1,1");
  });

  it("transpile_if_equal_else", () => {
    const result = expectOk(`int main() {
    int a = 10;
    int b = 10;
    int c;
    if (a == b) {
        c = 1;
    } else {
        c = 0;
    }
    return c;
}`);

    expect(result.caslSource).toContain("     JZE   IF_TRUE_0");
    expect(result.caslSource).toContain("     JUMP  IF_END_0");
    expect(result.caslSource).toContain("IF_END_0 LD    GR0,C");
  });

  it.each([
    ["transpile_if_not_equal", "!=", "JNZ"],
    ["transpile_if_less", "<", "JMI"],
    ["transpile_if_greater", ">", "JPL"]
  ])("%s", (_name, operator, jump) => {
    const result = expectOk(`int main() {
    int a = 5;
    int b = 10;
    int c;
    if (a ${operator} b) {
        c = 1;
    }
    return c;
}`);

    expect(result.caslSource).toContain(`     ${jump.padEnd(5, " ")} IF_TRUE_0`);
  });

  it("transpile_if_less_equal", () => {
    const result = expectOk(`int main() {
    int a = 5;
    int b = 10;
    int c;
    if (a <= b) {
        c = 1;
    }
    return c;
}`);

    expect(result.caslSource).toContain("     JMI   IF_TRUE_0");
    expect(result.caslSource).toContain("     JZE   IF_TRUE_0");
  });

  it("transpile_if_greater_equal", () => {
    const result = expectOk(`int main() {
    int a = 10;
    int b = 10;
    int c;
    if (a >= b) {
        c = 1;
    }
    return c;
}`);

    expect(result.caslSource).toContain("     JPL   IF_TRUE_0");
    expect(result.caslSource).toContain("     JZE   IF_TRUE_0");
  });

  it("transpile_if_literal_compare", () => {
    const result = expectOk(`int main() {
    int a = 10;
    int c;
    if (a == 10) {
        c = 1;
    }
    return c;
}`);

    expect(result.caslSource).toContain("     CPA   GR1,CONST_10");
    expect(result.caslSource).toContain("CONST_10 DC    10");
  });

  it("mapping_if_condition", () => {
    const result = expectOk(`int main() {
    int a = 10;
    int b = 10;
    int c;
    if (a == b) {
        c = 1;
    } else {
        c = 0;
    }
    return c;
}`);

    const conditionRows = result.mapping.filter((entry) => entry.kind === "if-condition" && entry.cppLine === 5).flatMap((entry) => entry.caslLines);
    expect(conditionRows.length).toBeGreaterThanOrEqual(3);
    expect(cppLineForCaslLine(result.mapping, conditionRows[0])).toBe(5);
  });

  it("current CASL rows map to C++ if, then, and else lines", () => {
    const result = expectOk(`int main() {
    int a = 10;
    int b = 20;
    int c;
    if (a == b) {
        c = 1;
    } else {
        c = 0;
    }
    return c;
}`);

    const ifLineRows = caslLinesForCppLine(result.mapping, 5);
    const thenRows = caslLinesForCppLine(result.mapping, 6);
    const elseRows = caslLinesForCppLine(result.mapping, 8);
    expect(ifLineRows.size).toBeGreaterThan(0);
    expect(thenRows.size).toBeGreaterThan(0);
    expect(elseRows.size).toBeGreaterThan(0);
    expect(cppLineForCaslLine(result.mapping, [...thenRows][0])).toBe(6);
    expect(cppLineForCaslLine(result.mapping, [...elseRows][0])).toBe(8);
    expect(result.mapping.some((entry) => entry.cppLine === 6 && entry.kind === "if-then")).toBe(true);
    expect(result.mapping.some((entry) => entry.cppLine === 8 && entry.kind === "if-else")).toBe(true);
  });

  it("cpp_if_equal_taken", () => {
    const result = expectOk(`int main() {
    int a = 10;
    int b = 10;
    int c;
    if (a == b) {
        c = 1;
    } else {
        c = 0;
    }
    return c;
}`);
    const state = runToEnd(result.caslSource);
    expect(state.runState).toBe("Finished");
    expect(state.memory[state.symbols.C]).toBe(0x0001);
    expect(state.gr[0]).toBe(0x0001);
    expect(state.trace.some((event) => event.instruction === "JZE")).toBe(true);
  });

  it("cpp_if_equal_not_taken", () => {
    const result = expectOk(`int main() {
    int a = 10;
    int b = 20;
    int c;
    if (a == b) {
        c = 1;
    } else {
        c = 0;
    }
    return c;
}`);
    const state = runToEnd(result.caslSource);

    expect(state.runState).toBe("Finished");
    expect(state.memory[state.symbols.C]).toBe(0x0000);
    expect(state.gr[0]).toBe(0x0000);
  });

  it("cpp_if_less_taken", () => {
    const result = expectOk(`int main() {
    int a = 5;
    int b = 10;
    int c;
    if (a < b) {
        c = 1;
    } else {
        c = 0;
    }
    return c;
}`);
    const state = runToEnd(result.caslSource);

    expect(state.memory[state.symbols.C]).toBe(0x0001);
    expect(state.gr[0]).toBe(0x0001);
  });

  it("cpp_if_else_sets_expected_value", () => {
    const result = expectOk(`int main() {
    int a = 12;
    int b = 10;
    int c;
    if (a > b) {
        c = 1;
    } else {
        c = 0;
    }
    return c;
}`);
    const state = runToEnd(result.caslSource);

    expect(state.memory[state.symbols.C]).toBe(0x0001);
    expect(state.gr[0]).toBe(0x0001);
  });

  it("transpile_while_countdown", () => {
    const result = expectOk(`int main() {
    int i = 3;
    while (i > 0) {
        i = i - 1;
    }
    return i;
}`);

    expect(result.caslSource).toContain("LOOP_BEGIN_0 LD    GR1,I");
    expect(result.caslSource).toContain("     CPA   GR1,CONST_0");
    expect(result.caslSource).toContain("     JPL   LOOP_BODY_0");
    expect(result.caslSource).toContain("     JUMP  LOOP_END_0");
    expect(result.caslSource).toContain("     JUMP  LOOP_BEGIN_0");
  });

  it("transpile_while_sum", () => {
    const result = expectOk(`int main() {
    int i = 3;
    int sum = 0;
    while (i > 0) {
        sum = sum + i;
        i = i - 1;
    }
    return sum;
}`);

    expect(result.caslSource).toContain("LOOP_BODY_0 LD    GR1,SUM");
    expect(result.caslSource).toContain("     ADDA  GR1,I");
    expect(result.caslSource).toContain("     SUBA  GR1,CONST_1");
    expect(result.caslSource).toContain("SUM DC    0");
  });

  it("transpile_while_literal_condition", () => {
    const result = expectOk(`int main() {
    int i = 1;
    while (i != 0) {
        i = i - 1;
    }
    return i;
}`);

    expect(result.caslSource).toContain("     CPA   GR1,CONST_0");
    expect(result.caslSource).toContain("     JNZ   LOOP_BODY_0");
    expect(result.caslSource).toContain("CONST_0 DC    0");
  });

  it("mapping_while_condition", () => {
    const result = expectOk(`int main() {
    int i = 3;
    while (i > 0) {
        i = i - 1;
    }
    return i;
}`);

    const rows = result.mapping.filter((entry) => entry.kind === "while-condition" && entry.cppLine === 3).flatMap((entry) => entry.caslLines);
    expect(rows.length).toBeGreaterThanOrEqual(4);
    expect(cppLineForCaslLine(result.mapping, rows[0])).toBe(3);
  });

  it("mapping_while_body", () => {
    const result = expectOk(`int main() {
    int i = 3;
    while (i > 0) {
        i = i - 1;
    }
    return i;
}`);

    const rows = caslLinesForCppLine(result.mapping, 4);
    expect(rows.size).toBeGreaterThan(0);
    expect(result.mapping.some((entry) => entry.cppLine === 4 && entry.kind === "while-body")).toBe(true);
    expect(cppLineForCaslLine(result.mapping, [...rows][0])).toBe(4);
  });

  it("mapping_loop_back_jump", () => {
    const result = expectOk(`int main() {
    int i = 3;
    while (i > 0) {
        i = i - 1;
    }
    return i;
}`);

    expect(result.mapping.some((entry) => entry.kind === "loop-label" && entry.cppLine === 3)).toBe(true);
    expect(result.mapping.some((entry) => entry.kind === "loop-back-jump" && entry.cppLine === 3)).toBe(true);
  });

  it("cpp_while_countdown", () => {
    const result = expectOk(`int main() {
    int i = 3;
    while (i > 0) {
        i = i - 1;
    }
    return i;
}`);
    const state = runToEnd(result.caslSource);

    expect(state.runState).toBe("Finished");
    expect(state.memory[state.symbols.I]).toBe(0x0000);
    expect(state.gr[0]).toBe(0x0000);
  });

  it("cpp_while_sum", () => {
    const result = expectOk(`int main() {
    int i = 3;
    int sum = 0;
    while (i > 0) {
        sum = sum + i;
        i = i - 1;
    }
    return sum;
}`);
    const state = runToEnd(result.caslSource);

    expect(state.runState).toBe("Finished");
    expect(state.memory[state.symbols.SUM]).toBe(0x0006);
    expect(state.gr[0]).toBe(0x0006);
  });

  it("transpile_for_sum_1_to_3", () => {
    const result = expectOk(`int main() {
    int sum = 0;
    for (int i = 1; i <= 3; i = i + 1) {
        sum = sum + i;
    }
    return sum;
}`);

    expect(result.caslSource).toContain("     LAD   GR1,1");
    expect(result.caslSource).toContain("     ST    GR1,I");
    expect(result.caslSource).toContain("FOR_BEGIN_0 LD    GR1,I");
    expect(result.caslSource).toContain("     JMI   FOR_BODY_0");
    expect(result.caslSource).toContain("     JZE   FOR_BODY_0");
    expect(result.caslSource).toContain("FOR_BODY_0 LD    GR1,SUM");
    expect(result.caslSource).toContain("     ADDA  GR1,I");
    expect(result.caslSource).toContain("     JUMP  FOR_BEGIN_0");
    expect(result.caslSource).toContain("FOR_END_0 LD    GR0,SUM");
    expect(result.caslSource).toContain("I DS    1");
    expect(result.caslSource).toContain("CONST_3 DC    3");
    expect(result.caslSource).toContain("CONST_1 DC    1");
  });

  it("transpile_for_countdown", () => {
    const result = expectOk(`int main() {
    int sum = 0;
    for (int i = 3; i > 0; i = i - 1) {
        sum = sum + i;
    }
    return sum;
}`);

    expect(result.caslSource).toContain("     JPL   FOR_BODY_0");
    expect(result.caslSource).toContain("     SUBA  GR1,CONST_1");
  });

  it("mapping_for_condition", () => {
    const result = expectOk(`int main() {
    int sum = 0;
    for (int i = 1; i <= 3; i = i + 1) {
        sum = sum + i;
    }
    return sum;
}`);

    const rows = result.mapping.filter((entry) => entry.kind === "for-condition" && entry.cppLine === 3).flatMap((entry) => entry.caslLines);
    expect(rows.length).toBeGreaterThanOrEqual(4);
    expect(cppLineForCaslLine(result.mapping, rows[0])).toBe(3);
  });

  it("mapping_for_increment", () => {
    const result = expectOk(`int main() {
    int sum = 0;
    for (int i = 1; i <= 3; i = i + 1) {
        sum = sum + i;
    }
    return sum;
}`);

    expect(result.mapping.some((entry) => entry.kind === "for-increment" && entry.cppLine === 3)).toBe(true);
  });

  it("mapping_for_body", () => {
    const result = expectOk(`int main() {
    int sum = 0;
    for (int i = 1; i <= 3; i = i + 1) {
        sum = sum + i;
    }
    return sum;
}`);

    const rows = caslLinesForCppLine(result.mapping, 4);
    expect(rows.size).toBeGreaterThan(0);
    expect(result.mapping.some((entry) => entry.cppLine === 4 && entry.kind === "for-body")).toBe(true);
    expect(cppLineForCaslLine(result.mapping, [...rows][0])).toBe(4);
  });

  it("cpp_for_sum_1_to_3", () => {
    const result = expectOk(`int main() {
    int sum = 0;
    for (int i = 1; i <= 3; i = i + 1) {
        sum = sum + i;
    }
    return sum;
}`);
    const state = runToEnd(result.caslSource);

    expect(state.runState).toBe("Finished");
    expect(state.memory[state.symbols.SUM]).toBe(0x0006);
    expect(state.gr[0]).toBe(0x0006);
  });

  it("cpp_for_countdown", () => {
    const result = expectOk(`int main() {
    int sum = 0;
    for (int i = 3; i > 0; i = i - 1) {
        sum = sum + i;
    }
    return sum;
}`);
    const state = runToEnd(result.caslSource);

    expect(state.runState).toBe("Finished");
    expect(state.memory[state.symbols.SUM]).toBe(0x0006);
    expect(state.gr[0]).toBe(0x0006);
  });

  it("transpile_i_increment", () => {
    const result = expectOk(`int main() {
    int i = 1;
    i++;
    return i;
}`);

    expect(result.caslSource).toContain("     LD    GR1,I");
    expect(result.caslSource).toContain("     ADDA  GR1,CONST_1");
    expect(result.caslSource).toContain("     ST    GR1,I");
    expect(result.mapping.some((entry) => entry.kind === "update-expression" && entry.cppLine === 3)).toBe(true);
  });

  it("transpile_i_decrement", () => {
    const result = expectOk(`int main() {
    int i = 3;
    i--;
    return i;
}`);

    expect(result.caslSource).toContain("     SUBA  GR1,CONST_1");
    expect(result.mapping.some((entry) => entry.kind === "update-expression" && entry.cppLine === 3)).toBe(true);
  });

  it("transpile_i_plus_equals_literal", () => {
    const result = expectOk(`int main() {
    int i = 1;
    i += 2;
    return i;
}`);

    expect(result.caslSource).toContain("     ADDA  GR1,CONST_2");
    expect(result.mapping.some((entry) => entry.kind === "compound-assignment" && entry.cppLine === 3)).toBe(true);
  });

  it("transpile_i_minus_equals_literal", () => {
    const result = expectOk(`int main() {
    int i = 3;
    i -= 2;
    return i;
}`);

    expect(result.caslSource).toContain("     SUBA  GR1,CONST_2");
    expect(result.mapping.some((entry) => entry.kind === "compound-assignment" && entry.cppLine === 3)).toBe(true);
  });

  it("transpile_for_sum_with_i_post_increment", () => {
    const result = expectOk(`int main() {
    int sum = 0;
    for (int i = 1; i <= 3; i++) {
        sum = sum + i;
    }
    return sum;
}`);

    expect(result.caslSource).toContain("FOR_BEGIN_0 LD    GR1,I");
    expect(result.caslSource).toContain("     ADDA  GR1,CONST_1");
    expect(result.caslSource).toContain("     ST    GR1,I");
    expect(result.mapping.some((entry) => entry.kind === "for-increment" && entry.cppLine === 3)).toBe(true);
  });

  it("transpile_for_sum_with_plus_equals", () => {
    const result = expectOk(`int main() {
    int sum = 0;
    for (int i = 1; i <= 3; i += 1) {
        sum += i;
    }
    return sum;
}`);

    expect(result.caslSource).toContain("FOR_BODY_0 LD    GR1,SUM");
    expect(result.caslSource).toContain("     ADDA  GR1,I");
    expect(result.mapping.some((entry) => entry.kind === "for-body" && entry.cppLine === 4)).toBe(true);
    expect(result.mapping.some((entry) => entry.kind === "for-increment" && entry.cppLine === 3)).toBe(true);
  });

  it("cpp_for_sum_with_i_increment", () => {
    const result = expectOk(`int main() {
    int sum = 0;
    for (int i = 1; i <= 3; i++) {
        sum = sum + i;
    }
    return sum;
}`);
    const state = runToEnd(result.caslSource);

    expect(state.runState).toBe("Finished");
    expect(state.memory[state.symbols.SUM]).toBe(0x0006);
    expect(state.gr[0]).toBe(0x0006);
  });

  it("cpp_for_sum_with_plus_equals", () => {
    const result = expectOk(`int main() {
    int sum = 0;
    for (int i = 1; i <= 3; i += 1) {
        sum += i;
    }
    return sum;
}`);
    const state = runToEnd(result.caslSource);

    expect(state.runState).toBe("Finished");
    expect(state.memory[state.symbols.SUM]).toBe(0x0006);
    expect(state.gr[0]).toBe(0x0006);
  });

  it("cpp_countdown_with_i_decrement", () => {
    const result = expectOk(`int main() {
    int sum = 0;
    for (int i = 3; i > 0; i--) {
        sum += i;
    }
    return sum;
}`);
    const state = runToEnd(result.caslSource);

    expect(state.runState).toBe("Finished");
    expect(state.memory[state.symbols.SUM]).toBe(0x0006);
    expect(state.gr[0]).toBe(0x0006);
  });

  it("transpile_while_break", () => {
    const result = expectOk(`int main() {
    int i = 0;
    while (i < 3) {
        break;
    }
    return i;
}`);

    expect(result.caslSource).toContain("     JUMP  LOOP_END_0");
    expect(result.mapping.some((entry) => entry.kind === "break-statement" && entry.cppLine === 4)).toBe(true);
  });

  it("transpile_while_continue", () => {
    const result = expectOk(`int main() {
    int i = 0;
    while (i < 3) {
        i++;
        continue;
    }
    return i;
}`);

    expect(result.caslSource).toContain("     JUMP  LOOP_BEGIN_0");
    expect(result.mapping.some((entry) => entry.kind === "continue-statement" && entry.cppLine === 5)).toBe(true);
  });

  it("transpile_for_break", () => {
    const result = expectOk(`int main() {
    int sum = 0;
    for (int i = 1; i <= 3; i++) {
        break;
    }
    return sum;
}`);

    expect(result.caslSource).toContain("     JUMP  FOR_END_0");
    expect(result.mapping.some((entry) => entry.kind === "break-statement" && entry.cppLine === 4)).toBe(true);
  });

  it("transpile_for_continue_jumps_to_increment_label", () => {
    const result = expectOk(`int main() {
    int sum = 0;
    for (int i = 1; i <= 3; i++) {
        continue;
        sum += i;
    }
    return sum;
}`);

    const lines = result.caslSource.split("\n");
    const continueJump = result.mapping.find((entry) => entry.kind === "continue-statement");
    expect(continueJump).toBeDefined();
    expect(lines[continueJump!.caslLines[0] - 1]).toContain("JUMP  FOR_CONTINUE_0");
    expect(result.caslSource).toContain("FOR_CONTINUE_0 LD    GR1,I");
    expect(result.mapping.some((entry) => entry.kind === "loop-continue-label" && entry.cppLine === 3)).toBe(true);
  });

  it("transpile_nested_loop_break_targets_inner_loop", () => {
    const result = expectOk(`int main() {
    int sum = 0;
    while (sum < 3) {
        for (int i = 1; i <= 3; i++) {
            break;
        }
        sum++;
    }
    return sum;
}`);

    const lines = result.caslSource.split("\n");
    const breakJump = result.mapping.find((entry) => entry.kind === "break-statement");
    expect(breakJump).toBeDefined();
    expect(lines[breakJump!.caslLines[0] - 1]).toContain("JUMP  FOR_END_1");
    expect(lines[breakJump!.caslLines[0] - 1]).not.toContain("LOOP_END_0");
  });

  it("transpile_nested_loop_continue_targets_inner_loop", () => {
    const result = expectOk(`int main() {
    int sum = 0;
    while (sum < 3) {
        for (int i = 1; i <= 3; i++) {
            continue;
        }
        sum++;
    }
    return sum;
}`);

    const lines = result.caslSource.split("\n");
    const continueJump = result.mapping.find((entry) => entry.kind === "continue-statement");
    expect(continueJump).toBeDefined();
    expect(lines[continueJump!.caslLines[0] - 1]).toContain("JUMP  FOR_CONTINUE_1");
    expect(lines[continueJump!.caslLines[0] - 1]).not.toContain("LOOP_BEGIN_0");
  });

  it("cpp_for_break_continue_sum", () => {
    const result = expectOk(`int main() {
    int sum = 0;
    for (int i = 1; i <= 5; i++) {
        if (i == 2) {
            continue;
        }
        if (i == 4) {
            break;
        }
        sum += i;
    }
    return sum;
}`);
    const state = runToEnd(result.caslSource);

    expect(state.runState).toBe("Finished");
    expect(state.memory[state.symbols.SUM]).toBe(0x0004);
    expect(state.gr[0]).toBe(0x0004);
  });

  it("cpp_while_break_sum", () => {
    const result = expectOk(`int main() {
    int i = 1;
    int sum = 0;
    while (i <= 5) {
        if (i == 4) {
            break;
        }
        sum += i;
        i++;
    }
    return sum;
}`);
    const state = runToEnd(result.caslSource);

    expect(state.runState).toBe("Finished");
    expect(state.memory[state.symbols.SUM]).toBe(0x0006);
    expect(state.gr[0]).toBe(0x0006);
  });

  it("cpp_while_continue_sum", () => {
    const result = expectOk(`int main() {
    int i = 0;
    int sum = 0;
    while (i < 5) {
        i++;
        if (i == 2) {
            continue;
        }
        sum += i;
    }
    return sum;
}`);
    const state = runToEnd(result.caslSource);

    expect(state.runState).toBe("Finished");
    expect(state.memory[state.symbols.SUM]).toBe(0x000d);
    expect(state.gr[0]).toBe(0x000d);
  });

  it("cpp_nested_loop_break_only_inner", () => {
    const result = expectOk(`int main() {
    int outer = 0;
    int inner = 0;
    int sum = 0;
    while (outer < 2) {
        inner = 0;
        while (inner < 3) {
            if (inner == 1) {
                break;
            }
            sum += 1;
            inner++;
        }
        outer++;
    }
    return sum;
}`);
    const state = runToEnd(result.caslSource);

    expect(state.runState).toBe("Finished");
    expect(state.memory[state.symbols.SUM]).toBe(0x0002);
    expect(state.gr[0]).toBe(0x0002);
  });
});
