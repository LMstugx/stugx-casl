import { parseSupportedLocale } from "./locale";
import type { SupportedLocale } from "./types";

export const LOCALE_STORAGE_KEY = "stugx.casl.locale";
export const LOCALE_STORAGE_MAX_BYTES = 64;

export interface LocaleStorage {
  read(): SupportedLocale | null;
  write(locale: SupportedLocale): void;
  clear(): void;
}

export class WebLocalStorageLocaleStorage implements LocaleStorage {
  constructor(private readonly getStorage: () => Storage | null = browserLocalStorage) {}

  read(): SupportedLocale | null {
    try {
      const raw = this.getStorage()?.getItem(LOCALE_STORAGE_KEY);
      if (raw === null || raw === undefined || utf8ByteLength(raw) > LOCALE_STORAGE_MAX_BYTES) return null;
      return parseSupportedLocale(raw);
    } catch {
      return null;
    }
  }

  write(locale: SupportedLocale): void {
    try {
      this.getStorage()?.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      // Locale persistence is best-effort; the active UI locale remains usable.
    }
  }

  clear(): void {
    try {
      this.getStorage()?.removeItem(LOCALE_STORAGE_KEY);
    } catch {
      // Clearing locale persistence never changes the active in-memory locale.
    }
  }
}

function browserLocalStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function utf8ByteLength(value: string): number {
  if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(value).byteLength;
  return value.length * 3;
}

export function clearStoredLocale(storage: LocaleStorage): void {
  try {
    storage.clear();
  } catch {
    // Custom adapters remain isolated from the active locale and other storage keys.
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
