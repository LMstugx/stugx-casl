export const STARTUP_SELECTION_VERSION = 1 as const;
export const STARTUP_SELECTION_STORAGE_KEY = "stugx.casl.startup-selection.v1";
export const STARTUP_SELECTION_MAX_BYTES = 4096;
export const STARTUP_SELECTION_MAX_ID_LENGTH = 256;

export const STARTUP_SELECTION_PERSISTED_FIELDS = ["lastExampleId"] as const;

export interface StartupSelectionV1 {
  version: typeof STARTUP_SELECTION_VERSION;
  lastExampleId: string;
}

export type StartupExampleResolution =
  | {
      status: "resolved";
      exampleId: string;
      source: "stored" | "default" | "registry-fallback";
    }
  | { status: "unavailable" };
