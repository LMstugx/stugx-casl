export const STARTUP_SELECTION_VALUE_SEMANTICS = "last-successfully-committed-built-in-example" as const;
export const STARTUP_SELECTION_VALID_SOURCE = "canonical-built-in-example-registry-id" as const;

export const STARTUP_SELECTION_FALLBACK_POLICY = {
  invalidStoredId: "default-example",
  invalidDefaultId: "first-registry-example",
  emptyRegistry: "existing-safe-initial-document-fallback",
  writesFallbackToStorage: false
} as const;

export const STARTUP_SELECTION_PROHIBITED_FIELDS = [
  "sourceContent",
  "externalFileName",
  "absolutePath",
  "untitledContent",
  "dirtyState",
  "documentId",
  "sourceUnitId",
  "fileSystemFileHandle",
  "saveTargetId",
  "writeBinding",
  "diagnostics",
  "diagnosticSelection",
  "editorMarkers",
  "generatedCasl",
  "machineCode",
  "sourceMap",
  "trace",
  "runtimeOutput",
  "vmState",
  "assemblyState",
  "runState",
  "framePlan",
  "selectedFrameSlot",
  "pendingOperation",
  "modalState",
  "locale",
  "applicationPreferences"
] as const;

export const STARTUP_SELECTION_INDEPENDENT_STORAGE_KEYS = {
  locale: "stugx.casl.locale",
  applicationPreferences: "stugx.casl.preferences.v1"
} as const;

export const STARTUP_SELECTION_BOOTSTRAP_POLICY = {
  timing: "synchronous-before-initial-store-exposure",
  createsWorkingDocument: true,
  invokesReplacementController: false,
  invokesFileAdapter: false,
  invokesAssembler: false,
  writesDuringBootstrap: false
} as const;

export const STARTUP_SELECTION_WRITE_POLICY = {
  trigger: "successful-built-in-example-replacement-only",
  sameExampleNoopWrite: false,
  externalOrUntitledWrite: false,
  failureRollsBackReplacement: false
} as const;

export const STARTUP_SELECTION_CLEAR_POLICY = {
  clearsOnlyStartupSelectionKey: true,
  changesCurrentDocument: false,
  clearsLocale: false,
  clearsApplicationPreferences: false
} as const;

export const STARTUP_SELECTION_SECURITY_POLICY = {
  allowlistOnly: true,
  plainObjectOnly: true,
  canonicalRegistryValidation: true,
  prototypeMerge: false,
  dynamicImport: false,
  fileRead: false,
  networkAccess: false,
  telemetry: false
} as const;

export const STARTUP_SELECTION_DEFERRED_SESSION_RESTORE = [
  "external-file-reopen",
  "untitled-source-restore",
  "dirty-source-restore",
  "runtime-state-restore"
] as const;
