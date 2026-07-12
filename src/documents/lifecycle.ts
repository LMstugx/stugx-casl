import { formatDiagnosticDeveloperDetail } from "../diagnostics/presentation";
import { markDocumentRevisionSaved, renameDocumentAfterSaveAs, replaceDocument } from "./documentModel";
import type { FileOperationFailureKind, SavedTextFile } from "./fileAdapter";
import { invalidateSourceDerivedState, type SourceDerivedState } from "./sourceOwnership";
import type { DocumentId, SourceDocument } from "./types";

export type FileLifecycleStatus = "idle" | "opening" | "saving" | "save-as" | "confirming-replace" | "creating-document" | "switching-example";

export interface SafeFileFailure {
  kind: FileOperationFailureKind;
  safeMessage?: string;
  developerDetail?: string;
}

export interface FileLifecycleState {
  status: FileLifecycleStatus;
  operationId: string | null;
  pendingDocumentId: DocumentId | null;
  lastFailure: SafeFileFailure | null;
}

export interface DocumentSessionState {
  document: SourceDocument;
  derived: SourceDerivedState;
  lifecycle: FileLifecycleState;
}

export function createIdleFileLifecycleState(): FileLifecycleState {
  return { status: "idle", operationId: null, pendingDocumentId: null, lastFailure: null };
}

export function createDocumentSession(document: SourceDocument, derived: SourceDerivedState): DocumentSessionState {
  if (document.sourceUnitId !== derived.sourceUnitId) throw new Error("document and derived state must share source ownership");
  return { document, derived, lifecycle: createIdleFileLifecycleState() };
}

export function beginFileOperation(
  session: DocumentSessionState,
  status: Exclude<FileLifecycleStatus, "idle">,
  operationId: string,
  pendingDocumentId: DocumentId | null = session.document.documentId
): DocumentSessionState {
  if (session.lifecycle.status !== "idle" || !operationId.trim()) return session;
  return {
    ...session,
    lifecycle: { status, operationId, pendingDocumentId, lastFailure: null }
  };
}

export function cancelFileOperation(session: DocumentSessionState, operationId: string): DocumentSessionState {
  if (!isCurrentOperation(session, operationId)) return session;
  return { ...session, lifecycle: createIdleFileLifecycleState() };
}

export function failFileOperation(
  session: DocumentSessionState,
  operationId: string,
  failure: { kind: FileOperationFailureKind; safeMessage?: string; rawContext?: unknown }
): DocumentSessionState {
  if (!isCurrentOperation(session, operationId)) return session;
  const developerDetail = formatDiagnosticDeveloperDetail(failure.rawContext);
  return {
    ...session,
    lifecycle: {
      ...createIdleFileLifecycleState(),
      lastFailure: {
        kind: failure.kind,
        ...(failure.safeMessage ? { safeMessage: failure.safeMessage } : {}),
        ...(developerDetail ? { developerDetail } : {})
      }
    }
  };
}

export function completeOpenOperation(
  session: DocumentSessionState,
  operationId: string,
  replacement: SourceDocument
): DocumentSessionState {
  if (!isCurrentOperation(session, operationId) || session.lifecycle.status !== "opening") return session;
  if (session.lifecycle.pendingDocumentId !== session.document.documentId) return session;
  const document = replaceDocument(session.document, replacement);
  return {
    document,
    derived: invalidateSourceDerivedState(document.sourceUnitId),
    lifecycle: createIdleFileLifecycleState()
  };
}

export function completeSaveOperation(
  session: DocumentSessionState,
  operationId: string,
  saved: SavedTextFile,
  lastSavedAt?: number
): DocumentSessionState {
  if (!isCurrentOperation(session, operationId)) return session;
  if (session.lifecycle.status !== "saving" && session.lifecycle.status !== "save-as") return session;
  if (session.lifecycle.pendingDocumentId !== session.document.documentId) return session;
  if (session.lifecycle.status === "saving" && session.document.saveCapability !== "save") return session;
  const document = session.lifecycle.status === "save-as"
    ? renameDocumentAfterSaveAs(session.document, saved, lastSavedAt)
    : markDocumentRevisionSaved(session.document, saved.savedRevision, lastSavedAt);
  return { ...session, document, lifecycle: createIdleFileLifecycleState() };
}

function isCurrentOperation(session: DocumentSessionState, operationId: string): boolean {
  return session.lifecycle.status !== "idle" && session.lifecycle.operationId === operationId;
}
