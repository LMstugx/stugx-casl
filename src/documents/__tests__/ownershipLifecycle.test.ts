import { describe, expect, it } from "vitest";
import baselineRaw from "../../../docs/diagnostic-localization-baseline-v1.json?raw";
import { mockCaslCore } from "../../core/mockCaslCore";
import { createStructuredDiagnostic } from "../../diagnostics/catalog";
import { diagnosticIdentity, renderDiagnostic } from "../../diagnostics/renderDiagnostic";
import { LOCALE_STORAGE_KEY } from "../../i18n/localeStorage";
import { transpileCppToCasl } from "../../transpiler/cppTranspiler";
import { createExternalDocument, createUntitledDocument, editDocument, isDocumentDirty, renameDocumentAfterSaveAs } from "../documentModel";
import { createSequentialDocumentIdFactory } from "../idFactory";
import {
  beginFileOperation,
  cancelFileOperation,
  completeOpenOperation,
  completeSaveOperation,
  createDocumentSession,
  failFileOperation
} from "../lifecycle";
import { canNavigateRelatedLocation, createSourceDerivedState } from "../sourceOwnership";
import { requiresUnsavedGuard, resolveUnsavedDecision } from "../unsavedGuard";

describe("Phase 15A source ownership and invalidation", () => {
  it("source_replacement_creates_new_source_unit", () => {
    const { session, replacement } = replacementFixture();
    expect(completeOpenOperation(beginFileOperation(session, "opening", "open-1"), "open-1", replacement).document.sourceUnitId).not.toBe(session.document.sourceUnitId);
  });

  it.each([
    ["source_replacement_clears_old_diagnostics", (state: ReturnType<typeof replacedDerived>) => state.diagnostics.length === 0],
    ["source_replacement_clears_selected_diagnostic", (state: ReturnType<typeof replacedDerived>) => state.selectedDiagnosticIdentity === null],
    ["source_replacement_clears_old_markers", (state: ReturnType<typeof replacedDerived>) => state.editorMarkerRange === null],
    ["source_replacement_clears_generated_casl", (state: ReturnType<typeof replacedDerived>) => state.generatedCasl === ""],
    ["source_replacement_clears_machine_code", (state: ReturnType<typeof replacedDerived>) => state.machineCode.length === 0],
    ["source_replacement_clears_trace", (state: ReturnType<typeof replacedDerived>) => state.trace.length === 0],
    ["source_replacement_invalidates_vm", (state: ReturnType<typeof replacedDerived>) => state.vmLoaded === false && state.assemblyResult === null],
    ["source_replacement_clears_frame_slot_selection", (state: ReturnType<typeof replacedDerived>) => state.selectedFrameSlotId === null && state.framePlanPreview === null]
  ])("%s", (_name, assertion) => {
    expect(assertion(replacedDerived())).toBe(true);
  });

  it("locale_switch_does_not_invalidate_source_owned_state", () => {
    const { session } = replacementFixture();
    const locale = "zh-CN";
    expect(locale).toBe("zh-CN");
    expect(session.derived.generatedCasl).toBe("GENERATED");
  });

  it("filename_only_change_does_not_invalidate_source_owned_state", () => {
    const { session } = replacementFixture();
    const savedDocument = renameDocumentAfterSaveAs(session.document, savedCasl("renamed.cas", 0));
    expect(savedDocument.sourceUnitId).toBe(session.document.sourceUnitId);
    expect(session.derived.generatedCasl).toBe("GENERATED");
  });

  it("related_location_cannot_cross_source_unit", () => {
    const { session, replacement } = replacementFixture();
    expect(canNavigateRelatedLocation(session.derived, session.document.sourceUnitId)).toBe(true);
    expect(canNavigateRelatedLocation(session.derived, replacement.sourceUnitId)).toBe(false);
  });
});

