import { describe, expect, it } from "vitest";
import baselineRaw from "../../../docs/diagnostic-localization-baseline-v1.json?raw";
import { resources } from "../../i18n/resources";
import { createStructuredDiagnostic, normalizeDiagnostic } from "../catalog";
import { formatDiagnosticDeveloperDetail } from "../presentation";
import { diagnosticIdentity, renderDiagnostic } from "../renderDiagnostic";
import { diagnosticSchemas, type DiagnosticParamType } from "../schema";
import { diagnosticCodes, diagnosticProducers, inferDiagnosticProducer, type DiagnosticCode } from "../types";
import { validateDiagnosticPayload } from "../validation";

type BaselineEntry = {
  code: DiagnosticCode;
  producers: string[];
  requiredParams: string[];
  optionalParams: string[];
  rangePolicy: string;
  relatedLocationPolicy: string;
  backendOwnership: string;
  parityScope: string;
  userVisible?: boolean;
};

const baseline = JSON.parse(baselineRaw) as {
  baselineVersion: string;
  supportedLocales: string[];
  fallbackLocale: string;
  producers: string[];
  diagnosticDefaults: { localeCoverage: string[]; legacyCompatibility: boolean; userVisible: boolean; rawContextPolicy: string };
  internalRawPolicy: { includedAsLocalizedDiagnostics: boolean; prohibitedPrimaryContent: string[] };
  structuredDiagnostics: BaselineEntry[];
};
const runtimeSourceModules = import.meta.glob("../../**/*.{ts,tsx}", {
  eager: true,
  query: "?raw",
  import: "default"
}) as Readonly<Record<string, string>>;

describe("Phase 14H diagnostic localization baseline", () => {
  it("diagnostic_baseline_manifest_exists_and_version_is_frozen", () => {
    expect(baseline.baselineVersion).toBe("diagnostic-localization-v1");
    expect(baseline.supportedLocales).toEqual(["en", "ja", "zh-CN"]);
    expect(baseline.fallbackLocale).toBe("en");
  });

  it("baseline_codes_and_producers_match_runtime_registry", () => {
    expect(baseline.structuredDiagnostics).toHaveLength(55);
    expect(baseline.structuredDiagnostics.map((entry) => entry.code)).toEqual(diagnosticCodes);
    expect(baseline.producers).toEqual(diagnosticProducers);
    for (const entry of baseline.structuredDiagnostics) {
      expect(entry.producers).toContain(inferDiagnosticProducer(entry.code));
      expect(entry.producers.every((producer) => diagnosticProducers.includes(producer as never))).toBe(true);
    }
  });

  it("baseline_schemas_match_runtime_registry", () => {
    for (const entry of baseline.structuredDiagnostics) {
      const schema = diagnosticSchemas[entry.code];
      expect(entry.requiredParams, `${entry.code}.required`).toEqual(Object.keys(schema.required).sort());
      expect(entry.optionalParams, `${entry.code}.optional`).toEqual(Object.keys(schema.optional).sort());
      expect(entry.rangePolicy).not.toBe("");
      expect(entry.relatedLocationPolicy).not.toBe("");
      expect(entry.requiredParams).toEqual([...entry.requiredParams].sort());
      expect(entry.optionalParams).toEqual([...entry.optionalParams].sort());
    }
  });

  it("baseline_manifest_is_not_a_runtime_source", () => {
    const runtimeImports = Object.entries(runtimeSourceModules)
      .filter(([file]) => !file.includes("/__tests__/") && !file.includes("/tests/") && !/\.(?:test|spec)\.(?:ts|tsx)$/.test(file))
      .filter(([, source]) => source.includes("diagnostic-localization-baseline-v1"))
      .map(([file]) => file);
    expect(runtimeImports).toEqual([]);
  });

  it("baseline_locale_coverage_matches_resources", () => {
    expect(baseline.diagnosticDefaults.localeCoverage).toEqual(["en", "ja", "zh-CN"]);
    for (const entry of baseline.structuredDiagnostics) {
      const key = `diagnostics.${entry.code}`;
      expect((resources.en as Readonly<Record<string, string | undefined>>)[key]).toBeTruthy();
      expect((resources.ja as Readonly<Record<string, string | undefined>>)[key]).toBeTruthy();
      expect((resources["zh-CN"] as Readonly<Record<string, string | undefined>>)[key]).toBeTruthy();
    }
  });

  it("baseline_backend_ownership_and_special_parity_are_documented", () => {
    for (const entry of baseline.structuredDiagnostics) {
      expect(entry.backendOwnership).not.toBe("");
      expect(entry.parityScope).not.toBe("");
    }
    const generated = baseline.structuredDiagnostics.find((entry) => entry.code === "transpiler.generatedLabelConflict")!;
    expect(generated.backendOwnership).toBe("ts-only");
    expect(generated.parityScope).toBe("TypeScript C++ subset only");
    expect(baseline.structuredDiagnostics.find((entry) => entry.code === "assembler.unknownSymbol")?.parityScope).toBe("shared CASL");
  });

  it("baseline_does_not_localize_internal_raw_payloads", () => {
    expect(baseline.internalRawPolicy.includedAsLocalizedDiagnostics).toBe(false);
    expect(baseline.internalRawPolicy.prohibitedPrimaryContent).toContain("stack trace");
    expect(baseline.diagnosticDefaults.rawContextPolicy).toBe("collapsed-details-only");
  });

  it("all_structured_templates_render_without_unresolved_placeholders", () => {
    for (const code of diagnosticCodes) {
      const schema = diagnosticSchemas[code];
      const params = Object.fromEntries(
        [...Object.entries(schema.required), ...Object.entries(schema.optional)]
          .map(([name, type]) => [name, sampleParam(type)])
      );
      const validated = validateDiagnosticPayload({ line: 1, message: code, severity: "error", code, params });
      expect(validated.kind, code).toBe("structured");
      for (const locale of ["en", "ja", "zh-CN"] as const) {
        expect(renderDiagnostic(validated.diagnostic, locale).message, `${locale}.${code}`).not.toMatch(/\{[a-zA-Z][a-zA-Z0-9_]*\}/);
      }
    }
  });
});

