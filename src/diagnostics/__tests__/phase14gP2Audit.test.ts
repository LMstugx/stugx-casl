import { describe, expect, it } from "vitest";
import diagnosticInventory from "../../../docs/i18n-diagnostic-inventory.md?raw";
import cppCoreSource from "../../../cpp-core/src/DiagnosticCatalog.cpp?raw";
import { resources } from "../../i18n/resources";
import { transpileCppToCasl } from "../../transpiler/cppTranspiler";
import { diagnosticIdentity, renderDiagnostic } from "../renderDiagnostic";
import { diagnosticSchemas } from "../schema";
import { diagnosticCodes, diagnosticProducers } from "../types";
import { validateDiagnosticPayload } from "../validation";

const collisionSource = "int foo() { return 0; } int FOO() { return 0; } int main() { return 0; }";

function collisionDiagnostic() {
  return transpileCppToCasl(collisionSource).diagnostics.find((entry) => entry.code === "transpiler.generatedLabelConflict")!;
}

describe("Phase 14G P2 stability audit", () => {
  it("every_p2_diagnostic_has_audit_decision", () => {
    for (const decision of [
      "migrate-now",
      "remain-legacy",
      "internal-only",
      "intentionally-raw",
      "blocked-unreliable-params",
      "blocked-unreliable-range"
    ]) expect(diagnosticInventory).toContain(decision);
    expect(diagnosticInventory).toContain("9 audited P2 units");
  });

  it("migrate_now_items_meet_admission_criteria", () => {
    const diagnostic = collisionDiagnostic();
    expect(diagnostic).toMatchObject({
      code: "transpiler.generatedLabelConflict",
      producer: "transpiler",
      severity: "error",
      params: { function: "FOO", label: "FUNC_FOO" },
      message: "Function label 'FUNC_FOO' conflicts with another generated label."
    });
    expect(diagnostic.sourceRange).toBeDefined();
    expect(diagnostic.relatedLocations).toHaveLength(1);
  });

  it("legacy_and_internal_items_have_documented_reasons", () => {
    expect(diagnosticInventory).toContain("No current user diagnostic trigger");
    expect(diagnosticInventory).toContain("no single rejected value");
    expect(diagnosticInventory).toContain("Invariant exceptions remain in `rawContext`");
    expect(diagnosticInventory).toContain("Browser and loader details are intentionally raw");
  });

  it("diagnostic_codes_and_producers_remain_unique_and_valid", () => {
    expect(new Set(diagnosticCodes).size).toBe(diagnosticCodes.length);
    expect(new Set(diagnosticProducers).size).toBe(diagnosticProducers.length);
    expect(diagnosticProducers).toContain("transpiler");
    expect(diagnosticProducers).toContain("linker");
  });

  it("schemas_reject_unknown_or_missing_params", () => {
    expect(diagnosticSchemas["transpiler.generatedLabelConflict"]).toEqual({
      required: { function: "string", label: "string" },
      optional: {}
    });
    const unknown = validateDiagnosticPayload({
      line: 1,
      message: "fallback",
      severity: "error",
      code: "transpiler.generatedLabelConflict",
      params: { function: "FOO", label: "FUNC_FOO", detail: "not approved" }
    });
    expect(unknown.issues).toContain("unknown extra param: detail");
    expect(unknown.diagnostic.params).toEqual({ function: "FOO", label: "FUNC_FOO" });
    expect(validateDiagnosticPayload({
      line: 1,
      message: "fallback",
      severity: "error",
      code: "transpiler.generatedLabelConflict",
      params: { function: "FOO" }
    }).kind).toBe("invalid");
  });

  it("localized_templates_match_and_keep_technical_values_raw", () => {
    const keys = ["en", "ja", "zh-CN"] as const;
    for (const locale of keys) {
      const template = resources[locale]["diagnostics.transpiler.generatedLabelConflict"]!;
      expect([...template.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort()).toEqual(["function", "label"]);
      const rendered = renderDiagnostic(collisionDiagnostic(), locale).message;
      expect(rendered).toContain("FOO");
      expect(rendered).toContain("FUNC_FOO");
    }
  });

  it("migrated_p2_ranges_and_related_location_cover_the_real_declarations", () => {
    const diagnostic = collisionDiagnostic();
    const primary = diagnostic.sourceRange!;
    const related = diagnostic.relatedLocations![0].sourceRange;
    expect(collisionSource.slice(primary.start.offset, primary.end.offset)).toBe("FOO");
    expect(collisionSource.slice(related.start.offset, related.end.offset)).toBe("foo");
    expect(primary.start.offset).toBeGreaterThan(related.start.offset!);
  });

  it("locale_switch_changes_message_only_and_preserves_identity_order_and_ranges", () => {
    const result = transpileCppToCasl(collisionSource);
    const diagnostic = collisionDiagnostic();
    const identity = diagnosticIdentity(diagnostic);
    const japanese = renderDiagnostic(diagnostic, "ja");
    const chinese = renderDiagnostic(diagnostic, "zh-CN");
    expect(japanese.message).not.toBe(chinese.message);
    expect(diagnosticIdentity(japanese)).toBe(identity);
    expect(diagnosticIdentity(chinese)).toBe(identity);
    expect(japanese.sourceRange).toEqual(diagnostic.sourceRange);
    expect(chinese.relatedLocations).toEqual(diagnostic.relatedLocations);
    expect(result.diagnostics.map((entry) => entry.code)).toEqual(["transpiler.generatedLabelConflict"]);
  });

  it("generated_label_conflict_is_ts_only_and_does_not_claim_core_parity", () => {
    expect(cppCoreSource).not.toContain("transpiler.generatedLabelConflict");
    expect(diagnosticInventory).toContain("TypeScript C++ subset only; C++ core parity is not claimed");
  });

  it("diagnostic_migration_does_not_change_valid_emitted_casl", () => {
    const source = "int helper() { return 1; } int main() { return helper(); }";
    const first = transpileCppToCasl(source);
    const second = transpileCppToCasl(source);
    expect(first.ok).toBe(true);
    expect(first.caslSource).toBe(second.caslSource);
    expect(first.diagnostics).toEqual([]);
  });
});
