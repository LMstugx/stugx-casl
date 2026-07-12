import { STARTUP_SELECTION_STORAGE_KEY, type StartupSelectionV1 } from "./types";
import { parseStartupSelection, serializeStartupSelection } from "./validation";

export interface StartupSelectionStorage {
  read(): StartupSelectionV1 | null;
  write(value: StartupSelectionV1): void;
  clear(): void;
}

function browserLocalStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export class WebLocalStorageStartupSelectionStorage implements StartupSelectionStorage {
  constructor(private readonly getStorage: () => Storage | null = browserLocalStorage) {}

  read(): StartupSelectionV1 | null {
    try {
      return parseStartupSelection(this.getStorage()?.getItem(STARTUP_SELECTION_STORAGE_KEY) ?? null);
    } catch {
      return null;
    }
  }

  write(value: StartupSelectionV1): void {
    try {
      this.getStorage()?.setItem(STARTUP_SELECTION_STORAGE_KEY, serializeStartupSelection(value));
    } catch {
      // Startup selection is best-effort and never rolls back a committed example switch.
    }
  }

  clear(): void {
    try {
      this.getStorage()?.removeItem(STARTUP_SELECTION_STORAGE_KEY);
    } catch {
      // Clearing startup selection is safe when storage is unavailable.
    }
  }
}
