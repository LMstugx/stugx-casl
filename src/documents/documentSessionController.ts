import { formatDiagnosticDeveloperDetail } from "../diagnostics/presentation";
import { createExternalDocument, isDocumentDirty, renameDocumentAfterSaveAs } from "./documentModel";
import { defaultFileOpenOptions, type FileOpenOptions, type SaveTextFileRequest, type TextFileAdapter } from "./fileAdapter";
import { defaultFileNameForLanguage, sanitizeSuggestedFileName } from "./saveFileName";
import { createSynchronousReplacement, prepareSourceReplacement, selectedExampleForIntent, type SourceReplacementIntent } from "./replacementIntent";
import type { SafeFileFailure } from "./lifecycle";
import type { DocumentId, DocumentIdFactory, DocumentWriteBinding, SaveStrategy, SourceDocument, SourceUnitId } from "./types";

export type OpenDocumentResult =
  | { status: "opened"; document: SourceDocument; documentId: DocumentId; sourceUnitId: SourceUnitId }
  | { status: "cancelled" }
  | { status: "blocked-unsaved" }
  | { status: "failed"; failure: SafeFileFailure }
  | { status: "stale-ignored" };

export interface OpenDocumentRequest {
  currentDocument: SourceDocument;
  allowDiscard?: boolean;
  isCurrentDocument?: (documentId: DocumentId) => boolean;
  options?: FileOpenOptions;
}

export type SourceReplacementResult =
  | { status: "replaced"; intent: SourceReplacementIntent; document: SourceDocument; selectedExampleId: string }
  | { status: "cancelled" }
  | { status: "requires-unsaved-decision"; intent: SourceReplacementIntent }
  | { status: "failed"; intent: SourceReplacementIntent; failure: SafeFileFailure }
  | { status: "stale-ignored" }
  | { status: "no-op" };

export interface SourceReplacementRequest {
  intent: SourceReplacementIntent;
  currentDocument: SourceDocument;
  currentExampleId: string;
  allowDiscard?: boolean;
  isCurrentDocument?: (documentId: DocumentId) => boolean;
  options?: FileOpenOptions;
}

export type SaveDocumentResult =
  | {
      status: "saved";
      document: SourceDocument;
      strategy: SaveStrategy;
      savedRevision: number;
      stillDirty: boolean;
      writeBinding: DocumentWriteBinding | null;
    }
  | { status: "cancelled" }
  | { status: "failed"; failure: SafeFileFailure }
  | { status: "stale-ignored" }
  | { status: "unsupported" };

export interface SaveDocumentRequest {
  currentDocument: SourceDocument;
  writeBinding: DocumentWriteBinding | null;
  getCurrentDocument?: () => SourceDocument;
}

export class DocumentSessionController {
  private activeOperationId: string | null = null;

  constructor(
    private readonly adapter: TextFileAdapter,
    private readonly ids: DocumentIdFactory
  ) {}

  get operationId(): string | null {
    return this.activeOperationId;
  }

  async requestOpen(request: OpenDocumentRequest): Promise<OpenDocumentResult> {
    const result = await this.requestReplacement({
      intent: { kind: "open-file" },
      currentDocument: request.currentDocument,
      currentExampleId: "",
      allowDiscard: request.allowDiscard,
      isCurrentDocument: request.isCurrentDocument,
      options: request.options
    });
    if (result.status === "replaced") return { status: "opened", document: result.document, documentId: result.document.documentId, sourceUnitId: result.document.sourceUnitId };
    if (result.status === "requires-unsaved-decision") return { status: "blocked-unsaved" };
    if (result.status === "failed") return { status: "failed", failure: result.failure };
    return result.status === "no-op" ? { status: "stale-ignored" } : result;
  }

