import { APPLICATION_PREFERENCES_VERSION, type InspectorActiveTab, type ObservationMode, type OutputDockActiveTab, type ResolvedApplicationPreferencesV1 } from "./types";

export interface ApplicationPreferenceState {
  observationMode: ObservationMode;
  circuitFocusEnabled: boolean;
  inspectorActiveTab: InspectorActiveTab;
  outputDockActiveTab: OutputDockActiveTab;
}

export function selectApplicationPreferences(state: ApplicationPreferenceState): ResolvedApplicationPreferencesV1 {
  return {
    version: APPLICATION_PREFERENCES_VERSION,
    observationMode: state.observationMode,
    circuitFocusEnabled: state.circuitFocusEnabled,
    inspectorActiveTab: state.inspectorActiveTab,
    outputDockActiveTab: state.outputDockActiveTab
  };
}
