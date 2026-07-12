import { getDemoProgram } from "../examples/demoPrograms";
import { createExampleDocument, createUntitledDocument, isDocumentDirty } from "./documentModel";
import type { DocumentIdFactory, DocumentLanguage, SourceDocument } from "./types";

export type SourceReplacementIntent =
  | { kind: "open-file" }
  | { kind: "new-document"; language: DocumentLanguage }
  | { kind: "select-example"; exampleId: string };

export type ReplacementPreparation =
  | { status: "ready"; intent: SourceReplacementIntent }
  | { status: "requires-unsaved-decision"; intent: SourceReplacementIntent }
  | { status: "no-op"; intent: SourceReplacementIntent }
  | { status: "invalid"; intent: SourceReplacementIntent; reason: "invalid-language" | "unknown-example" };

export function prepareSourceReplacement(
  document: SourceDocument,
  intent: SourceReplacementIntent,
  currentExampleId: string
): ReplacementPreparation {
  if (intent.kind === "new-document" && intent.language !== "casl" && intent.language !== "cpp") {
    return { status: "invalid", intent, reason: "invalid-language" };
  }
  if (intent.kind === "select-example") {
    if (!getDemoProgram(intent.exampleId)) return { status: "invalid", intent, reason: "unknown-example" };
    if (currentExampleId === intent.exampleId) return { status: "no-op", intent };
  }
  return isDocumentDirty(document)
    ? { status: "requires-unsaved-decision", intent }
    : { status: "ready", intent };
}

export function createSynchronousReplacement(intent: Exclude<SourceReplacementIntent, { kind: "open-file" }>, ids: DocumentIdFactory): SourceDocument | null {
  if (intent.kind === "new-document") return createUntitledDocument(intent.language, ids);
  const example = getDemoProgram(intent.exampleId);
  return example ? createExampleDocument(example, ids) : null;
}

export function selectedExampleForIntent(intent: SourceReplacementIntent): string {
  return intent.kind === "select-example" ? intent.exampleId : "";
}
