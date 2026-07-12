import { APPLICATION_PREFERENCES_STORAGE_KEY, type ApplicationPreferencesV1 } from "./types";
import { parseApplicationPreferences, serializeApplicationPreferences } from "./validation";

export interface ApplicationPreferenceStorage {
  read(): ApplicationPreferencesV1 | null;
  write(preferences: ApplicationPreferencesV1): void;
  clear(): void;
}

function browserLocalStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export class WebLocalStorageApplicationPreferenceStorage implements ApplicationPreferenceStorage {
  constructor(private readonly getStorage: () => Storage | null = browserLocalStorage) {}

  read(): ApplicationPreferencesV1 | null {
    try {
      const raw = this.getStorage()?.getItem(APPLICATION_PREFERENCES_STORAGE_KEY);
      return raw === null || raw === undefined ? null : parseApplicationPreferences(raw);
    } catch {
      return null;
    }
  }

  write(preferences: ApplicationPreferencesV1): void {
    try {
      this.getStorage()?.setItem(APPLICATION_PREFERENCES_STORAGE_KEY, serializeApplicationPreferences(preferences));
    } catch {
      // Preference persistence is best-effort; in-memory UI state remains active.
    }
  }

  clear(): void {
    try {
      this.getStorage()?.removeItem(APPLICATION_PREFERENCES_STORAGE_KEY);
    } catch {
      // Reset remains safe when storage is unavailable.
    }
  }
}
