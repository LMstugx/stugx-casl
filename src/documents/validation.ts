import {
  DEFAULT_MAX_TEXT_FILE_BYTES,
  SUPPORTED_TEXT_EXTENSIONS,
  type FileOpenOptions,
  type FileOperationResult,
  type OpenedTextFile
} from "./fileAdapter";
import type { DocumentExtension, DocumentLanguage, DocumentLineEnding } from "./types";

export interface TextFileCandidate {
  fileName: string;
  text: string;
  byteLength?: number;
}

export interface NormalizedEditorText {
  text: string;
  lineEnding: Exclude<DocumentLineEnding, "unknown">;
  hadUtf8Bom: boolean;
}

export function extensionToLanguage(extension: string): DocumentLanguage | null {
  const normalized = extension.toLowerCase();
  if (normalized === ".cas") return "casl";
  if (normalized === ".cpp") return "cpp";
  return null;
}

export function languageToExtension(language: DocumentLanguage): DocumentExtension {
  return language === "casl" ? ".cas" : ".cpp";
}

export function safeDisplayFileName(input: string): string {
  const withoutPath = input.split(/[\\/]/).pop() ?? "";
  return withoutPath.replace(/[\u0000-\u001f\u007f]/g, "").trim();
}

export function extensionFromFileName(fileName: string): string {
  const safeName = safeDisplayFileName(fileName);
  const dot = safeName.lastIndexOf(".");
  return dot >= 0 ? safeName.slice(dot).toLowerCase() : "";
}

export function detectLineEnding(text: string): Exclude<DocumentLineEnding, "unknown"> {
  const crlfCount = text.match(/\r\n/g)?.length ?? 0;
  const bareLfCount = text.match(/(^|[^\r])\n/g)?.length ?? 0;
  const bareCrCount = text.match(/\r(?!\n)/g)?.length ?? 0;
  if ((crlfCount && (bareLfCount || bareCrCount)) || bareCrCount) return "mixed";
  return crlfCount ? "crlf" : "lf";
}

export function normalizeTextForEditor(text: string): NormalizedEditorText {
  const hadUtf8Bom = text.startsWith("\uFEFF");
  const withoutBom = hadUtf8Bom ? text.slice(1) : text;
  return {
    text: withoutBom.replace(/\r\n?/g, "\n"),
    lineEnding: detectLineEnding(withoutBom),
    hadUtf8Bom
  };
}

export function serializeTextForSave(text: string, preferredLineEnding: DocumentLineEnding): string {
  const normalized = text.replace(/\r\n?/g, "\n");
  return preferredLineEnding === "crlf" ? normalized.replace(/\n/g, "\r\n") : normalized;
}

export function validateTextFileCandidate(
  candidate: TextFileCandidate,
  options: FileOpenOptions = { acceptedExtensions: SUPPORTED_TEXT_EXTENSIONS, maxBytes: DEFAULT_MAX_TEXT_FILE_BYTES }
): FileOperationResult<OpenedTextFile> {
  const fileName = safeDisplayFileName(candidate.fileName);
  const extension = extensionFromFileName(fileName);
  const language = extensionToLanguage(extension);
  const accepted = options.acceptedExtensions.some((value) => value.toLowerCase() === extension);
  if (!fileName || !language || !accepted) return { status: "failure", kind: "invalid-extension" };

  const measuredByteLength = new TextEncoder().encode(candidate.text).byteLength;
  const byteLength = Math.max(candidate.byteLength ?? measuredByteLength, measuredByteLength);
  if (!Number.isFinite(byteLength) || byteLength < 0 || byteLength > options.maxBytes) {
    return { status: "failure", kind: "too-large" };
  }
  if (candidate.text.includes("\0")) return { status: "failure", kind: "binary" };

  const normalized = normalizeTextForEditor(candidate.text);
  return {
    status: "success",
    value: {
      fileName,
      extension: extension as DocumentExtension,
      language,
      text: normalized.text,
      byteLength,
      encoding: "utf-8",
      lineEnding: normalized.lineEnding
    }
  };
}
