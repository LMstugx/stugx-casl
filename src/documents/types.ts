declare const documentIdBrand: unique symbol;
declare const sourceUnitIdBrand: unique symbol;
declare const saveTargetIdBrand: unique symbol;

export type DocumentId = string & { readonly [documentIdBrand]: "DocumentId" };
export type SourceUnitId = string & { readonly [sourceUnitIdBrand]: "SourceUnitId" };
export type SaveTargetId = string & { readonly [saveTargetIdBrand]: "SaveTargetId" };

export const DOCUMENT_LANGUAGES = ["casl", "cpp"] as const;
export const DOCUMENT_EXTENSIONS = [".cas", ".cpp"] as const;
export const DOCUMENT_ORIGINS = ["untitled", "example", "external-file", "restored-session"] as const;
export const DOCUMENT_SAVE_CAPABILITIES = ["save", "save-as-only", "unsupported"] as const;
export const DOCUMENT_LINE_ENDINGS = ["lf", "crlf", "mixed", "unknown"] as const;
export const SAVE_STRATEGIES = ["file-system-access", "download"] as const;

export type DocumentLanguage = (typeof DOCUMENT_LANGUAGES)[number];
export type DocumentExtension = (typeof DOCUMENT_EXTENSIONS)[number];
export type DocumentOrigin = (typeof DOCUMENT_ORIGINS)[number];
export type DocumentSaveCapability = (typeof DOCUMENT_SAVE_CAPABILITIES)[number];
export type DocumentLineEnding = (typeof DOCUMENT_LINE_ENDINGS)[number];
export type SaveStrategy = (typeof SAVE_STRATEGIES)[number];

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
