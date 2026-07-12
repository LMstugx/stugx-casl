import type { DemoProgram } from "../examples/demoPrograms";
import type { OpenedTextFile, SavedTextFile } from "./fileAdapter";
import { languageToExtension, safeDisplayFileName } from "./validation";
import type {
  DocumentExtension,
  DocumentIdFactory,
  DocumentLanguage,
  DocumentLineEnding,
  DocumentOrigin,
  DocumentSaveCapability,
  SourceDocument
} from "./types";

export interface CreateDocumentOptions {
  language: DocumentLanguage;
  origin: DocumentOrigin;
  content?: string;
  fileName?: string | null;
  displayName?: string;
  extension?: DocumentExtension;
  savedRevision?: number | null;
  saveCapability?: DocumentSaveCapability;
  lineEnding?: DocumentLineEnding;
  createdAt?: number;
  lastSavedAt?: number;
}

export function createDocument(options: CreateDocumentOptions, ids: DocumentIdFactory): SourceDocument {
  const extension = options.extension ?? languageToExtension(options.language);
  if (extension !== languageToExtension(options.language)) throw new Error("document extension must match language");
  const fileName = options.fileName ? safeDisplayFileName(options.fileName) || null : null;
  const content = options.content ?? "";
  const revision = options.origin === "untitled" && content.length > 0 ? 1 : 0;
  const savedRevision = options.savedRevision !== undefined
    ? options.savedRevision
    : options.origin === "untitled" || options.origin === "restored-session" ? null : revision;
  return {
    documentId: ids.nextDocumentId(),
    sourceUnitId: ids.nextSourceUnitId(),
    language: options.language,
    origin: options.origin,
    fileName,
    displayName: options.displayName ?? fileName ?? `Untitled${extension}`,
    extension,
    content,
    revision,
    savedRevision,
    saveCapability: options.saveCapability ?? defaultSaveCapability(options.origin),
    encoding: "utf-8",
    lineEnding: options.lineEnding ?? "unknown",
    ...(options.createdAt === undefined ? {} : { createdAt: options.createdAt }),
    ...(options.lastSavedAt === undefined ? {} : { lastSavedAt: options.lastSavedAt })
  };
}

export function createUntitledDocument(language: DocumentLanguage, ids: DocumentIdFactory): SourceDocument {
  return createDocument({ language, origin: "untitled", content: "", savedRevision: null, saveCapability: "save-as-only" }, ids);
}

export function createExampleDocument(example: Pick<DemoProgram, "name" | "mode" | "source">, ids: DocumentIdFactory): SourceDocument {
  return createDocument({
    language: example.mode,
    origin: "example",
    content: `${example.source}`,
    displayName: example.name,
    saveCapability: "save-as-only",
    lineEnding: "lf"
  }, ids);
}

export function createExternalDocument(file: OpenedTextFile, ids: DocumentIdFactory): SourceDocument {
  return createDocument({
    language: file.language,
    origin: "external-file",
    fileName: file.fileName,
    extension: file.extension,
    content: file.text,
    saveCapability: "save-as-only",
    lineEnding: file.lineEnding
  }, ids);
}

export function editDocument(document: SourceDocument, content: string): SourceDocument {
  if (content === document.content) return document;
  return { ...document, content, revision: document.revision + 1 };
}

export function isDocumentDirty(document: SourceDocument): boolean {
  if (document.savedRevision !== null) return document.savedRevision !== document.revision;
  return document.origin === "untitled" ? document.revision > 0 : true;
}

export function markDocumentSaved(document: SourceDocument, lastSavedAt?: number): SourceDocument {
  return markDocumentRevisionSaved(document, document.revision, lastSavedAt);
}

export function markDocumentRevisionSaved(document: SourceDocument, savedRevision: number, lastSavedAt?: number): SourceDocument {
  if (!Number.isInteger(savedRevision) || savedRevision < 0 || savedRevision > document.revision) {
    throw new Error("saved revision must identify an existing document revision");
  }
  return {
    ...document,
    savedRevision,
    ...(lastSavedAt === undefined ? {} : { lastSavedAt })
  };
}

export function renameDocumentAfterSaveAs(document: SourceDocument, saved: SavedTextFile, lastSavedAt?: number): SourceDocument {
  if (saved.extension !== languageToExtension(document.language)) throw new Error("saved extension must match document language");
  const fileName = safeDisplayFileName(saved.fileName);
  if (!fileName) throw new Error("saved file name must not be empty");
  return markDocumentRevisionSaved({
    ...document,
    origin: "external-file",
    fileName,
    displayName: fileName,
    extension: saved.extension,
    saveCapability: saved.confirmedWrite ? "save" : "save-as-only",
    encoding: saved.encoding,
    lineEnding: saved.lineEnding
  }, saved.savedRevision, lastSavedAt);
}

export function replaceDocument(current: SourceDocument, replacement: SourceDocument): SourceDocument {
  if (current.documentId === replacement.documentId || current.sourceUnitId === replacement.sourceUnitId) {
    throw new Error("replacement must have new document and source unit identities");
  }
  return replacement;
}

export function resetDocumentFromExample(
  current: SourceDocument,
  example: Pick<DemoProgram, "name" | "mode" | "source">,
  ids: DocumentIdFactory
): SourceDocument {
  return replaceDocument(current, createExampleDocument(example, ids));
}

function defaultSaveCapability(origin: DocumentOrigin): DocumentSaveCapability {
  if (origin === "external-file") return "save";
  if (origin === "restored-session") return "unsupported";
  return "save-as-only";
}