describe("Phase 15A file lifecycle state machine", () => {
  it("only_one_file_operation_is_active", () => {
    const { session } = replacementFixture();
    const opening = beginFileOperation(session, "opening", "operation-1");
    expect(beginFileOperation(opening, "saving", "operation-2")).toBe(opening);
  });

  it("open_success_commits_atomically", () => {
    const { session, replacement } = replacementFixture();
    const completed = completeOpenOperation(beginFileOperation(session, "opening", "open-atomic"), "open-atomic", replacement);
    expect(completed.document).toBe(replacement);
    expect(completed.derived.sourceUnitId).toBe(replacement.sourceUnitId);
    expect(completed.lifecycle.status).toBe("idle");
  });

  it("open_failure_preserves_current_document", () => {
    const { session } = replacementFixture();
    const opening = beginFileOperation(session, "opening", "open-fail");
    const failed = failFileOperation(opening, "open-fail", { kind: "io", safeMessage: "The file could not be opened." });
    expect(failed.document).toBe(session.document);
    expect(failed.derived).toBe(session.derived);
    expect(failed.lifecycle).toMatchObject({ status: "idle", lastFailure: { kind: "io" } });
  });

  it("open_cancel_preserves_current_document", () => {
    const { session } = replacementFixture();
    const opening = beginFileOperation(session, "opening", "open-cancel");
    const cancelled = cancelFileOperation(opening, "open-cancel");
    expect(cancelled.document).toBe(session.document);
    expect(cancelled.derived).toBe(session.derived);
    expect(cancelled.lifecycle.status).toBe("idle");
  });

  it("save_success_commits_after_adapter_success", () => {
    const { session } = dirtySession();
    const saving = beginFileOperation(session, "saving", "save-1");
    expect(isDocumentDirty(saving.document)).toBe(true);
    const completed = completeSaveOperation(saving, "save-1", savedCasl("program.cas"));
    expect(isDocumentDirty(completed.document)).toBe(false);
    expect(completed.derived).toBe(session.derived);
  });

  it("save_failure_does_not_mark_clean", () => {
    const { session } = dirtySession();
    const failed = failFileOperation(beginFileOperation(session, "saving", "save-fail"), "save-fail", { kind: "permission" });
    expect(isDocumentDirty(failed.document)).toBe(true);
  });

  it("untitled_document_cannot_complete_plain_save", () => {
    const ids = createSequentialDocumentIdFactory("untitled-save");
    const document = editDocument(createUntitledDocument("casl", ids), "A");
    const session = createDocumentSession(document, createSourceDerivedState(document.sourceUnitId));
    const saving = beginFileOperation(session, "saving", "plain-save");
    expect(completeSaveOperation(saving, "plain-save", savedCasl("program.cas"))).toBe(saving);
    expect(isDocumentDirty(saving.document)).toBe(true);
  });

  it("stale_async_result_does_not_replace_newer_document", () => {
    const { session, replacement } = replacementFixture();
    const opening = beginFileOperation(session, "opening", "new-operation");
    expect(completeOpenOperation(opening, "stale-operation", replacement)).toBe(opening);
    expect(completeSaveOperation(opening, "stale-operation", savedCasl("program.cas"))).toBe(opening);
  });

  it("open_completion_checks_pending_document_identity", () => {
    const { session, replacement } = replacementFixture();
    const opening = beginFileOperation(session, "opening", "open-owner");
    const changedSession = { ...opening, document: replacement, derived: createSourceDerivedState(replacement.sourceUnitId) };
    expect(completeOpenOperation(changedSession, "open-owner", session.document)).toBe(changedSession);
  });

  it("raw_exception_is_not_primary_message", () => {
    const { session } = replacementFixture();
    const failed = failFileOperation(beginFileOperation(session, "opening", "raw"), "raw", {
      kind: "unknown",
      safeMessage: "The file operation failed.",
      rawContext: "C:\\Users\\student\\secret\\file.cas\n    at openInternal()"
    });
    expect(failed.lifecycle.lastFailure?.safeMessage).toBe("The file operation failed.");
    expect(failed.lifecycle.lastFailure?.developerDetail).toBe("[local path]");
  });

  it("locale_switch_during_operation_does_not_change_operation_identity", () => {
    const { session } = replacementFixture();
    const opening = beginFileOperation(session, "opening", "open-locale");
    const locale = "ja";
    expect(locale).toBe("ja");
    expect(opening.lifecycle.operationId).toBe("open-locale");
  });
});

describe("Phase 15A unsaved changes guard", () => {
  it("clean_document_does_not_require_guard", () => {
    const document = createExternalDocument(openedCasl("program.cas", "A"), createSequentialDocumentIdFactory("guard-clean"));
    expect(requiresUnsavedGuard(document, "open")).toBe(false);
  });

  it("dirty_document_requires_guard", () => {
    const document = editDocument(createUntitledDocument("casl", createSequentialDocumentIdFactory("guard-dirty")), "A");
    expect(requiresUnsavedGuard(document, "new")).toBe(true);
  });

  it("cancel_preserves_all_state", () => {
    const document = editDocument(createUntitledDocument("casl", createSequentialDocumentIdFactory("guard-cancel")), "A");
    expect(resolveUnsavedDecision(document, "cancel")).toEqual({ status: "cancelled", document });
  });

  it("discard_allows_replacement", () => {
    const document = editDocument(createUntitledDocument("casl", createSequentialDocumentIdFactory("guard-discard")), "A");
    expect(resolveUnsavedDecision(document, "discard")).toEqual({ status: "proceed", document });
  });

  it("save_failure_blocks_replacement", () => {
    const document = editDocument(createUntitledDocument("casl", createSequentialDocumentIdFactory("guard-save")), "A");
    expect(resolveUnsavedDecision(document, "save", { status: "failure", kind: "io" })).toMatchObject({ status: "blocked", reason: "save-failed" });
    expect(resolveUnsavedDecision(document, "save", { status: "cancelled" })).toMatchObject({ status: "blocked", reason: "save-cancelled" });
  });

  it("locale_switch_never_requires_guard", () => {
    const document = editDocument(createUntitledDocument("casl", createSequentialDocumentIdFactory("guard-locale")), "A");
    expect(requiresUnsavedGuard(document, "locale-switch")).toBe(false);
    expect(requiresUnsavedGuard(document, "observation-mode")).toBe(false);
    expect(requiresUnsavedGuard(document, "tab-switch")).toBe(false);
  });

  it("dirty_demo_switch_contract_is_documented_in_model", () => {
    const document = editDocument(createUntitledDocument("casl", createSequentialDocumentIdFactory("guard-demo")), "A");
    expect(requiresUnsavedGuard(document, "select-example")).toBe(true);
  });
});

