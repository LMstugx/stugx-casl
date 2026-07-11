import type { DocumentExtension, DocumentLanguage, DocumentLineEnding } from "./types";

export const DEFAULT_MAX_TEXT_FILE_BYTES = 1024 * 1024;
export const SUPPORTED_TEXT_EXTENSIONS = [".cas", ".cpp"] as const;

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
  mode: "save" | "save-as";
  suggestedFileName: string;
  extension: DocumentExtension;
  language: DocumentLanguage;
  text: string;
  encoding: "utf-8";
  lineEnding: DocumentLineEnding;
}

export interface SavedTextFile {
  fileName: string;
  extension: DocumentExtension;
  byteLength: number;
  encoding: "utf-8";
  lineEnding: Exclude<DocumentLineEnding, "unknown">;
}

export type FileOperationFailureKind =
  | "permission"
  | "unsupported"
  | "invalid-extension"
  | "invalid-encoding"
  | "too-large"
  | "io"
  | "unknown";

export type FileOperationResult<T> =
  | { status: "success"; value: T }
  | { status: "cancelled" }
  | { status: "failure"; kind: FileOperationFailureKind; safeMessage?: string; rawContext?: unknown };

export interface TextFileAdapter {
  openTextFile(options: FileOpenOptions): Promise<FileOperationResult<OpenedTextFile>>;
  saveTextFile(request: SaveTextFileRequest): Promise<FileOperationResult<SavedTextFile>>;
}

export function defaultFileOpenOptions(): FileOpenOptions {
  return { acceptedExtensions: SUPPORTED_TEXT_EXTENSIONS, maxBytes: DEFAULT_MAX_TEXT_FILE_BYTES };
}
