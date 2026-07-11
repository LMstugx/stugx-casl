import type { DocumentId, DocumentIdFactory, SourceUnitId } from "./types";

export function createSequentialDocumentIdFactory(namespace = "session"): DocumentIdFactory {
  const safeNamespace = namespace.trim() || "session";
  let documentSequence = 0;
  let sourceSequence = 0;
  let operationSequence = 0;
  return {
    nextDocumentId: () => `${safeNamespace}:document:${++documentSequence}` as DocumentId,
    nextSourceUnitId: () => `${safeNamespace}:source:${++sourceSequence}` as SourceUnitId,
    nextOperationId: () => `${safeNamespace}:operation:${++operationSequence}`
  };
}
