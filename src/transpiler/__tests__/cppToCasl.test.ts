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
  while (state.runState !== "Finished" && state.runState !== "Error") {
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
});
