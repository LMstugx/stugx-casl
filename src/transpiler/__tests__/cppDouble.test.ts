import { describe, expect, it } from "vitest";
import { mockCaslCore } from "../../core/mockCaslCore";
import { doubleOperationForCaslLine, resolveCppStorageObjects } from "../cppStorageObjects";
import { transpileCppToCasl } from "../cppTranspiler";

function expectOk(source: string) {
  const result = transpileCppToCasl(source);
  expect(result.diagnostics).toEqual([]);
  expect(result.ok).toBe(true);
  return result;
}

function runToEnd(caslSource: string) {
  let state = mockCaslCore.assemble(caslSource);
  for (let step = 0; step < 200 && state.runState !== "Finished" && state.runState !== "Error"; step += 1) {
    state = mockCaslCore.step(state);
  }
  return state;
}

describe("C++ double storage subset", () => {
  it("parses declaration, negative literal, scientific literal, and assignment", () => {
    const result = expectOk(`int main() {
    double x = 1.0e3;
    double y = -2.5e-2;
    y = x;
    return 0;
}`);
    expect(result.storageObjects.filter((entry) => entry.type === "double")).toHaveLength(2);
  });

  it("allocates four contiguous words and writes literal initializers", () => {
    const result = expectOk(`int main() {
    double x = 3.5;
    return 0;
}`);
    expect(result.caslSource).toContain("LAD   GR1,#400C");
    expect(result.caslSource).toContain("ST    GR1,X");
    expect(result.caslSource).toContain("X DS    1");
    expect(result.caslSource).toContain("X_W1 DS    1");
    expect(result.caslSource).toContain("X_W2 DS    1");
    expect(result.caslSource).toContain("X_W3 DS    1");

    const state = runToEnd(result.caslSource);
    expect(state.runState).toBe("Finished");
    expect([state.symbols.X, state.symbols.X_W1, state.symbols.X_W2, state.symbols.X_W3]).toEqual([
      state.symbols.X,
      state.symbols.X + 1,
      state.symbols.X + 2,
      state.symbols.X + 3
    ]);
    expect([
      state.memory[state.symbols.X],
      state.memory[state.symbols.X_W1],
      state.memory[state.symbols.X_W2],
      state.memory[state.symbols.X_W3]
    ]).toEqual([0x400c, 0, 0, 0]);
  });

  it("copies all four words in stable read/write order", () => {
    const result = expectOk(`int main() {
    double x = 3.5;
    double y = -1.25;
    y = x;
    return 0;
}`);
    const copyLines = result.caslSource.split(/\r?\n/).filter((line) => /\b(?:LD|ST)\s+GR1,(?:X|Y)(?:_W[123])?$/.test(line));
    expect(copyLines.slice(-8)).toEqual([
      "     LD    GR1,X",
      "     ST    GR1,Y",
      "     LD    GR1,X_W1",
      "     ST    GR1,Y_W1",
      "     LD    GR1,X_W2",
      "     ST    GR1,Y_W2",
      "     LD    GR1,X_W3",
      "     ST    GR1,Y_W3"
    ]);
    expect(result.mapping.filter((entry) => entry.kind === "double-copy-read").map((entry) => entry.wordIndex)).toEqual([0, 1, 2, 3]);
    expect(result.mapping.filter((entry) => entry.kind === "double-copy-write").map((entry) => entry.wordIndex)).toEqual([0, 1, 2, 3]);

    const state = runToEnd(result.caslSource);
    expect([0, 1, 2, 3].map((index) => state.memory[state.symbols[index === 0 ? "Y" : `Y_W${index}`]])).toEqual([0x400c, 0, 0, 0]);
    const resolved = resolveCppStorageObjects(result.storageObjects, state);
    const copyEvents = state.trace
      .map((event) => {
        const caslLine = state.sourceMap.find((entry) => entry.address === event.address)?.line;
        const operation = doubleOperationForCaslLine(result.mapping, resolved, caslLine);
        return [event.source, caslLine, operation?.kind, operation?.wordIndex, operation?.operationId] as const;
      })
      .filter((entry) => entry[4]?.startsWith("double-copy:"))
      .map(([source, caslLine, kind, wordIndex]) => [source, caslLine, kind, wordIndex]);
    expect(copyEvents).toEqual([
      ["ST    GR1,Y_W3", 25, "double-copy", 3],
      ["LD    GR1,X_W3", 24, "double-copy", 3],
      ["ST    GR1,Y_W2", 23, "double-copy", 2],
      ["LD    GR1,X_W2", 22, "double-copy", 2],
      ["ST    GR1,Y_W1", 21, "double-copy", 1],
      ["LD    GR1,X_W1", 20, "double-copy", 1],
      ["ST    GR1,Y", 19, "double-copy", 0],
      ["LD    GR1,X", 18, "double-copy", 0]
    ]);
  });

  it("supports literal assignment and self-assignment without clearing the source", () => {
    const literal = expectOk(`int main() {
    double x = 1.5;
    x = -4.75;
    return 0;
}`);
    const literalState = runToEnd(literal.caslSource);
    expect([0, 1, 2, 3].map((index) => literalState.memory[literalState.symbols[index === 0 ? "X" : `X_W${index}`]])).toEqual([0xc013, 0, 0, 0]);

    const self = expectOk(`int main() {
    double x = 3.5;
    x = x;
    return 0;
}`);
    const selfState = runToEnd(self.caslSource);
    expect([0, 1, 2, 3].map((index) => selfState.memory[selfState.symbols[index === 0 ? "X" : `X_W${index}`]])).toEqual([0x400c, 0, 0, 0]);
  });

  it.each([
    ["double arithmetic", "int main() { double x = 1.0; double y = 2.0; x = x + y; return 0; }", "semantic.unsupportedDoubleArithmetic"],
    ["double comparison", "int main() { double x = 1.0; if (x < x) { return 1; } return 0; }", "semantic.unsupportedDoubleComparison"],
    ["double parameter", "int f(double x) { return 0; } int main() { return 0; }", "semantic.unsupportedDoubleParameter"],
    ["double return", "double f() { return 1.0; } int main() { return 0; }", "semantic.unsupportedDoubleReturn"],
    ["int to double", "int main() { double x = 1; return 0; }", "semantic.incompatibleScalarAssignment"],
    ["double initializer to int", "int main() { int x = 1.5; return x; }", "semantic.incompatibleScalarAssignment"],
    ["double to int", "int main() { double x = 1.0; int y; y = x; return y; }", "semantic.incompatibleScalarAssignment"],
    ["double array", "int main() { double values[4]; return 0; }", "semantic.unsupportedDoubleArray"],
    ["floating suffix", "int main() { double x = 1.0f; return 0; }", "semantic.unsupportedFloatingSuffix"],
    ["invalid exponent", "int main() { double x = 1.0e; return 0; }", "semantic.invalidFloatingLiteral"],
    ["literal overflow", "int main() { double x = 1.0e9999; return 0; }", "semantic.floatingLiteralOutOfRange"]
  ])("rejects %s without partial CASL", (_name, source, code) => {
    const result = transpileCppToCasl(source);
    expect(result.ok).toBe(false);
    expect(result.caslSource).toBe("");
    expect(result.mapping).toEqual([]);
    expect(result.storageObjects).toEqual([]);
    expect(result.diagnostics.some((entry) => entry.code === code)).toBe(true);
  });

  it("reports full double expression ranges and target declaration context", () => {
    const arithmetic = transpileCppToCasl("int main() { double x = 1.0; x = x + x; return 0; }");
    const arithmeticDiagnostic = arithmetic.diagnostics.find((entry) => entry.code === "semantic.unsupportedDoubleArithmetic");
    expect(arithmeticDiagnostic?.sourceRange).toEqual({
      start: { line: 1, column: 34, offset: 33 },
      end: { line: 1, column: 39, offset: 38 }
    });

    const conversion = transpileCppToCasl("int main() { double x = 1.0; int y; y = x; return y; }");
    const conversionDiagnostic = conversion.diagnostics.find((entry) => entry.code === "semantic.incompatibleScalarAssignment");
    expect(conversionDiagnostic?.sourceRange).toEqual({
      start: { line: 1, column: 41, offset: 40 },
      end: { line: 1, column: 42, offset: 41 }
    });
    expect(conversionDiagnostic?.relatedLocations).toHaveLength(1);
  });

  it("keeps existing int lowering byte-for-byte stable", () => {
    const result = expectOk(`int main() {
    int a = 10;
    int b = 20;
    int c;
    c = a + b;
    return c;
}`);
    expect(result.caslSource).toBe(`MAIN START
     LD    GR1,A
     ADDA  GR1,B
     ST    GR1,C
     LD    GR0,C
     RET
A DC    10
B DC    20
C DS    1
     END`);
  });
});
