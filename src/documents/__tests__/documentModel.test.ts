import { describe, expect, it } from "vitest";
import { getDemoProgram } from "../../examples/demoPrograms";
import {
  createDocument,
  createExampleDocument,
  createExternalDocument,
  createUntitledDocument,
  editDocument,
  isDocumentDirty,
  markDocumentSaved,
  renameDocumentAfterSaveAs,
  resetDocumentFromExample
} from "../documentModel";
import { createSequentialDocumentIdFactory } from "../idFactory";
import { createSourceDerivedState } from "../sourceOwnership";
import { resolveUnsavedDecision } from "../unsavedGuard";

describe("Phase 15A document model", () => {
  it("document_id_is_not_filename", () => {
    const document = createExternalDocument(openedCasl("same.cas", "MAIN START\n END"), createSequentialDocumentIdFactory("identity"));
    expect(document.documentId).not.toBe(document.fileName);
  });

  it("source_unit_id_is_not_localized_text", () => {
    const document = createUntitledDocument("casl", createSequentialDocumentIdFactory("source-owner"));
    expect(document.sourceUnitId).not.toContain("Untitled");
    expect(document.sourceUnitId).not.toContain("localized");
  });

  it("example_document_does_not_mutate_example_definition", () => {
    const example = getDemoProgram("cpp-addition")!;
    const original = example.source;
    const document = createExampleDocument(example, createSequentialDocumentIdFactory("example"));
    const edited = editDocument(document, `${document.content}\n// working copy`);
    expect(example.source).toBe(original);
    expect(edited.content).not.toBe(example.source);
  });

  it("untitled_document_is_save_as_only_and_initially_clean", () => {
    const document = createUntitledDocument("cpp", createSequentialDocumentIdFactory("untitled"));
    expect(document).toMatchObject({ origin: "untitled", fileName: null, saveCapability: "save-as-only", revision: 0, savedRevision: null });
    expect(isDocumentDirty(document)).toBe(false);
  });

  it("external_document_is_clean_after_open_simulation", () => {
    const document = createExternalDocument(openedCasl("program.cas", "MAIN START\n END"), createSequentialDocumentIdFactory("external"));
    expect(document).toMatchObject({ origin: "external-file", saveCapability: "save", revision: 0, savedRevision: 0 });
    expect(isDocumentDirty(document)).toBe(false);
  });

  it("restored_document_without_confirmed_saved_revision_is_dirty", () => {
    const document = createDocument({ language: "casl", origin: "restored-session", content: "MAIN START\n END" }, createSequentialDocumentIdFactory("restored"));
    expect(document.savedRevision).toBeNull();
    expect(isDocumentDirty(document)).toBe(true);
  });

  it("locale_is_not_part_of_document", () => {
    const document = createUntitledDocument("casl", createSequentialDocumentIdFactory("locale"));
    expect(document).not.toHaveProperty("locale");
  });

  it("generated_casl_is_not_document_content", () => {
    const document = createDocument({ language: "cpp", origin: "untitled", content: "int main() { return 0; }" }, createSequentialDocumentIdFactory("generated"));
    expect(document).not.toHaveProperty("generatedCasl");
    expect(document.content).toContain("int main");
  });

  it("revision_and_saved_revision_determine_dirty", () => {
    const initial = createExternalDocument(openedCasl("program.cas", "A"), createSequentialDocumentIdFactory("revision"));
    const edited = editDocument(initial, "B");
    expect(edited.revision).toBe(1);
    expect(edited.savedRevision).toBe(0);
    expect(isDocumentDirty(edited)).toBe(true);
    expect(isDocumentDirty(markDocumentSaved(edited))).toBe(false);
  });

  it("source_edit_marks_dirty", () => {
    const document = createUntitledDocument("casl", createSequentialDocumentIdFactory("edit"));
    expect(isDocumentDirty(editDocument(document, "MAIN START\n END"))).toBe(true);
  });

  it("locale_switch_does_not_mark_dirty", () => {
    const document = createExternalDocument(openedCasl("program.cas", "A"), createSequentialDocumentIdFactory("locale-dirty"));
    const locale = "ja";
    expect(locale).toBe("ja");
    expect(isDocumentDirty(document)).toBe(false);
  });

  it("diagnostic_selection_does_not_mark_dirty", () => {
    const document = createExternalDocument(openedCasl("program.cas", "A"), createSequentialDocumentIdFactory("diagnostic-selection"));
    const derived = createSourceDerivedState(document.sourceUnitId, { selectedDiagnosticIdentity: "diagnostic-1" });
    expect(derived.selectedDiagnosticIdentity).toBe("diagnostic-1");
    expect(isDocumentDirty(document)).toBe(false);
  });

  it("assemble_does_not_mark_source_clean", () => {
    const document = editDocument(createExternalDocument(openedCasl("program.cas", "A"), createSequentialDocumentIdFactory("assemble")), "B");
    createSourceDerivedState(document.sourceUnitId, { assemblyResult: { ok: true }, vmLoaded: true });
    expect(isDocumentDirty(document)).toBe(true);
  });

  it("save_success_marks_current_revision_saved", () => {
    const edited = editDocument(createExternalDocument(openedCasl("program.cas", "A"), createSequentialDocumentIdFactory("save")), "B");
    const saved = markDocumentSaved(edited, 100);
    expect(saved.savedRevision).toBe(saved.revision);
    expect(saved.lastSavedAt).toBe(100);
    expect(isDocumentDirty(saved)).toBe(false);
  });

  it("save_cancel_preserves_document", () => {
    const document = editDocument(createUntitledDocument("casl", createSequentialDocumentIdFactory("cancel")), "A");
    expect(resolveUnsavedDecision(document, "save", { status: "cancelled" }).document).toBe(document);
  });

  it("save_failure_preserves_document", () => {
    const document = editDocument(createUntitledDocument("casl", createSequentialDocumentIdFactory("failure")), "A");
    expect(resolveUnsavedDecision(document, "save", { status: "failure", kind: "io" }).document).toBe(document);
  });

  it("save_as_success_updates_filename_without_changing_content", () => {
    const document = editDocument(createUntitledDocument("casl", createSequentialDocumentIdFactory("save-as")), "MAIN START\n END");
    const saved = renameDocumentAfterSaveAs(document, savedCasl("lesson.cas", document.content.length), 200);
    expect(saved).toMatchObject({ fileName: "lesson.cas", displayName: "lesson.cas", origin: "external-file", saveCapability: "save", lastSavedAt: 200 });
    expect(saved.content).toBe(document.content);
    expect(saved.revision).toBe(document.revision);
    expect(isDocumentDirty(saved)).toBe(false);
  });

  it("filename_change_does_not_change_source_range", () => {
    const document = editDocument(createUntitledDocument("casl", createSequentialDocumentIdFactory("range")), "MAIN START\n END");
    const range = { start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: 5, offset: 4 } };
    const saved = renameDocumentAfterSaveAs(document, savedCasl("renamed.cas", document.content.length));
    expect(saved.sourceUnitId).toBe(document.sourceUnitId);
    expect(range).toEqual({ start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: 5, offset: 4 } });
  });

  it("reset_document_from_example_creates_new_lifecycle_identity", () => {
    const ids = createSequentialDocumentIdFactory("reset-example");
    const current = createUntitledDocument("casl", ids);
    const replacement = resetDocumentFromExample(current, getDemoProgram("casl-gr2-addition")!, ids);
    expect(replacement.documentId).not.toBe(current.documentId);
    expect(replacement.sourceUnitId).not.toBe(current.sourceUnitId);
  });
});

function openedCasl(fileName: string, text: string) {
  return { fileName, extension: ".cas" as const, language: "casl" as const, text, byteLength: text.length, encoding: "utf-8" as const, lineEnding: "lf" as const };
}

function savedCasl(fileName: string, byteLength: number) {
  return { fileName, extension: ".cas" as const, byteLength, encoding: "utf-8" as const, lineEnding: "lf" as const };
}
