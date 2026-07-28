import type { SupportedLocale, Translate, TranslationKey } from "./types";

export const SUPPORTED_LOCALES = ["en", "ja", "zh-CN"] as const satisfies readonly SupportedLocale[];
export const DEFAULT_LOCALE: SupportedLocale = "en";
export const FALLBACK_LOCALE: SupportedLocale = "en";

export function parseSupportedLocale(value: string | null | undefined): SupportedLocale | null {
  const normalized = value?.trim().replace(/_/g, "-").toLowerCase();
  if (!normalized) return null;
  if (normalized === "en" || normalized.startsWith("en-")) return "en";
  if (normalized === "ja" || normalized.startsWith("ja-")) return "ja";
  if (normalized === "zh" || normalized === "zh-cn" || normalized.startsWith("zh-cn-") || normalized === "zh-hans" || normalized.startsWith("zh-hans-") || normalized === "zh-sg" || normalized.startsWith("zh-sg-")) {
    return "zh-CN";
  }
  return null;
}

export function normalizeLocale(value: string | null | undefined): SupportedLocale {
  return parseSupportedLocale(value) ?? DEFAULT_LOCALE;
}

const statusKeys: Readonly<Record<string, TranslationKey>> = {
  Idle: "status.idle",
  Dirty: "status.dirty",
  Ready: "status.ready",
  Running: "status.running",
  Stopped: "status.stopped",
  Finished: "status.finished",
  Error: "status.error",
  WaitingInput: "status.waitingInput"
};

export function translateRunState(t: Translate, runState: string): string {
  const key = statusKeys[runState];
  return key ? t(key) : runState;
}
