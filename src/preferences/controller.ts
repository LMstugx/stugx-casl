import type { ApplicationPreferenceStorage } from "./storage";
import { DEFAULT_APPLICATION_PREFERENCES, type ResolvedApplicationPreferencesV1 } from "./types";
import { resolveApplicationPreferences, serializeApplicationPreferences } from "./validation";

export class ApplicationPreferenceController {
  private hydrated = false;
  private current = { ...DEFAULT_APPLICATION_PREFERENCES };
  private serialized = serializeApplicationPreferences(this.current);

  constructor(private readonly storage: ApplicationPreferenceStorage) {}

  hydrate(): ResolvedApplicationPreferencesV1 {
    if (this.hydrated) return { ...this.current };
    let stored = null;
    try {
      stored = this.storage.read();
    } catch {
      stored = null;
    }
    this.current = resolveApplicationPreferences(stored);
    this.serialized = serializeApplicationPreferences(this.current);
    this.hydrated = true;
    return { ...this.current };
  }

  persist(preferences: ResolvedApplicationPreferencesV1): boolean {
    const next = resolveApplicationPreferences(preferences);
    const serialized = serializeApplicationPreferences(next);
    if (serialized === this.serialized) return false;
    this.current = next;
    this.serialized = serialized;
    this.hydrated = true;
    try {
      this.storage.write(next);
    } catch {
      // Custom adapters may throw; persistence must not roll back UI state.
    }
    return true;
  }

  reset(): ResolvedApplicationPreferencesV1 {
    this.current = { ...DEFAULT_APPLICATION_PREFERENCES };
    this.serialized = serializeApplicationPreferences(this.current);
    this.hydrated = true;
    try {
      this.storage.clear();
    } catch {
      // Reset remains in-memory safe even if storage cleanup fails.
    }
    return { ...this.current };
  }
}
