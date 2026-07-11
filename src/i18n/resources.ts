import { FALLBACK_LOCALE } from "./locale";
import { en } from "./locales/en";
import { ja } from "./locales/ja";
import { zhCN } from "./locales/zh-CN";
import type { AnyTranslationKey, PartialTranslationResource, SupportedLocale, Translate, TranslationParams } from "./types";

const resources = {
  en,
  ja,
  "zh-CN": zhCN
} as const satisfies Readonly<Record<SupportedLocale, PartialTranslationResource>>;

function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template;
  return template.replace(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g, (placeholder, name: string) => {
    const value = params[name];
    return value === undefined ? placeholder : String(value);
  });
}

export function translate(locale: SupportedLocale, key: AnyTranslationKey, params?: TranslationParams): string {
  const localized = (resources[locale] as PartialTranslationResource)[key];
  const fallback = (resources[FALLBACK_LOCALE] as PartialTranslationResource)[key];
  return interpolate(localized ?? fallback ?? key, params);
}

export function createTranslator(locale: SupportedLocale): Translate {
  return (key, params) => translate(locale, key, params);
}

export { resources };
