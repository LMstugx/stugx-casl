import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createTranslator, resources, translate } from "../resources";
import type { TranslationKey } from "../types";

describe("typed translation resources", () => {
  it("missing_ja_key_falls_back_to_en", () => {
    expect(translate("ja", "accessibility.primaryCommands")).toBe("Primary commands");
  });

  it("missing_zh_key_falls_back_to_en", () => {
    expect(translate("zh-CN", "accessibility.primaryCommands")).toBe("Primary commands");
  });

  it("missing_en_key_does_not_crash", () => {
    const unknown = "missing.runtime.key" as TranslationKey;
    expect(() => translate("en", unknown)).not.toThrow();
    expect(translate("en", unknown)).toBe("missing.runtime.key");
  });

  it("interpolation_returns_plain_text_and_keeps_missing_parameters", () => {
    const t = createTranslator("en");
    expect(t("accessibility.openInspectorTab", { tab: "<Memory>" })).toBe("Open <Memory> inspector tab");
    expect(t("accessibility.languageOption")).toBe("{language} language option");
  });

  it("toolbar_observation_and_inspector_use_translation_keys", () => {
    const toolbar = readFileSync("src/components/Toolbar.tsx", "utf8");
    const focus = readFileSync("src/components/CircuitFocusLayout.tsx", "utf8");
    const inspector = readFileSync("src/components/InspectorPanel.tsx", "utf8");
    const output = readFileSync("src/components/OutputPanel.tsx", "utf8");
    const memory = readFileSync("src/components/MemoryPanel.tsx", "utf8");

    expect(toolbar).toContain('t("toolbar.assemble")');
    expect(toolbar).toContain('t("toolbar.circuitFocus")');
    expect(focus).toContain('labelKey: "observation.cpuFlow"');
    expect(inspector).toContain('labelKey: "inspector.sourceMap"');
    expect(output).toContain('labelKey: "tabs.outputLog"');
    expect(memory).toContain('t("memory.start")');
    const migratedComponents = toolbar + focus + inspector + output + memory;
    expect(migratedComponents).not.toMatch(/locale\s*===\s*["'](?:ja|en|zh-CN)["']/);
    expect(migratedComponents).not.toContain("resources[");
  });

  it("english_resource_is_complete_and_translation_values_are_not_empty", () => {
    const englishKeys = Object.keys(resources.en);
    expect(englishKeys.length).toBeGreaterThan(60);
    for (const locale of ["en", "ja", "zh-CN"] as const) {
      for (const [key, value] of Object.entries(resources[locale])) {
        expect(englishKeys, `${locale} contains unknown key ${key}`).toContain(key);
        expect(value.trim(), `${locale}.${key} must not be empty`).not.toBe("");
      }
    }
  });

  it("interpolation_placeholders_match_english", () => {
    const placeholders = (value: string) => [...value.matchAll(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g)].map((match) => match[1]).sort();
    for (const locale of ["ja", "zh-CN"] as const) {
      for (const [key, value] of Object.entries(resources[locale])) {
        expect(placeholders(value), `${locale}.${key} placeholders`).toEqual(placeholders(resources.en[key as keyof typeof resources.en]));
      }
    }
  });

  it("approved_pilot_terms_exist_in_resources", () => {
    const pilotKeys: TranslationKey[] = [
      "tabs.outputLog", "tabs.console", "tabs.messages", "tabs.generatedCasl", "tabs.machineCode",
      "common.clear", "common.go", "common.read", "common.write", "common.details", "common.compact",
      "empty.noOutput", "empty.noDiagnostics", "empty.noMessages", "empty.noTraceEntries", "empty.noSourceMapping",
      "table.name", "table.value", "table.address", "table.label", "table.mark", "table.meaning", "table.source", "table.mapping",
      "memory.start", "memory.rows", "memory.program"
    ];
    for (const key of pilotKeys) {
      expect(resources.ja).toHaveProperty(key);
      expect(resources["zh-CN"]).toHaveProperty(key);
    }
  });

  it("phase14c_components_use_semantic_keys_without_locale_conditionals", () => {
    const files = [
      "src/components/CircuitFocusLayout.tsx",
      "src/components/LearningFlowPanel.tsx",
      "src/components/OutputPanel.tsx",
      "src/components/RegisterPanel.tsx",
      "src/components/SourceEditor.tsx",
      "src/components/StatusBar.tsx",
      "src/visual/CometCircuitSvg.tsx"
    ].map((path) => readFileSync(path, "utf8")).join("\n");

    for (const key of [
      't("instruction.current")',
      't("timeline.title")',
      't("signalProbe.title")',
      't("stackPreview.title")',
      't("callStack.title")',
      't("stackFrame.title")',
      't("codeMachine.machineCode")'
    ]) {
      expect(files).toContain(key);
    }
    expect(files).not.toMatch(/locale\s*===\s*["'](?:ja|en|zh-CN)["']/);
  });

  it("technical_payloads_and_lessons_remain_outside_localized_diagnostic_templates", () => {
    const keySource = readFileSync("src/i18n/types.ts", "utf8");
    const app = readFileSync("src/App.tsx", "utf8");
    const trace = readFileSync("src/components/TracePanel.tsx", "utf8");
    const demoGuide = readFileSync("src/components/DemoGuidePanel.tsx", "utf8");
    const lessons = readFileSync("src/examples/learningLessons.ts", "utf8");

    expect(keySource).not.toMatch(/"(?:mnemonic|register\.gr0|lessons\.)/);
    expect(keySource).toContain('"diagnostics.assembler.unknownSymbol"');
    expect(app).toContain("renderDiagnostic(diagnostic, locale)");
    expect(trace).toContain("event.changedRegister");
    expect(trace).toContain('t("empty.noTraceEntries")');
    expect(demoGuide).not.toContain("useI18n");
    expect(lessons).not.toContain("useI18n");
  });
});
