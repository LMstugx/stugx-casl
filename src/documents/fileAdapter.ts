import type { DocumentExtension, DocumentId, DocumentLanguage, DocumentLineEnding, DocumentWriteBinding, SaveStrategy, SaveTargetId, SourceUnitId } from "./types";

export const DEFAULT_MAX_TEXT_FILE_BYTES = 1024 * 1024;
export const SUPPORTED_TEXT_EXTENSIONS = [".cas", ".cpp"] as const;
export const FILE_OPERATION_RESULT_STATUSES = ["success", "cancelled", "failure"] as const;
export const FILE_OPERATION_FAILURE_KINDS = [
  "permission",
  "unsupported",
  "invalid-extension",
  "invalid-filename",
  "invalid-encoding",
  "binary",
  "too-large",
  "io",
  "stale-target",
  "unknown"
] as const;

export interface FileOpenOptions {
  acceptedExtensions: readonly DocumentExtension[];
  maxBytes: number;
}

export interface OpenedTextFile {
  fileName: string;
  extension: DocumentExtension;
  language: DocumentLanguage;
  text: string;
  byteLength: number;
  encoding: "utf-8";
  lineEnding: Exclude<DocumentLineEnding, "unknown">;
}

export interface SaveTextFileRequest {
  documentId: DocumentId;
  sourceUnitId: SourceUnitId;
  revision: number;
  mode: "save" | "save-as";
  fileName: string;
  extension: DocumentExtension;
  language: DocumentLanguage;
  text: string;
  encoding: "utf-8";
  lineEnding: "lf" | "crlf";
  targetId?: SaveTargetId;
}

export interface SavedTextFileBase {
  strategy: SaveStrategy;
  fileName: string;
  extension: DocumentExtension;
  byteLength: number;
  encoding: "utf-8";
  lineEnding: "lf" | "crlf";
  savedRevision: number;
}

export type SavedTextFile =
  | (SavedTextFileBase & {
      strategy: "file-system-access";
      targetId: SaveTargetId;
      confirmedWrite: true;
      writeBinding: DocumentWriteBinding;
    })
  | (SavedTextFileBase & {
      strategy: "download";
      confirmedWrite: false;
      downloadRequested: true;
    });

export type FileOperationFailureKind = (typeof FILE_OPERATION_FAILURE_KINDS)[number];

export type FileOperationResult<T> =
  | { status: "success"; value: T }
  | { status: "cancelled" }
  | { status: "failure"; kind: FileOperationFailureKind; safeMessage?: string; rawContext?: unknown };

export interface TextFileAdapter {
  openTextFile(options: FileOpenOptions): Promise<FileOperationResult<OpenedTextFile>>;
  saveTextFile(request: SaveTextFileRequest): Promise<FileOperationResult<SavedTextFile>>;
  hasWriteBinding?(binding: DocumentWriteBinding): boolean;
  releaseDocumentBinding?(documentId: DocumentId): void;
}

export function defaultFileOpenOptions(): FileOpenOptions {
  return { acceptedExtensions: SUPPORTED_TEXT_EXTENSIONS, maxBytes: DEFAULT_MAX_TEXT_FILE_BYTES };
}
