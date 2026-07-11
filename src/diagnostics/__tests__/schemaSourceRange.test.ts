import { describe, expect, it } from "vitest";
import { mockCaslCore } from "../../core/mockCaslCore";
import { resources } from "../../i18n/resources";
import type { AnyTranslationKey, PartialTranslationResource } from "../../i18n/types";
import { transpileCppToCasl } from "../../transpiler/cppTranspiler";
import { createStructuredDiagnostic } from "../catalog";
import { diagnosticIdentity, renderDiagnostic } from "../renderDiagnostic";
import { diagnosticSchemas, getDiagnosticTemplateSchema } from "../schema";
import { eofInsertionRange, isValidSourceRange, rangeForTextOnLine, sourceRangeFromOffsets } from "../sourceRange";
import { diagnosticCodes } from "../types";
import { validateDiagnosticPayload } from "../validation";

describe("typed diagnostic parameter schemas", () => {
  it("each_diagnostic_code_has_param_schema", () => {
    expect(Object.keys(diagnosticSchemas).sort()).toEqual([...diagnosticCodes].sort());
  });

  it("required_params_are_enforced_at_compile_time", () => {
    createStructuredDiagnostic(1, "fallback", "assembler.unknownSymbol", { symbol: "MISSING" });
    // @ts-expect-error unknownSymbol requires symbol
    createStructuredDiagnostic(1, "fallback", "assembler.unknownSymbol", {});
    // @ts-expect-error unknownSymbol does not accept variable
    createStructuredDiagnostic(1, "fallback", "assembler.unknownSymbol", { variable: "MISSING" });
    // @ts-expect-error expectedCount must be numeric
    createStructuredDiagnostic(1, "fallback", "semantic.argumentCountMismatch", { function: "add", expectedCount: "1", actualCount: 0 });
  });

  it("templates_only_use_schema_placeholders_and_locale_sets_match", () => {
    for (const code of diagnosticCodes) {
      const key = `diagnostics.${code}` as AnyTranslationKey;
      const templates = [resources.en, resources.ja, resources["zh-CN"]].map((resource) => (resource as PartialTranslationResource)[key]);
      expect(templates.every(Boolean), key).toBe(true);
      const sets = templates.map((template) => placeholders(template!));
      expect(sets[1], `${key} ja placeholders`).toEqual(sets[0]);
      expect(sets[2], `${key} zh-CN placeholders`).toEqual(sets[0]);
      const schema = getDiagnosticTemplateSchema(code);
      const allowed = new Set([...Object.keys(schema.required), ...Object.keys(schema.optional)]);
      expect(sets[0].every((name) => allowed.has(name)), `${key} schema placeholders`).toBe(true);
      expect(Object.keys(schema.required).every((name) => sets[0].includes(name)), `${key} required placeholders`).toBe(true);
    }
  });
});

describe("runtime diagnostic payload validation", () => {
  it("accepts_valid_structured_and_legacy_payloads", () => {
    const structured = validateDiagnosticPayload({ line: 2, message: "fallback", severity: "error", code: "assembler.unknownSymbol", params: { symbol: "A" } });
    expect(structured.kind).toBe("structured");
    expect(structured.diagnostic.producer).toBe("assembler");
    expect(validateDiagnosticPayload({ line: 2, message: "legacy", severity: "warning" }).kind).toBe("legacy");
  });

  it("invalid_or_missing_producer_is_safely_inferred", () => {
    const result = validateDiagnosticPayload({
      line: 1,
      message: "fallback",
      severity: "error",
      code: "cppParser.unexpectedToken",
      producer: "message-panel",
      params: { token: "@" }
    });
    expect(result.kind).toBe("structured");
    expect(result.diagnostic.producer).toBe("cpp-parser");
    expect(result.issues).toContain("invalid producer inferred");
  });

  it("rejects_unknown_missing_and_invalid_params_safely", () => {
    expect(validateDiagnosticPayload({ line: 1, message: "x", severity: "error", code: "future.code", params: {} }).kind).toBe("invalid");
    expect(validateDiagnosticPayload({ line: 1, message: "x", severity: "error", code: "assembler.unknownSymbol", params: {} }).kind).toBe("invalid");
    expect(validateDiagnosticPayload({ line: 1, message: "x", severity: "error", code: "vm.stepLimitReached", params: { stepLimit: "10" } }).kind).toBe("invalid");
    expect(validateDiagnosticPayload({ line: 1, message: "x", severity: "error", code: "assembler.unknownSymbol", params: { symbol: "A", line: "2" } }).kind).toBe("invalid");
  });

  it("rejects_prototype_pollution_keys", () => {
    const payload = JSON.parse('{"line":1,"message":"x","severity":"error","code":"assembler.unknownSymbol","params":{"symbol":"A","__proto__":"bad"}}');
    expect(validateDiagnosticPayload(payload).kind).toBe("invalid");
  });

  it("sanitizes_malformed_ranges_and_related_locations", () => {
    const result = validateDiagnosticPayload({
      line: 1,
      message: "x",
      severity: "error",
      code: "assembler.unknownSymbol",
      params: { symbol: "A" },
      sourceRange: { start: { line: 2, column: 1, offset: 5 }, end: { line: 1, column: 1, offset: 6 } },
      relatedLocations: [{ sourceRange: { start: { line: 0, column: 1 }, end: { line: 1, column: 1 } } }]
    });
    expect(result.kind).toBe("structured");
    expect(result.diagnostic.sourceRange).toBeUndefined();
    expect(result.diagnostic.relatedLocations).toBeUndefined();
  });
});

