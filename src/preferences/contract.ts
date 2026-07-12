export const INDEPENDENTLY_PERSISTED_PREFERENCE_FIELDS = ["locale"] as const;

export const PROHIBITED_APPLICATION_PREFERENCE_FIELDS = [
  "sourceContent",
  "generatedCasl",
  "machineCode",
  "diagnostics",
  "selectedDiagnostic",
  "editorMarkers",
  "trace",
  "vmState",
  "registers",
  "memory",
  "stack",
  "callDepth",
  "assemblyState",
  "runState",
  "documentId",
  "sourceUnitId",
  "fileName",
  "absolutePath",
  "fileSystemFileHandle",
  "saveTargetId",
  "writeBinding",
  "dirtyDocument",
  "fileLifecycle",
  "pendingOperation",
  "rawContext",
  "editorSelection",
  "editorCursor",
  "editorScroll",
  "selectedFrameSlot",
  "selectedMachineCodeRow",
  "sourceMappingSelection",
  "activeModal",
  "fileOperationNotice",
  "locale"
] as const;

export const PHASE_16B_DEFERRED_FIELDS = ["lastExampleId"] as const;

export const PREFERENCE_HYDRATION_POLICY = {
  timing: "synchronous-before-store-initialization",
  oncePerController: true,
  invalidFieldFallback: "current-default",
  sourceMutation: false,
  fileOperation: false
} as const;

export const PREFERENCE_WRITE_POLICY = {
  trigger: "allowlisted-value-change-only",
  unchangedWrite: false,
  failureRollback: false,
  wholeStoreSerialization: false
} as const;

export const PREFERENCE_RESET_POLICY = {
  restoresDefaults: true,
  clearsApplicationPreferenceKey: true,
  clearsLocale: false,
  changesSource: false,
  changesFileLifecycle: false
} as const;

export const PREFERENCE_SECURITY_POLICY = {
  allowlistOnly: true,
  plainObjectOnly: true,
  maximumBytes: 16 * 1024,
  prototypeMerge: false,
  networkSync: false,
  telemetry: false
} as const;
