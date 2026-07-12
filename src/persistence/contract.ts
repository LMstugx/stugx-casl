import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "../i18n/locale";
import { LOCALE_STORAGE_KEY, LOCALE_STORAGE_MAX_BYTES } from "../i18n/localeStorage";
import {
  APPLICATION_PREFERENCE_FIELDS,
  APPLICATION_PREFERENCES_STORAGE_KEY,
  APPLICATION_PREFERENCES_VERSION,
  DEFAULT_APPLICATION_PREFERENCES,
  MAX_APPLICATION_PREFERENCES_BYTES
} from "../preferences/types";
import {
  STARTUP_SELECTION_MAX_BYTES,
  STARTUP_SELECTION_PERSISTED_FIELDS,
  STARTUP_SELECTION_STORAGE_KEY,
  STARTUP_SELECTION_VERSION
} from "../startupSelection/types";
import {
  LESSON_PROGRESS_MAX_BYTES,
  LESSON_PROGRESS_PERSISTED_FIELDS,
  LESSON_PROGRESS_STORAGE_KEY,
  LESSON_PROGRESS_VERSION
} from "../lessonProgress/types";

export const PERSISTENCE_BASELINE_VERSION = 1 as const;

export const PERSISTENCE_BOOTSTRAP_ORDER = [
  "locale",
  "application-preferences",
  "startup-selection",
  "lesson-progress",
  "initial-store"
] as const;

export const PERSISTENCE_STORAGE_KEYS = {
  locale: LOCALE_STORAGE_KEY,
  applicationPreferences: APPLICATION_PREFERENCES_STORAGE_KEY,
  startupSelection: STARTUP_SELECTION_STORAGE_KEY,
  lessonProgress: LESSON_PROGRESS_STORAGE_KEY
} as const;

export const PERSISTENCE_PAYLOAD_LIMITS = {
  locale: LOCALE_STORAGE_MAX_BYTES,
  applicationPreferences: MAX_APPLICATION_PREFERENCES_BYTES,
  startupSelection: STARTUP_SELECTION_MAX_BYTES,
  lessonProgress: LESSON_PROGRESS_MAX_BYTES
} as const;

export const PERSISTENCE_STORAGE_INVENTORY = [
  {
    id: "locale",
    owner: "i18n",
    key: LOCALE_STORAGE_KEY,
    schemaVersion: "canonical-value",
    maxPayloadBytes: LOCALE_STORAGE_MAX_BYTES,
    persistedFields: ["locale"],
    defaults: { locale: DEFAULT_LOCALE },
    allowedValues: [...SUPPORTED_LOCALES],
    unknownFieldPolicy: "not-applicable",
    unknownVersionPolicy: "not-versioned",
    malformedPayloadPolicy: "ignore-and-resolve-browser-or-default",
    writeTiming: "explicit-locale-switch",
    resetPolicy: "clear-locale-key-only",
    failurePolicy: "retain-active-locale-and-isolate",
    runtimeSourceOfTruth: "i18n-context",
    migrationPolicy: "canonical-locale-normalization-only",
    decision: "frozen"
  },
  {
    id: "application-preferences",
    owner: "application-preference-controller",
    key: APPLICATION_PREFERENCES_STORAGE_KEY,
    schemaVersion: APPLICATION_PREFERENCES_VERSION,
    maxPayloadBytes: MAX_APPLICATION_PREFERENCES_BYTES,
    persistedFields: [...APPLICATION_PREFERENCE_FIELDS],
    defaults: { ...DEFAULT_APPLICATION_PREFERENCES },
    unknownFieldPolicy: "ignore-field",
    unknownVersionPolicy: "ignore-payload",
    malformedPayloadPolicy: "use-current-defaults",
    writeTiming: "allowlisted-preference-change",
    resetPolicy: "clear-preference-key-and-restore-defaults",
    failurePolicy: "retain-in-memory-preferences-and-isolate",
    runtimeSourceOfTruth: "app-store-preference-slice",
    migrationPolicy: "explicit-pure-version-migration-required",
    decision: "frozen"
  },
  {
    id: "startup-selection",
    owner: "startup-selection-controller",
    key: STARTUP_SELECTION_STORAGE_KEY,
    schemaVersion: STARTUP_SELECTION_VERSION,
    maxPayloadBytes: STARTUP_SELECTION_MAX_BYTES,
    persistedFields: [...STARTUP_SELECTION_PERSISTED_FIELDS],
    defaults: { lastExampleId: "application-default-example" },
    unknownFieldPolicy: "ignore-field",
    unknownVersionPolicy: "ignore-payload",
    malformedPayloadPolicy: "use-default-example",
    writeTiming: "successful-built-in-example-commit",
    resetPolicy: "clear-startup-selection-key-only",
    failurePolicy: "retain-committed-document-and-isolate",
    runtimeSourceOfTruth: "built-in-example-registry-and-current-document",
    migrationPolicy: "explicit-pure-version-or-id-alias-migration-required",
    decision: "frozen"
  },
  {
    id: "lesson-progress",
    owner: "lesson-progress-controller",
    key: LESSON_PROGRESS_STORAGE_KEY,
    schemaVersion: LESSON_PROGRESS_VERSION,
    maxPayloadBytes: LESSON_PROGRESS_MAX_BYTES,
    persistedFields: ["version", "entries", ...LESSON_PROGRESS_PERSISTED_FIELDS],
    defaults: { entries: [] },
    unknownFieldPolicy: "ignore-field",
    unknownVersionPolicy: "ignore-payload",
    malformedPayloadPolicy: "use-empty-progress",
    writeTiming: "completed-step-set-change",
    resetPolicy: "per-lesson-or-clear-progress-key-only",
    failurePolicy: "retain-in-memory-progress-and-isolate",
    runtimeSourceOfTruth: "lesson-registry-and-app-store-progress-slice",
    migrationPolicy: "explicit-pure-version-and-step-id-migration-required",
    decision: "frozen"
  }
] as const;

