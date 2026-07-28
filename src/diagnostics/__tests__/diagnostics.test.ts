import { describe, expect, it } from "vitest";
import { mockCaslCore } from "../../core/mockCaslCore";
import type { Diagnostic } from "../../core/types";
import { transpileCppToCasl } from "../../transpiler/cppTranspiler";
import { createStructuredDiagnostic, normalizeDiagnostic, normalizeDiagnostics } from "../catalog";
import { diagnosticIdentity, renderDiagnostic } from "../renderDiagnostic";
import { diagnosticCodes, isDiagnosticCode } from "../types";

describe("structured diagnostic contract", () => {
  it("diagnostic_codes_are_stable_string_union", () => {
    expect(diagnosticCodes).toContain("assembler.unknownSymbol");
    expect(diagnosticCodes).toContain("semantic.argumentCountMismatch");
    expect(diagnosticCodes).toContain("vm.stepLimitReached");
    expect(isDiagnosticCode("assembler.unknownSymbol")).toBe(true);
    expect(isDiagnosticCode("messagePanelError1")).toBe(false);
  });

  it("diagnostic_params_are_structured_and_technical_values_are_preserved", () => {
    const source = 'MAIN START\n LD GR1,MISSING\n END';
    const diagnostic = mockCaslCore.assemble(source).diagnostics.find((entry) => entry.code === "assembler.unknownSymbol");
    expect(diagnostic?.params).toEqual({ symbol: "MISSING" });
    expect(renderDiagnostic(diagnostic!, "ja").message).toContain("MISSING");
    expect(renderDiagnostic(diagnostic!, "zh-CN").message).toContain("MISSING");
  });

  it("diagnostic_message_and_locale_are_not_identity", () => {
    const original = createStructuredDiagnostic(2, "Unknown symbol: MISSING", "assembler.unknownSymbol", { symbol: "MISSING" });
    const localizedCopy: Diagnostic = { ...original, message: "localized presentation only" };
    expect(diagnosticIdentity(original)).toBe(diagnosticIdentity(localizedCopy));
    expect(renderDiagnostic(original, "en").message).not.toBe(renderDiagnostic(original, "ja").message);
  });

  it("severity_source_range_and_order_are_preserved", () => {
    const range = { start: { line: 3, column: 4 }, end: { line: 3, column: 11 } };
    const input: Diagnostic[] = [
      { ...createStructuredDiagnostic(3, "first", "assembler.unknownOpcode", { opcode: "BAD" }, "warning"), sourceRange: range },
      createStructuredDiagnostic(7, "second", "assembler.missingEnd", {})
    ];
    const normalized = normalizeDiagnostics(input);
    expect(normalized.map((entry) => entry.message)).toEqual(["first", "second"]);
    expect(normalized[0].severity).toBe("warning");
    expect(normalized[0].sourceRange).toEqual(range);
  });

  it("legacy_message_field_remains_compatible_and_unknown_code_is_safe", () => {
    expect(normalizeDiagnostic({ line: 1, message: "Legacy producer text", severity: "error" })).toEqual({
      line: 1,
      message: "Legacy producer text",
      severity: "error"
    });
    expect(normalizeDiagnostic({ line: 1, message: "Legacy", severity: "error", code: "future.code" }).code).toBeUndefined();
  });

  it("missing_params_and_unknown_messages_do_not_crash", () => {
    const missingParam = normalizeDiagnostic({
      line: 1,
      message: "English fallback",
      severity: "error",
      code: "assembler.unknownSymbol",
      params: {}
    });
    expect(renderDiagnostic(missingParam, "ja").message).toBe("English fallback");
    const raw: Diagnostic = { line: 0, message: "raw internal detail", severity: "error", rawContext: "stack trace" };
    expect(renderDiagnostic(raw, "zh-CN")).toMatchObject({ message: "raw internal detail", rawContext: "stack trace" });
  });
});

describe("pilot diagnostic producers", () => {
  it.each([
    ["MAIN START\n RET", "assembler.missingEnd"],
    [" RET\n END", "assembler.missingStart"],
    ["MAIN START\n LD GR1,MISSING\n END", "assembler.unknownSymbol"],
    ["MAIN START\nA DC 1\nA DC 2\n END", "assembler.duplicateLabel"],
    ["MAIN START\n LD GR8,A\nA DC 1\n END", "assembler.invalidRegister"],
    ["MAIN START\n LD GR1,A,GR0\nA DC 1\n END", "assembler.invalidIndexRegister"],
    ["MAIN START\n LD GR1,A,\nA DC 1\n END", "assembler.malformedOperandList"],
    ["MAIN START\n LD GR1\n END", "assembler.missingOperand"],
  ] as const)("assembler pilot emits %s", (source, code) => {
    expect(mockCaslCore.assemble(source).diagnostics.some((diagnostic) => diagnostic.code === code)).toBe(true);
  });

  it.each([
    ["int add() { return 0; }", "semantic.mainFunctionMissing"],
    ["int main() { return 0; } int main() { return 1; }", "semantic.duplicateFunction"],
    ["int main() { return missing(); }", "semantic.unknownFunction"],
    ["int main() { return missing; }", "semantic.unknownVariable"],
    ["int add(int a) { return a; } int main() { return add(); }", "semantic.argumentCountMismatch"],
    ["int main() { return main(); }", "semantic.recursionUnsupported"],
    ["int main() { break; return 0; }", "semantic.breakOutsideLoop"],
    ["int main() { continue; return 0; }", "semantic.continueOutsideLoop"],
    ["int four(int a, int b, int c, int d) { return a; } int main() { return 0; }", "transpiler.tooManyRegisterArguments"],
    ["int add(int a) { return a; } int main() { return add(1 + 2); }", "transpiler.unsupportedCallArgument"],
    ["int add(int a) { int a; return a; } int main() { return add(1); }", "semantic.parameterLocalConflict"]
  ] as const)("C++ pilot emits %s", (source, code) => {
    expect(transpileCppToCasl(source).diagnostics.some((diagnostic) => diagnostic.code === code)).toBe(true);
  });

  it("structured_diagnostic_does_not_change_success_or_emitted_casl", () => {
    const source = "int add(int a) { return a; } int main() { return add(2); }";
    const first = transpileCppToCasl(source);
    const second = transpileCppToCasl(source);
    expect(first.ok).toBe(true);
    expect(first.caslSource).toBe(second.caslSource);
    expect(first.diagnostics).toEqual([]);
  });
});
