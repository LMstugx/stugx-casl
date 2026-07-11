import { formatDiagnosticDeveloperDetail } from "../diagnostics/presentation";
import { createExternalDocument, isDocumentDirty } from "./documentModel";
import { defaultFileOpenOptions, type FileOpenOptions, type TextFileAdapter } from "./fileAdapter";
import type { SafeFileFailure } from "./lifecycle";
import type { DocumentId, DocumentIdFactory, SourceDocument, SourceUnitId } from "./types";

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
    if (isDocumentDirty(request.currentDocument) && !request.allowDiscard) return { status: "blocked-unsaved" };
    if (this.activeOperationId) return { status: "stale-ignored" };

    const operationId = this.ids.nextOperationId();
    this.activeOperationId = operationId;
    try {
      const result = await this.adapter.openTextFile(request.options ?? defaultFileOpenOptions());
      if (this.activeOperationId !== operationId) return { status: "stale-ignored" };
      if (request.isCurrentDocument && !request.isCurrentDocument(request.currentDocument.documentId)) {
        return { status: "stale-ignored" };
      }
      if (result.status === "cancelled") return { status: "cancelled" };
      if (result.status === "failure") {
        const developerDetail = formatDiagnosticDeveloperDetail(result.rawContext);
        return {
          status: "failed",
          failure: {
            kind: result.kind,
            ...(result.safeMessage ? { safeMessage: result.safeMessage } : {}),
            ...(developerDetail ? { developerDetail } : {})
          }
        };
      }
      const document = createExternalDocument(result.value, this.ids);
      return { status: "opened", document, documentId: document.documentId, sourceUnitId: document.sourceUnitId };
    } finally {
      if (this.activeOperationId === operationId) this.activeOperationId = null;
    }
  }

  invalidateActiveOperation(): void {
    this.activeOperationId = null;
  }
}
