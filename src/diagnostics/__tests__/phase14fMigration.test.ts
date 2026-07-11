import { describe, expect, it } from "vitest";
import { mockCaslCore } from "../../core/mockCaslCore";
import { resources } from "../../i18n/resources";
import { lexCpp } from "../../transpiler/cppLexer";
import { parseCpp } from "../../transpiler/cppParser";
import { transpileCppToCasl } from "../../transpiler/cppTranspiler";
import { diagnosticIdentity, renderDiagnostic } from "../renderDiagnostic";
import diagnosticInventory from "../../../docs/i18n-diagnostic-inventory.md?raw";
import semanticSource from "../../transpiler/cppSemantic.ts?raw";
import wasmAdapterSource from "../../core/wasmCoreAdapter.ts?raw";
import mockCaslSource from "../../core/mockCaslCore.ts?raw";
import cppCaslParserSource from "../../../cpp-core/src/CaslParser.cpp?raw";

describe("Phase 14F producer migration", () => {
  it("cpp_lexer_and_parser_p1_diagnostics_are_structured", () => {
    const unsupported = lexCpp("int main() { @ }").diagnostics[0];
    expect(unsupported).toMatchObject({ code: "cppParser.unexpectedToken", producer: "cpp-lexer", params: { token: "@" } });

    const missingSemicolon = parseCpp("int main() { int value = 1 return value; }").diagnostics.find((entry) => entry.code === "cppParser.missingSemicolon")!;
    expect(missingSemicolon.producer).toBe("cpp-parser");
    expect(missingSemicolon.sourceRange?.start).toEqual(missingSemicolon.sourceRange?.end);

    expect(parseCpp("void main() {}").diagnostics[0]).toMatchObject({ code: "cppParser.invalidFunctionDeclaration", producer: "cpp-parser" });
    expect(parseCpp("int main(float value) { return 0; }").diagnostics[0]).toMatchObject({ code: "cppParser.invalidParameterList" });
    expect(parseCpp("int main() { int *value; }").diagnostics[0]).toMatchObject({ code: "cppParser.invalidVariableDeclaration" });
    expect(parseCpp("int main() { if (1 + 2) { return 0; } }").diagnostics.some((entry) => entry.code === "cppParser.unsupportedOperator")).toBe(true);
  });

  it("unterminated_block_uses_eof_insertion_and_related_opening_location", () => {
    const source = "int main() { /* open";
    const diagnostic = lexCpp(source).diagnostics[0];
    expect(diagnostic).toMatchObject({ code: "cppParser.unterminatedBlock", producer: "cpp-lexer" });
    expect(diagnostic.sourceRange?.start.offset).toBe(source.length);
    expect(diagnostic.sourceRange?.start).toEqual(diagnostic.sourceRange?.end);
    expect(diagnostic.relatedLocations?.[0].sourceRange.start.offset).toBe(source.indexOf("/*"));
  });

  it("casl_operand_and_literal_remainders_have_stable_codes_and_ranges", () => {
    const missingSource = "MAIN START\n LD GR1\n END";
    const missing = mockCaslCore.assemble(missingSource).diagnostics.find((entry) => entry.code === "assembler.missingOperand")!;
    expect(missing).toMatchObject({ producer: "assembler", params: { mnemonic: "LD" } });
    expect(missing.sourceRange?.start).toEqual(missing.sourceRange?.end);

    const trailingSource = "MAIN START\n LD GR1,A,GR2,EXTRA\nA DC 1\n END";
    const trailing = mockCaslCore.assemble(trailingSource).diagnostics.find((entry) => entry.code === "assembler.unexpectedTrailingOperand")!;
    expect(trailing.params).toEqual({ mnemonic: "LD", operand: "EXTRA" });
    expect(trailingSource.slice(trailing.sourceRange?.start.offset, trailing.sourceRange?.end.offset)).toBe("EXTRA");

    const invalidSource = "MAIN START\nA DC nope\n END";
    const invalid = mockCaslCore.assemble(invalidSource).diagnostics.find((entry) => entry.code === "assembler.invalidLiteral")!;
    expect(invalid.params).toEqual({ literal: "nope" });
    expect(invalidSource.slice(invalid.sourceRange?.start.offset, invalid.sourceRange?.end.offset)).toBe("nope");
  });

  it("semantic_and_transpiler_remainders_are_structured_without_new_acceptance", () => {
    expect(transpileCppToCasl("int main(int value) { return value; }").diagnostics.some((entry) => entry.code === "semantic.unsupportedMainParameters")).toBe(true);
    expect(transpileCppToCasl("int add(int a, int a) { return a; } int main() { return add(1, 2); }").diagnostics.some((entry) => entry.code === "semantic.duplicateParameter")).toBe(true);
    expect(transpileCppToCasl("int main() { int value; int value; return value; }").diagnostics.some((entry) => entry.code === "semantic.duplicateVariable")).toBe(true);
    expect(transpileCppToCasl("int main() { int a = 1 + 2; return a; }").diagnostics.some((entry) => entry.code === "semantic.unsupportedInitializer")).toBe(true);
    expect(transpileCppToCasl("int helper() { return 1; } int main() { return helper() + 1; }").diagnostics.some((entry) => entry.code === "transpiler.unsupportedExpression")).toBe(true);
  });

  it("localized_messages_preserve_rejected_tokens_and_identity", () => {
    const diagnostic = parseCpp("int main() { return @; }").diagnostics.find((entry) => entry.code === "cppParser.unexpectedToken")!;
    const identity = diagnosticIdentity(diagnostic);
    expect(renderDiagnostic(diagnostic, "ja").message).toContain("@");
    expect(renderDiagnostic(diagnostic, "zh-CN").message).toContain("@");
    expect(diagnosticIdentity(renderDiagnostic(diagnostic, "ja"))).toBe(identity);
  });

  it("all_new_p1_templates_exist_in_each_locale", () => {
    const keys = [
      "diagnostics.assembler.invalidLiteral",
      "diagnostics.assembler.missingOperand",
      "diagnostics.cppParser.unexpectedToken",
      "diagnostics.cppParser.missingSemicolon",
      "diagnostics.semantic.duplicateVariable",
      "diagnostics.transpiler.unsupportedExpression"
    ] as const;
    for (const key of keys) {
      expect(resources.en[key]).toBeTruthy();
      expect(resources.ja[key]).toBeTruthy();
      expect(resources["zh-CN"][key]).toBeTruthy();
    }
  });

  it("audited_raw_and_migrated_diagnostic_sites_are_in_inventory", () => {
    expect(semanticSource).toContain("conflicts with another generated label");
    expect(semanticSource).toContain('"transpiler.generatedLabelConflict"');
    expect(diagnosticInventory).toContain("transpiler.generatedLabelConflict");
    expect(wasmAdapterSource).toContain("Failed to parse WASM");
    expect(diagnosticInventory).toContain("JSON/load/browser implementation exceptions");
    expect(diagnosticInventory).toContain("internal-only");
    expect(diagnosticInventory).toContain("intentionally-raw");
  });

  it("non_ascii_casl_identifier_support_is_not_added", () => {
    expect(mockCaslSource).not.toContain("\\p{L}");
    expect(cppCaslParserSource).not.toContain("iswalpha");
    expect(cppCaslParserSource).not.toContain("codecvt");
  });
});