describe("source range contract", () => {
  it("uses_one_based_lines_columns_utf16_offsets_and_exclusive_end", () => {
    const source = "A\nBC";
    expect(sourceRangeFromOffsets(source, 2, 4)).toEqual({
      start: { line: 2, column: 1, offset: 2 },
      end: { line: 2, column: 3, offset: 4 }
    });
    expect(eofInsertionRange(source).start).toEqual({ line: 2, column: 3, offset: 4 });
  });

  it("crlf_and_lf_have_equivalent_user_positions", () => {
    const lf = rangeForTextOnLine("MAIN START\n LD GR1,MISSING\n END", 2, "MISSING");
    const crlf = rangeForTextOnLine("MAIN START\r\n LD GR1,MISSING\r\n END", 2, "MISSING");
    expect(crlf && { line: crlf.start.line, column: crlf.start.column, endColumn: crlf.end.column }).toEqual(
      lf && { line: lf.start.line, column: lf.start.column, endColumn: lf.end.column }
    );
  });

  it("utf16_offsets_preserve_cjk_and_surrogate_pairs", () => {
    const source = "int 变量 = 1; // 😀";
    const cjk = sourceRangeFromOffsets(source, source.indexOf("变量"), source.indexOf("变量") + "变量".length);
    const emoji = sourceRangeFromOffsets(source, source.indexOf("😀"), source.indexOf("😀") + "😀".length);
    expect(cjk.end.offset! - cjk.start.offset!).toBe(2);
    expect(emoji.end.offset! - emoji.start.offset!).toBe(2);
    expect(isValidSourceRange(emoji, source)).toBe(true);
  });

  it.each([
    ["MAIN START\n BADOP GR1,A\nA DC 1\n END", "assembler.unknownOpcode", "GR1"],
    ["MAIN START\n LD GR1,MISSING\n END", "assembler.unknownSymbol", "MISSING"],
    ["MAIN START\n LD GR8,A\nA DC 1\n END", "assembler.invalidRegister", "GR8"]
  ])("assembler range for %s covers its token", (source, code, token) => {
    const diagnostic = mockCaslCore.assemble(source).diagnostics.find((entry) => entry.code === code)!;
    expect(sliceRange(source, diagnostic.sourceRange!)).toBe(token);
  });

  it("malformed_comma_and_eof_ranges_are_precise", () => {
    const commaSource = "MAIN START\n LD GR1,A,\nA DC 1\n END";
    const comma = mockCaslCore.assemble(commaSource).diagnostics.find((entry) => entry.code === "assembler.malformedOperandList")!;
    expect(sliceRange(commaSource, comma.sourceRange!)).toBe(",");
    const eofSource = "MAIN START\n RET";
    const eof = mockCaslCore.assemble(eofSource).diagnostics.find((entry) => entry.code === "assembler.missingEnd")!;
    expect(eof.sourceRange).toEqual(eofInsertionRange(eofSource));
    const missingStartSource = "; comment\n RET\n END";
    const missingStart = mockCaslCore.assemble(missingStartSource).diagnostics.find((entry) => entry.code === "assembler.missingStart")!;
    expect(missingStart.sourceRange?.start).toMatchObject({ line: 2, column: 2 });
  });

  it("semantic_ranges_cover_identifiers_and_loop_keywords", () => {
    const unknownSource = "int main() { return missing; }";
    const unknown = transpileCppToCasl(unknownSource).diagnostics.find((entry) => entry.code === "semantic.unknownVariable")!;
    expect(sliceRange(unknownSource, unknown.sourceRange!)).toBe("missing");
    const breakSource = "int main() { break; return 0; }";
    const invalidBreak = transpileCppToCasl(breakSource).diagnostics.find((entry) => entry.code === "semantic.breakOutsideLoop")!;
    expect(sliceRange(breakSource, invalidBreak.sourceRange!)).toBe("break");
  });

  it("duplicate_diagnostics_include_related_first_locations", () => {
    const source = "MAIN START\nA DC 1\nA DC 2\n END";
    const diagnostic = mockCaslCore.assemble(source).diagnostics.find((entry) => entry.code === "assembler.duplicateLabel")!;
    expect(sliceRange(source, diagnostic.sourceRange!)).toBe("A");
    expect(sliceRange(source, diagnostic.relatedLocations![0].sourceRange)).toBe("A");
    expect(diagnostic.sourceRange).not.toEqual(diagnostic.relatedLocations![0].sourceRange);
  });

  it("same_line_semantic_locations_select_the_current_declaration_or_call", () => {
    const duplicateSource = "int main() { return 0; } int main() { return 1; }";
    const duplicate = transpileCppToCasl(duplicateSource).diagnostics.find((entry) => entry.code === "semantic.duplicateFunction")!;
    expect(duplicate.sourceRange?.start.offset).toBeGreaterThan(duplicate.relatedLocations![0].sourceRange.start.offset!);

    const conflictSource = "int add(int a) { int a; return a; } int main() { return add(1); }";
    const conflict = transpileCppToCasl(conflictSource).diagnostics.find((entry) => entry.code === "semantic.parameterLocalConflict")!;
    expect(conflict.sourceRange?.start.offset).toBeGreaterThan(conflict.relatedLocations![0].sourceRange.start.offset!);

    const callSource = "int add(int a) { return a; } int main() { return add(); }";
    const mismatch = transpileCppToCasl(callSource).diagnostics.find((entry) => entry.code === "semantic.argumentCountMismatch")!;
    expect(sliceRange(callSource, mismatch.sourceRange!)).toBe("add");
    expect(mismatch.sourceRange!.start.offset).toBe(callSource.lastIndexOf("add"));
  });
});