  async requestReplacement(request: SourceReplacementRequest): Promise<SourceReplacementResult> {
    const preparation = prepareSourceReplacement(request.currentDocument, request.intent, request.currentExampleId);
    if (preparation.status === "no-op") return { status: "no-op" };
    if (preparation.status === "invalid") {
      return { status: "failed", intent: request.intent, failure: { kind: "unknown", safeMessage: preparation.reason } };
    }
    if (preparation.status === "requires-unsaved-decision" && !request.allowDiscard) {
      return { status: "requires-unsaved-decision", intent: request.intent };
    }
    if (this.activeOperationId) return { status: "stale-ignored" };

    const operationId = this.ids.nextOperationId();
    this.activeOperationId = operationId;
    try {
      let document: SourceDocument | null;
      if (request.intent.kind === "open-file") {
        const result = await this.adapter.openTextFile(request.options ?? defaultFileOpenOptions());
        if (this.activeOperationId !== operationId) return { status: "stale-ignored" };
        if (result.status === "cancelled") return { status: "cancelled" };
        if (result.status === "failure") return { status: "failed", intent: request.intent, failure: toSafeFailure(result) };
        document = createExternalDocument(result.value, this.ids);
      } else {
        document = createSynchronousReplacement(request.intent, this.ids);
      }
      if (this.activeOperationId !== operationId) return { status: "stale-ignored" };
      if (request.isCurrentDocument && !request.isCurrentDocument(request.currentDocument.documentId)) return { status: "stale-ignored" };
      if (!document) return { status: "failed", intent: request.intent, failure: { kind: "unknown", safeMessage: "replacement-unavailable" } };
      return { status: "replaced", intent: request.intent, document, selectedExampleId: selectedExampleForIntent(request.intent) };
    } catch (error) {
      return { status: "failed", intent: request.intent, failure: toSafeFailure({ status: "failure", kind: "unknown", rawContext: error }) };
    } finally {
      if (this.activeOperationId === operationId) this.activeOperationId = null;
    }
  }

  requestSave(request: SaveDocumentRequest): Promise<SaveDocumentResult> {
    const binding = request.writeBinding;
    const canSave = binding
      && binding.documentId === request.currentDocument.documentId
      && request.currentDocument.saveCapability === "save"
      && (this.adapter.hasWriteBinding?.(binding) ?? true);
    return this.performSave(request, canSave ? "save" : "save-as", canSave ? binding : null);
  }

  requestSaveAs(request: SaveDocumentRequest): Promise<SaveDocumentResult> {
    return this.performSave(request, "save-as", null);
  }

  releaseDocumentBinding(documentId: DocumentId): void {
    this.adapter.releaseDocumentBinding?.(documentId);
  }

  invalidateActiveOperation(): void {
    this.activeOperationId = null;
  }

  private async performSave(
    request: SaveDocumentRequest,
    mode: SaveTextFileRequest["mode"],
    binding: DocumentWriteBinding | null
  ): Promise<SaveDocumentResult> {
    if (this.activeOperationId) return { status: "stale-ignored" };
    const snapshot = request.currentDocument;
    const operationId = this.ids.nextOperationId();
    this.activeOperationId = operationId;
    const saveRequest: SaveTextFileRequest = {
      documentId: snapshot.documentId,
      sourceUnitId: snapshot.sourceUnitId,
      revision: snapshot.revision,
      mode,
      fileName: sanitizeSuggestedFileName(snapshot.fileName ?? defaultFileNameForLanguage(snapshot.language), snapshot.language),
      extension: snapshot.extension,
      language: snapshot.language,
      text: snapshot.content,
      encoding: "utf-8",
      lineEnding: snapshot.lineEnding === "crlf" ? "crlf" : "lf",
      ...(binding ? { targetId: binding.targetId } : {})
    };

    try {
      const result = await this.adapter.saveTextFile(saveRequest);
      if (this.activeOperationId !== operationId) {
        if (result.status === "success" && result.value.confirmedWrite) this.adapter.releaseDocumentBinding?.(snapshot.documentId);
        return { status: "stale-ignored" };
      }
      const current = request.getCurrentDocument?.() ?? snapshot;
      if (current.documentId !== snapshot.documentId || current.sourceUnitId !== snapshot.sourceUnitId) {
        if (result.status === "success" && result.value.confirmedWrite) this.adapter.releaseDocumentBinding?.(snapshot.documentId);
        return { status: "stale-ignored" };
      }
      if (result.status === "cancelled") return { status: "cancelled" };
      if (result.status === "failure") {
        if (result.kind === "unsupported") return { status: "unsupported" };
        return { status: "failed", failure: toSafeFailure(result) };
      }
      const document = renameDocumentAfterSaveAs(current, result.value);
      return {
        status: "saved",
        document,
        strategy: result.value.strategy,
        savedRevision: result.value.savedRevision,
        stillDirty: isDocumentDirty(document),
        writeBinding: result.value.confirmedWrite ? result.value.writeBinding : null
      };
    } finally {
      if (this.activeOperationId === operationId) this.activeOperationId = null;
    }
  }
}

function toSafeFailure(failure: Extract<Awaited<ReturnType<TextFileAdapter["saveTextFile"]>>, { status: "failure" }>): SafeFileFailure {
  const developerDetail = formatDiagnosticDeveloperDetail(failure.rawContext);
  return {
    kind: failure.kind,
    ...(failure.safeMessage ? { safeMessage: failure.safeMessage } : {}),
    ...(developerDetail ? { developerDetail } : {})
  };
}