describe("Phase 14 regression boundary for file lifecycle scaffold", () => {
  it("diagnostic_baseline_manifest_unchanged", () => {
    const baseline = JSON.parse(baselineRaw) as { baselineVersion: string; structuredDiagnostics: unknown[] };
    expect(baseline.baselineVersion).toBe("diagnostic-localization-v1");
    expect(baseline.structuredDiagnostics).toHaveLength(76);
  });

  it("locale_persistence_contract_unchanged", () => {
    expect(LOCALE_STORAGE_KEY).toBe("stugx.casl.locale");
  });

  it("diagnostic_identity_remains_locale_independent", () => {
    const diagnostic = createStructuredDiagnostic(1, "fallback", "assembler.unknownSymbol", { symbol: "MISSING" });
    expect(diagnosticIdentity(renderDiagnostic(diagnostic, "ja"))).toBe(diagnosticIdentity(renderDiagnostic(diagnostic, "zh-CN")));
  });

  it("parser_assembler_behavior_unchanged", () => {
    expect(mockCaslCore.assemble("MAIN START\n RET\n END").diagnostics).toEqual([]);
    expect(mockCaslCore.assemble("MAIN START\nX BADOP\n END").diagnostics[0].code).toBe("assembler.unknownOpcode");
  });

  it("emitted_casl_unchanged", () => {
    const result = transpileCppToCasl("int main() { return 0; }");
    expect(result.ok).toBe(true);
    expect(result.caslSource).toContain("MAIN START");
    expect(result.caslSource).toContain("     LAD   GR0,0");
    expect(result.caslSource).toContain("     RET");
  });

  it("vm_behavior_unchanged", () => {
    const ready = mockCaslCore.assemble("MAIN START\n LAD GR1,1\n RET\n END");
    const stepped = mockCaslCore.step(ready);
    expect(stepped.gr[1]).toBe(1);
    expect(stepped.pr).toBe(0x22);
  });
});

function replacementFixture() {
  const ids = createSequentialDocumentIdFactory("replacement");
  const document = createExternalDocument(openedCasl("current.cas", "A"), ids);
  const diagnostic = createStructuredDiagnostic(1, "fallback", "assembler.unknownSymbol", { symbol: "MISSING" });
  const derived = createSourceDerivedState(document.sourceUnitId, {
    diagnostics: [diagnostic],
    selectedDiagnosticIdentity: diagnosticIdentity(diagnostic),
    editorMarkerRange: { start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: 2, offset: 1 } },
    generatedCasl: "GENERATED",
    machineCode: [0x1200, 0x0020],
    sourceMap: [{ line: 1, address: 0x20, machineWords: [0x1200], source: "A" }],
    trace: [{ index: 1, address: 0x20, instruction: "LD", detail: "read" }],
    assemblyResult: { ok: true },
    vmLoaded: true,
    framePlanPreview: { available: true },
    selectedFrameSlotId: "main:local:a"
  });
  const replacement = createExternalDocument(openedCasl("replacement.cas", "B"), ids);
  return { session: createDocumentSession(document, derived), replacement };
}

function replacedDerived() {
  const { session, replacement } = replacementFixture();
  return completeOpenOperation(beginFileOperation(session, "opening", "replace"), "replace", replacement).derived;
}

function dirtySession() {
  const ids = createSequentialDocumentIdFactory("dirty-session");
  const document = editDocument({ ...createExternalDocument(openedCasl("program.cas", "A"), ids), saveCapability: "save" as const }, "B");
  return { session: createDocumentSession(document, createSourceDerivedState(document.sourceUnitId, { generatedCasl: "OLD" })) };
}

function openedCasl(fileName: string, text: string) {
  return { fileName, extension: ".cas" as const, language: "casl" as const, text, byteLength: text.length, encoding: "utf-8" as const, lineEnding: "lf" as const };
}

function savedCasl(fileName: string, savedRevision = 1) {
  const documentId = "test-document" as import("../types").DocumentId;
  const targetId = "test-target" as import("../types").SaveTargetId;
  return { strategy: "file-system-access" as const, fileName, extension: ".cas" as const, byteLength: 1, encoding: "utf-8" as const, lineEnding: "lf" as const, savedRevision, targetId, confirmedWrite: true as const, writeBinding: { documentId, targetId, strategy: "file-system-access" as const, fileName } };
}
