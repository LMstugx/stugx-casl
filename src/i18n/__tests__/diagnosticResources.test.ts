import { describe, expect, it } from "vitest";
import { diagnosticCodes } from "../../diagnostics/types";
import { resources } from "../resources";

function keyFor(code: string): string {
  return `diagnostics.${code}`;
}

function placeholders(value: string): string[] {
  return [...value.matchAll(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g)].map((match) => match[1]).sort();
}

describe("diagnostic translation resources", () => {
  it("pilot_diagnostic_keys_exist_in_all_locales_and_are_not_empty", () => {
    for (const code of diagnosticCodes) {
      const key = keyFor(code);
      for (const locale of ["en", "ja", "zh-CN"] as const) {
        const value = resources[locale][key as keyof (typeof resources)[typeof locale]];
        expect(value, `${locale}.${key}`).toBeTypeOf("string");
        expect(value?.trim(), `${locale}.${key}`).not.toBe("");
      }
    }
  });

  it("diagnostic_placeholders_match_across_locales", () => {
    for (const code of diagnosticCodes) {
      const key = keyFor(code);
      const english = resources.en[key as keyof typeof resources.en];
      expect(placeholders(resources.ja[key as keyof typeof resources.ja]!)).toEqual(placeholders(english));
      expect(placeholders(resources["zh-CN"][key as keyof typeof resources["zh-CN"]]!)).toEqual(placeholders(english));
    }
  });

  it("raw_machine_identifiers_are_parameters_not_translated_resource_keys", () => {
    const values = Object.values(resources.en).join("\n");
    expect(values).not.toMatch(/diagnostics\.register\.GR[0-7]/);
    expect(values).not.toContain("0x0020 means");
  });
});
