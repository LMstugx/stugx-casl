import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE, FALLBACK_LOCALE, normalizeLocale, SUPPORTED_LOCALES } from "../locale";
import { resolveInitialLocale, WebLocalStorageLocaleStorage, type LocaleStorage } from "../localeStorage";
import type { SupportedLocale } from "../types";

function fixedStorage(value: SupportedLocale | null): LocaleStorage {
  return { read: () => value, write: () => undefined, clear: () => undefined };
}

describe("locale contract", () => {
  it("supported_locales_are_en_ja_zh_cn", () => {
    expect(SUPPORTED_LOCALES).toEqual(["en", "ja", "zh-CN"]);
    expect(DEFAULT_LOCALE).toBe("en");
    expect(FALLBACK_LOCALE).toBe("en");
  });

  it.each([
    ["unknown_locale_falls_back_to_en", "fr-FR", "en"],
    ["en_us_normalizes_to_en", "en-US", "en"],
    ["en_gb_normalizes_to_en", "en-GB", "en"],
    ["ja_jp_normalizes_to_ja", "ja-JP", "ja"],
    ["zh_normalizes_to_zh_cn", "zh", "zh-CN"],
    ["zh_hans_normalizes_to_zh_cn", "zh-Hans", "zh-CN"],
    ["zh_sg_normalizes_to_zh_cn", "zh-SG", "zh-CN"]
  ])("%s", (_name, input, expected) => {
    expect(normalizeLocale(input)).toBe(expected);
  });

  it("saved_locale_overrides_browser_locale", () => {
    expect(resolveInitialLocale(fixedStorage("ja"), "zh-CN")).toBe("ja");
  });

  it("invalid_saved_locale_is_ignored", () => {
    const invalidStorage = fixedStorage("invalid" as SupportedLocale);
    expect(resolveInitialLocale(invalidStorage, "ja-JP")).toBe("ja");
  });

  it("locale_storage_failure_is_safe", () => {
    const failingAdapter = new WebLocalStorageLocaleStorage(() => {
      throw new Error("storage blocked");
    });
    expect(failingAdapter.read()).toBeNull();
    expect(() => failingAdapter.write("zh-CN")).not.toThrow();
    expect(resolveInitialLocale(failingAdapter, "ja-JP")).toBe("ja");
  });
});
