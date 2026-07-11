import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createTranslator, translate } from "../resources";
import type { TranslationKey } from "../types";

describe("typed translation resources", () => {
  it("missing_ja_key_falls_back_to_en", () => {
    expect(translate("ja", "toolbar.assemble")).toBe("Assemble");
  });

  it("missing_zh_key_falls_back_to_en", () => {
    expect(translate("zh-CN", "observation.registerStack")).toBe("Registers / Stack");
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

    expect(toolbar).toContain('t("toolbar.assemble")');
    expect(toolbar).toContain('t("toolbar.circuitFocus")');
    expect(focus).toContain('labelKey: "observation.cpuFlow"');
    expect(inspector).toContain('labelKey: "inspector.sourceMap"');
    expect(toolbar + focus + inspector).not.toMatch(/locale\s*===\s*["'](?:ja|en|zh-CN)["']/);
    expect(toolbar + focus + inspector).not.toContain("resources[");
  });
});
