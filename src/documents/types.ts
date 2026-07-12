declare const documentIdBrand: unique symbol;
declare const sourceUnitIdBrand: unique symbol;
declare const saveTargetIdBrand: unique symbol;

export type DocumentId = string & { readonly [documentIdBrand]: "DocumentId" };
export type SourceUnitId = string & { readonly [sourceUnitIdBrand]: "SourceUnitId" };
export type SaveTargetId = string & { readonly [saveTargetIdBrand]: "SaveTargetId" };

export type DocumentLanguage = "casl" | "cpp";
export type DocumentExtension = ".cas" | ".cpp";
export type DocumentOrigin = "untitled" | "example" | "external-file" | "restored-session";
export type DocumentSaveCapability = "save" | "save-as-only" | "unsupported";
export type DocumentLineEnding = "lf" | "crlf" | "mixed" | "unknown";
export type SaveStrategy = "file-system-access" | "download";

export interface DocumentWriteBinding {
  documentId: DocumentId;
  targetId: SaveTargetId;
  strategy: "file-system-access";
  fileName: string;
}

export interface SourceDocument {
  documentId: DocumentId;
  sourceUnitId: SourceUnitId;
  language: DocumentLanguage;
  origin: DocumentOrigin;
  fileName: string | null;
  displayName: string;
  extension: DocumentExtension;
  content: string;
  revision: number;
  savedRevision: number | null;
  saveCapability: DocumentSaveCapability;
  encoding: "utf-8";
  lineEnding: DocumentLineEnding;
  createdAt?: number;
  lastSavedAt?: number;
}

export interface DocumentIdFactory {
  nextDocumentId(): DocumentId;
  nextSourceUnitId(): SourceUnitId;
  nextOperationId(): string;
}

export interface SourceOwned<T> {
  sourceUnitId: SourceUnitId;
  value: T;
}
