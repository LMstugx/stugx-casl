import { isDocumentDirty } from "./documentModel";
import type { FileOperationResult, SavedTextFile } from "./fileAdapter";
import type { SourceDocument } from "./types";

export const UNSAVED_DECISIONS = ["save", "discard", "cancel"] as const;
export type UnsavedDecision = (typeof UNSAVED_DECISIONS)[number];
export type GuardedIntent =
  | "new"
  | "open"
  | "replace-source"
  | "switch-project"
  | "close-application"
  | "reload-application"
  | "select-example"
  | "locale-switch"
  | "observation-mode"
  | "tab-switch";

export type UnsavedGuardResult =
  | { status: "proceed"; document: SourceDocument }
  | { status: "cancelled"; document: SourceDocument }
  | { status: "blocked"; reason: "save-required" | "save-cancelled" | "save-failed"; document: SourceDocument };

const replacementIntents = new Set<GuardedIntent>([
  "new", "open", "replace-source", "switch-project", "close-application", "reload-application", "select-example"
]);

export function requiresUnsavedGuard(document: SourceDocument, intent: GuardedIntent): boolean {
  return replacementIntents.has(intent) && isDocumentDirty(document);
}

export function resolveUnsavedDecision(
  document: SourceDocument,
  decision: UnsavedDecision,
  saveResult?: FileOperationResult<SavedTextFile>
): UnsavedGuardResult {
  if (!isDocumentDirty(document)) return { status: "proceed", document };
  if (decision === "cancel") return { status: "cancelled", document };
  if (decision === "discard") return { status: "proceed", document };
  if (!saveResult) return { status: "blocked", reason: "save-required", document };
  if (saveResult.status === "success") return { status: "proceed", document };
  return {
    status: "blocked",
    reason: saveResult.status === "cancelled" ? "save-cancelled" : "save-failed",
    document
  };
}
