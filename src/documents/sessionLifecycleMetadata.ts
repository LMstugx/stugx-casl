import type { DocumentLanguage } from "./types";

type SessionObservationMode = "cpu-flow" | "register-stack" | "code-machine";

export interface SessionLifecycleMetadataV1 {
  version: 1;
  lastDocumentLanguage?: DocumentLanguage;
  lastExampleId?: string;
  observationMode?: SessionObservationMode;
  circuitFocusEnabled?: boolean;
}

const prohibitedKeys = new Set([
  "source", "sourceText", "content", "generatedCasl", "machineCode", "vmState", "diagnostics",
  "selectedDiagnostic", "sourceUnitId", "documentId", "fileHandle", "saveTargetId", "path", "locale",
  "rawContext", "operationId"
]);
const allowedKeys = new Set(["version", "lastDocumentLanguage", "lastExampleId", "observationMode", "circuitFocusEnabled"]);

export function validateSessionLifecycleMetadata(value: unknown): SessionLifecycleMetadataV1 | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.version !== 1 || Object.keys(record).some((key) => prohibitedKeys.has(key) || !allowedKeys.has(key))) return null;
  if (record.lastDocumentLanguage !== undefined && record.lastDocumentLanguage !== "casl" && record.lastDocumentLanguage !== "cpp") return null;
  if (record.lastExampleId !== undefined && typeof record.lastExampleId !== "string") return null;
  if (record.observationMode !== undefined && !["cpu-flow", "register-stack", "code-machine"].includes(String(record.observationMode))) return null;
  if (record.circuitFocusEnabled !== undefined && typeof record.circuitFocusEnabled !== "boolean") return null;
  return {
    version: 1,
    ...(record.lastDocumentLanguage ? { lastDocumentLanguage: record.lastDocumentLanguage as DocumentLanguage } : {}),
    ...(typeof record.lastExampleId === "string" ? { lastExampleId: record.lastExampleId } : {}),
    ...(record.observationMode ? { observationMode: record.observationMode as SessionObservationMode } : {}),
    ...(typeof record.circuitFocusEnabled === "boolean" ? { circuitFocusEnabled: record.circuitFocusEnabled } : {})
  };
}