describe("diagnostic identity and formatting", () => {
  it("locale_message_and_param_key_order_do_not_change_identity", () => {
    const first = createStructuredDiagnostic(1, "fallback", "semantic.argumentCountMismatch", { function: "add", expectedCount: 2, actualCount: 1 });
    const reordered = { ...first, message: "translated", params: { actualCount: 1, expectedCount: 2, function: "add" } };
    expect(diagnosticIdentity(first)).toBe(diagnosticIdentity(reordered));
    expect(renderDiagnostic(first, "en").message).not.toBe(renderDiagnostic(first, "ja").message);
    expect(diagnosticIdentity(renderDiagnostic(first, "ja"))).toBe(diagnosticIdentity(first));
  });

  it("duplicate_ranges_produce_distinct_identity", () => {
    const first = { ...createStructuredDiagnostic(2, "x", "assembler.duplicateLabel", { label: "A" }), sourceRange: sourceRangeFromOffsets("A\nA", 0, 1) };
    const second = { ...createStructuredDiagnostic(2, "x", "assembler.duplicateLabel", { label: "A" }), sourceRange: sourceRangeFromOffsets("A\nA", 2, 3) };
    expect(diagnosticIdentity(first)).not.toBe(diagnosticIdentity(second));
  });
});

function placeholders(template: string): string[] {
  return [...template.matchAll(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g)].map((match) => match[1]).sort();
}

function sliceRange(source: string, range: { start: { offset?: number }; end: { offset?: number } }): string {
  return source.slice(range.start.offset, range.end.offset);
}
