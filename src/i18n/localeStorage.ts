import { parseSupportedLocale } from "./locale";
import type { SupportedLocale } from "./types";

export const LOCALE_STORAGE_KEY = "stugx.casl.locale";

export interface LocaleStorage {
  read(): SupportedLocale | null;
  write(locale: SupportedLocale): void;
}

export class WebLocalStorageLocaleStorage implements LocaleStorage {
  constructor(private readonly getStorage: () => Storage = () => window.localStorage) {}

  read(): SupportedLocale | null {
    try {
      return parseSupportedLocale(this.getStorage().getItem(LOCALE_STORAGE_KEY));
    } catch {
      return null;
    }
  }

  write(locale: SupportedLocale): void {
    try {
      this.getStorage().setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      // Locale persistence is best-effort; the active UI locale remains usable.
    }
  }
}

export function resolveInitialLocale(storage: LocaleStorage, browserLocale?: string): SupportedLocale {
  try {
    const saved = storage.read();
    const parsedSaved = parseSupportedLocale(saved);
    if (parsedSaved) return parsedSaved;
  } catch {
    // Custom storage adapters may throw; browser locale remains a safe fallback.
  }
  return parseSupportedLocale(browserLocale) ?? "en";
}
