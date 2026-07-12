export const APPLICATION_PREFERENCES_VERSION = 1 as const;
export const APPLICATION_PREFERENCES_STORAGE_KEY = "stugx.casl.preferences.v1";
export const MAX_APPLICATION_PREFERENCES_BYTES = 16 * 1024;

export const OBSERVATION_MODES = ["cpu-flow", "register-stack", "code-machine"] as const;
export const INSPECTOR_ACTIVE_TABS = ["registers", "memory", "source-map", "trace"] as const;
export const OUTPUT_DOCK_ACTIVE_TABS = ["output", "console", "messages", "generated-casl", "machine-code"] as const;
export const APPLICATION_PREFERENCE_FIELDS = [
  "observationMode",
  "circuitFocusEnabled",
  "inspectorActiveTab",
  "outputDockActiveTab"
] as const;

export type ObservationMode = (typeof OBSERVATION_MODES)[number];
export type InspectorActiveTab = (typeof INSPECTOR_ACTIVE_TABS)[number];
export type OutputDockActiveTab = (typeof OUTPUT_DOCK_ACTIVE_TABS)[number];
export type ApplicationPreferenceField = (typeof APPLICATION_PREFERENCE_FIELDS)[number];

export interface ApplicationPreferencesV1 {
  version: 1;
  observationMode?: ObservationMode;
  circuitFocusEnabled?: boolean;
  inspectorActiveTab?: InspectorActiveTab;
  outputDockActiveTab?: OutputDockActiveTab;
}

export interface ResolvedApplicationPreferencesV1 {
  version: 1;
  observationMode: ObservationMode;
  circuitFocusEnabled: boolean;
  inspectorActiveTab: InspectorActiveTab;
  outputDockActiveTab: OutputDockActiveTab;
}

export const DEFAULT_APPLICATION_PREFERENCES: ResolvedApplicationPreferencesV1 = Object.freeze({
  version: APPLICATION_PREFERENCES_VERSION,
  observationMode: "cpu-flow",
  circuitFocusEnabled: false,
  inspectorActiveTab: "registers",
  outputDockActiveTab: "output"
});
