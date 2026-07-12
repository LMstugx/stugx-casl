export const FILE_LIFECYCLE_BASELINE_VERSION = 1 as const;

export const APPLICATION_PREFERENCE_CATEGORIES = [
  "locale",
  "theme",
  "observationMode",
  "circuitFocus",
  "accessibility",
  "lessonProgress"
] as const;

export const PROHIBITED_PERSISTENCE_FIELDS = [
  "sourceContent",
  "absolutePath",
  "fileSystemFileHandle",
  "saveTargetId",
  "documentId",
  "sourceUnitId",
  "diagnostics",
  "editorMarkers",
  "generatedCasl",
  "machineCode",
  "vmState",
  "trace",
  "dirtyContent",
  "pendingOperation",
  "rawContext",
  "locale"
] as const;

export const FILE_ENCODING_POLICY = {
  encoding: "utf-8",
  openBom: "strip",
  saveBom: "omit",
  internalLineEnding: "lf",
  detectedLineEndings: ["lf", "crlf", "mixed"]
} as const;

export const BEFORE_UNLOAD_POLICY = {
  condition: "document-dirty-only",
  nativePrompt: true,
  customMessage: false,
  automaticSave: false,
  storageWrite: false
} as const;
