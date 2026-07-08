import { describe, expect, it } from "vitest";
import { mockCaslCore } from "../../core/mockCaslCore";
import { transpileCppToCasl } from "../cppTranspiler";

function expectOk(source: string) {
  const result = transpileCppToCasl(source);
  expect(result.diagnostics).toEqual([]);
  expect(result.ok).toBe(true);
  return result;
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
});
