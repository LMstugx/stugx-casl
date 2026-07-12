import { resolveStartupExampleId } from "./resolution";
import type { StartupSelectionStorage } from "./storage";
import { STARTUP_SELECTION_VERSION, type StartupExampleResolution, type StartupSelectionV1 } from "./types";
import { sanitizeStartupSelection, serializeStartupSelection } from "./validation";

type ExampleRegistryEntry = { id: string };

export class StartupSelectionController {
  private hydrated = false;
  private current: StartupSelectionV1 | null = null;
  private serialized: string | null = null;

  constructor(private readonly storage: StartupSelectionStorage) {}

  hydrate(): StartupSelectionV1 | null {
    if (!this.hydrated) {
      try {
        this.current = sanitizeStartupSelection(this.storage.read());
        this.serialized = this.current ? serializeStartupSelection(this.current) : null;
      } catch {
        this.current = null;
        this.serialized = null;
      }
      this.hydrated = true;
    }
    return this.current ? { ...this.current } : null;
  }

  resolveBootstrap(exampleRegistry: readonly ExampleRegistryEntry[], defaultExampleId: string): StartupExampleResolution {
    return resolveStartupExampleId(this.hydrate()?.lastExampleId, exampleRegistry, defaultExampleId);
  }

  persistSuccessfulExample(exampleId: string, exampleRegistry: readonly ExampleRegistryEntry[]): boolean {
    const valid = exampleRegistry.some(
      (entry) => Object.prototype.hasOwnProperty.call(entry, "id") && entry.id === exampleId
    );
    if (!valid) return false;
    const next = { version: STARTUP_SELECTION_VERSION, lastExampleId: exampleId } as const;
    const serialized = serializeStartupSelection(next);
    if (serialized === this.serialized) return false;
    this.current = next;
    this.serialized = serialized;
    this.hydrated = true;
    try {
      this.storage.write(next);
    } catch {
      // Persistence failure must not roll back the already committed replacement.
    }
    return true;
  }

  clear(): void {
    this.current = null;
    this.serialized = null;
    this.hydrated = true;
    try {
      this.storage.clear();
    } catch {
      // Clearing selection never changes the current working document.
    }
  }
}