export const PERSISTENCE_PROHIBITED_DATA_CATEGORIES = [
  "source-content",
  "filename-or-path",
  "document-or-source-unit-id",
  "file-handle-or-save-target-id",
  "dirty-state",
  "diagnostics-markers-selection-or-raw-context",
  "generated-casl-machine-code-or-source-map",
  "trace-output-or-vm-state",
  "assembly-or-run-state",
  "pending-operation-modal-focus-cursor-or-scroll",
  "external-file-reopen-data",
  "timestamp",
  "arbitrary-user-entered-text",
  "combined-session-payload"
] as const;

export const PERSISTENCE_VERSION_POLICIES = {
  locale: "unknown-value-normalizes-to-en; invalid-stored-value-is-ignored",
  applicationPreferences: "unknown-version-ignored; valid-v1-fields-resolve-independently",
  startupSelection: "unknown-version-ignored; invalid-id-falls-back-without-writeback",
  lessonProgress: "unknown-version-ignored; lesson-version-mismatch-discards-only-that-lesson"
} as const;

export const PERSISTENCE_FAILURE_ISOLATION_POLICY = {
  perKeyReadWriteClearIsolation: true,
  failureWritesOtherKeys: false,
  failureMutatesSourceRuntimeOrDirty: false,
  failureCreatesCodeDiagnostic: false,
  retryLoop: false
} as const;

export const PERSISTENCE_RESET_ISOLATION_POLICY = {
  locale: [LOCALE_STORAGE_KEY],
  applicationPreferences: [APPLICATION_PREFERENCES_STORAGE_KEY],
  startupSelection: [STARTUP_SELECTION_STORAGE_KEY],
  lessonProgress: [LESSON_PROGRESS_STORAGE_KEY],
  combinedResetUi: false
} as const;

export const PERSISTENCE_WRITE_TRIGGER_MATRIX = {
  localeSwitch: [LOCALE_STORAGE_KEY],
  observationMode: [APPLICATION_PREFERENCES_STORAGE_KEY],
  circuitFocus: [APPLICATION_PREFERENCES_STORAGE_KEY],
  inspectorOrOutputTab: [APPLICATION_PREFERENCES_STORAGE_KEY],
  successfulBuiltInExampleSwitch: [STARTUP_SELECTION_STORAGE_KEY],
  lessonStepToggleOrReset: [LESSON_PROGRESS_STORAGE_KEY],
  newOpenSaveSaveAs: [],
  sourceEdit: [],
  assembleRunStep: [],
  diagnosticOrFrameSelection: [],
  hydrationOrFallback: []
} as const;

export const PERSISTENCE_SECURITY_POLICY = {
  allowlistOnly: true,
  sizeBoundedBeforeSanitization: true,
  ownDataPropertiesOnly: true,
  prototypeMerge: false,
  getterExecution: false,
  deterministicSerialization: true,
  fullPayloadProductionLogging: false,
  dynamicImportFileReadUrlConstruction: false,
  networkSyncTelemetry: false
} as const;

export const PERSISTENCE_SOURCE_OF_TRUTH_POLICY = {
  runtimeRegistriesAndStoresRemainAuthoritative: true,
  aggregateBaselineIsRuntimeInput: false,
  independentBaselinesRemainAuthoritativeSnapshots: true,
  storageIsUntrustedInput: true
} as const;

export const PERSISTENCE_MIGRATION_POLICY = {
  explicitPureFunctionRequired: true,
  shapeGuessing: false,
  futureVersionReinterpretation: false,
  localeOrDisplayTextMatching: false,
  indexFuzzyOrSourceHashMatching: false,
  fileSystemOrNetworkAccess: false,
  migrationFailurePolicy: "use-current-defaults-without-writeback"
} as const;

export const PERSISTENCE_DEFERRED_SESSION_RESTORE = [
  "source-or-dirty-document",
  "external-file-reopen",
  "file-handle-or-write-binding",
  "diagnostics-generated-output-or-vm",
  "cursor-selection-scroll-or-modal-state",
  "recent-files-project-or-multi-document-session"
] as const;