describe("Phase 14H payload compatibility", () => {
  it("structured_and_legacy_payloads_remain_compatible", () => {
    const structured = validateDiagnosticPayload(createStructuredDiagnostic(2, "fallback", "assembler.unknownSymbol", { symbol: "MISSING" }));
    expect(structured.kind).toBe("structured");

    const legacyRange = { start: { line: 2, column: 3 }, end: { line: 2, column: 3 } };
    expect(validateDiagnosticPayload({ line: 2, message: "Legacy only", severity: "error" }).kind).toBe("legacy");
    expect(validateDiagnosticPayload({ line: 2, message: "Legacy range", severity: "error", sourceRange: legacyRange }).diagnostic.sourceRange).toEqual(legacyRange);
  });

  it("missing_producer_is_inferred_and_unknown_or_partial_payload_is_safe", () => {
    const inferred = validateDiagnosticPayload({
      line: 1,
      message: "fallback",
      severity: "error",
      code: "semantic.unknownVariable",
      params: { variable: "value" }
    });
    expect(inferred.diagnostic.producer).toBe("semantic");
    expect(validateDiagnosticPayload({ line: 1, message: "future fallback", severity: "error", code: "future.code", params: {} }).kind).toBe("invalid");
    expect(validateDiagnosticPayload({ line: 1, message: "partial fallback", severity: "error", code: "assembler.unknownSymbol", params: {} }).diagnostic.message).toBe("partial fallback");
  });

  it("raw_context_is_not_primary_and_internal_wrapper_is_stable", () => {
    const diagnostic = createStructuredDiagnostic(0, "secret raw detail", "transpiler.internalLoweringFailure", {}, "error", {
      rawContext: "C:\\Users\\student\\private\\core.ts\n    at internalLower()"
    });
    expect(renderDiagnostic(diagnostic, "en").message).toBe("The C++ source could not be lowered to CASL.");
    expect(renderDiagnostic(diagnostic, "ja").message).not.toContain("private");
    expect(formatDiagnosticDeveloperDetail(diagnostic.rawContext)).toBe("[local path]");
  });

  it("unsafe_or_circular_internal_detail_is_safely_stringified", () => {
    const circular: Record<string, unknown> = { reason: "failed" };
    circular.self = circular;
    expect(formatDiagnosticDeveloperDetail(circular)).toContain("[Circular]");
    expect(formatDiagnosticDeveloperDetail("<img src=x onerror=alert(1)>")).toContain("<img");
  });

  it("diagnostic_identity_is_locale_and_message_independent", () => {
    const diagnostic = createStructuredDiagnostic(1, "fallback", "assembler.unknownSymbol", { symbol: "MISSING" }, "error", {
      sourceRange: { start: { line: 1, column: 1 }, end: { line: 1, column: 8 } }
    });
    const identity = diagnosticIdentity(diagnostic);
    expect(diagnosticIdentity(renderDiagnostic(diagnostic, "ja"))).toBe(identity);
    expect(diagnosticIdentity({ ...diagnostic, message: "different presentation" })).toBe(identity);
  });

  it("old_wasm_json_shape_normalizes_without_fabrication", () => {
    const legacy = normalizeDiagnostic(JSON.parse('{"line":2,"message":"Undefined label: MISSING","severity":"error"}'));
    expect(legacy).toMatchObject({ code: "assembler.unknownSymbol", params: { symbol: "MISSING" } });
    expect(legacy.sourceRange).toBeUndefined();
  });
});

function sampleParam(type: DiagnosticParamType): string | number | boolean {
  if (type === "number") return 7;
  if (type === "boolean") return true;
  return "TECHNICAL_TOKEN";
}
