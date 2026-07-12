export const LESSON_PROGRESS_IDENTITY_POLICY = {
  lessonIdentity: "explicit-canonical-lesson-id",
  stepIdentity: "explicit-lesson-local-step-id",
  builtInOnly: true,
  arrayIndexIdentity: false,
  textIdentity: false,
  localeIdentity: false,
  sourceHashIdentity: false
} as const;

export const LESSON_PROGRESS_LESSON_COMPATIBILITY_POLICY = {
  versionField: "progressCompatibilityVersion",
  matchingVersion: "restore-current-step-intersection",
  mismatchedVersion: "discard-lesson-entry",
  deletedLesson: "ignore",
  exampleIdMismatch: "ignore"
} as const;

export const LESSON_PROGRESS_STEP_COMPATIBILITY_POLICY = {
  wordingChange: "preserve",
  addedStep: "incomplete",
  deletedStep: "ignore-stored-id",
  renamedStep: "new-step-unless-explicit-code-migration",
  fuzzyMigration: false
} as const;

export const LESSON_PROGRESS_HYDRATION_POLICY = {
  timing: "synchronous-before-initial-store-exposure",
  oncePerController: true,
  writesDuringHydration: false,
  sourceMutation: false,
  runtimeMutation: false
} as const;

export const LESSON_PROGRESS_WRITE_POLICY = {
  trigger: "completed-step-set-change-only",
  hydrationWrite: false,
  unrelatedAppStateWrite: false,
  unchangedWrite: false,
  failureRollback: false
} as const;

export const LESSON_PROGRESS_RESET_POLICY = {
  perLessonResetPersists: true,
  clearAllRemovesOnlyLessonProgressKey: true,
  changesSourceOrRuntime: false,
  clearsIndependentStorage: false
} as const;

export const LESSON_PROGRESS_PROHIBITED_FIELDS = [
  "lessonTitle",
  "lessonText",
  "stepLabel",
  "stepText",
  "checkpointText",
  "sourceContent",
  "exampleSource",
  "fileName",
  "absolutePath",
  "documentId",
  "sourceUnitId",
  "fileSystemFileHandle",
  "saveTargetId",
  "diagnostics",
  "editorMarkers",
  "generatedCasl",
  "machineCode",
  "trace",
  "vmState",
  "activeLessonPanel",
  "selectedFrameSlot",
  "selectedMachineCodeRow",
  "selectedSourceRow",
  "pendingOperation",
  "modalState",
  "locale",
  "applicationPreferences",
  "startupSelection",
  "timestamp",
  "percentage",
  "stepIndex"
] as const;

export const LESSON_PROGRESS_INDEPENDENT_STORAGE_KEYS = {
  locale: "stugx.casl.locale",
  applicationPreferences: "stugx.casl.preferences.v1",
  startupSelection: "stugx.casl.startup-selection.v1"
} as const;

export const LESSON_PROGRESS_SECURITY_POLICY = {
  allowlistOnly: true,
  entriesArray: true,
  plainObjectOnly: true,
  ownDataPropertiesOnly: true,
  canonicalRegistryValidation: true,
  prototypeMerge: false,
  dynamicImport: false,
  fileRead: false,
  networkSync: false,
  telemetry: false
} as const;

export const LESSON_PROGRESS_BLOCKED_MIGRATION_TECHNIQUES = [
  "array-index-match",
  "lesson-or-step-text-match",
  "localized-label-match",
  "source-content-hash-match",
  "fuzzy-id-match",
  "storage-provided-migration-map"
] as const;

export const LESSON_PROGRESS_DEFERRED_SESSION_RESTORE = [
  "active-lesson-panel",
  "current-lesson-step",
  "lesson-text-versioning",
  "external-or-untitled-source-session"
] as const;
