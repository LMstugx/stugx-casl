// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { appStoreReducer, createInitialAppState } from "../../store/useAppStore";
import { createStructuredDiagnostic } from "../../diagnostics/catalog";
import { getDemoProgram } from "../../examples/demoPrograms";
import { BeforeUnloadGuardManager, type BeforeUnloadWindow } from "../beforeUnloadGuard";
import { getDocumentDisplayName } from "../documentPresentation";
import { createExternalDocument, createUntitledDocument, editDocument, isDocumentDirty } from "../documentModel";
import { DocumentSessionController } from "../documentSessionController";
import type { FileOperationResult, OpenedTextFile, SaveTextFileRequest, SavedTextFile, TextFileAdapter } from "../fileAdapter";
import { createSequentialDocumentIdFactory } from "../idFactory";
import { prepareSourceReplacement, type SourceReplacementIntent } from "../replacementIntent";
import { validateSessionLifecycleMetadata } from "../sessionLifecycleMetadata";
import type { SourceDocument } from "../types";

describe("Phase 15D shared replacement intent", () => {
  it("open_new_example_use_shared_replacement_intent", () => {
    const intents: SourceReplacementIntent[] = [{ kind: "open-file" }, { kind: "new-document", language: "casl" }, { kind: "select-example", exampleId: "cpp-addition" }];
    expect(intents.map((intent) => prepareSourceReplacement(clean(), intent, "").status)).toEqual(["ready", "ready", "ready"]);
  });

  it("replacement_intent_does_not_use_localized_text", () => {
    expect(JSON.stringify({ kind: "new-document", language: "cpp" } satisfies SourceReplacementIntent)).not.toMatch(/Untitled|無題|未命名/);
  });

  it("pending_intent_survives_locale_switch", () => {
    const intent: SourceReplacementIntent = { kind: "select-example", exampleId: "cpp-addition" };
    const pending = prepareSourceReplacement(editDocument(clean(), "dirty"), intent, "");
    expect(pending).toMatchObject({ status: "requires-unsaved-decision", intent });
    expect(intent).toEqual({ kind: "select-example", exampleId: "cpp-addition" });
  });

  it("repeated_selection_of_same_example_is_noop", () => {
    expect(prepareSourceReplacement(clean(), { kind: "select-example", exampleId: "cpp-addition" }, "cpp-addition").status).toBe("no-op");
  });

  it("invalid_example_is_rejected_without_replacement", () => {
    expect(prepareSourceReplacement(clean(), { kind: "select-example", exampleId: "missing" }, "")).toMatchObject({ status: "invalid", reason: "unknown-example" });
  });
});

describe("Phase 15D New and Example documents", () => {
  it.each([["casl", ".cas"], ["cpp", ".cpp"]] as const)("new_%s_creates_clean_untitled_document", async (language, extension) => {
    const current = clean();
    const result = await controller().requestReplacement({ intent: { kind: "new-document", language }, currentDocument: current, currentExampleId: "" });
    expect(result).toMatchObject({ status: "replaced", document: { language, extension, origin: "untitled", content: "", revision: 0, savedRevision: 0, saveCapability: "save-as-only" } });
    if (result.status !== "replaced") return;
    expect(result.document.documentId).not.toBe(current.documentId);
    expect(result.document.sourceUnitId).not.toBe(current.sourceUnitId);
    expect(isDocumentDirty(result.document)).toBe(false);
  });

  it("untitled_display_name_localizes_without_identity_change", () => {
    const document = createUntitledDocument("casl", createSequentialDocumentIdFactory("display"));
    const identity = [document.documentId, document.sourceUnitId, document.revision];
    expect(getDocumentDisplayName(document, () => "Untitled")).toBe("Untitled");
    expect(getDocumentDisplayName(document, () => "無題")).toBe("無題");
    expect(getDocumentDisplayName(document, () => "未命名")).toBe("未命名");
    expect([document.documentId, document.sourceUnitId, document.revision]).toEqual(identity);
  });

  it("example_switch_creates_immutable_clean_working_document", async () => {
    const example = getDemoProgram("cpp-addition")!;
    const originalSource = example.source;
    const result = await controller().requestReplacement({ intent: { kind: "select-example", exampleId: example.id }, currentDocument: clean(), currentExampleId: "" });
    expect(result).toMatchObject({ status: "replaced", selectedExampleId: example.id, document: { origin: "example", saveCapability: "save-as-only", content: originalSource } });
    if (result.status === "replaced") expect(isDocumentDirty(result.document)).toBe(false);
    expect(example.source).toBe(originalSource);
  });

  it("dirty_new_and_demo_require_guard", async () => {
    const dirty = editDocument(clean(), "dirty");
    await expect(controller().requestReplacement({ intent: { kind: "new-document", language: "cpp" }, currentDocument: dirty, currentExampleId: "" })).resolves.toMatchObject({ status: "requires-unsaved-decision" });
    await expect(controller().requestReplacement({ intent: { kind: "select-example", exampleId: "cpp-addition" }, currentDocument: dirty, currentExampleId: "" })).resolves.toMatchObject({ status: "requires-unsaved-decision" });
  });

  it("stale_intent_cannot_replace_document", async () => {
    await expect(controller().requestReplacement({ intent: { kind: "new-document", language: "cpp" }, currentDocument: clean(), currentExampleId: "", isCurrentDocument: () => false })).resolves.toEqual({ status: "stale-ignored" });
  });

  it("only_one_replacement_operation_is_active", async () => {
    let complete!: (value: FileOperationResult<OpenedTextFile>) => void;
    const adapter = new DeferredOpenAdapter(new Promise((resolve) => { complete = resolve; }));
    const subject = controller(adapter);
    const document = clean();
    const first = subject.requestReplacement({ intent: { kind: "open-file" }, currentDocument: document, currentExampleId: "" });
    await expect(subject.requestReplacement({ intent: { kind: "new-document", language: "casl" }, currentDocument: document, currentExampleId: "" })).resolves.toEqual({ status: "stale-ignored" });
    complete({ status: "cancelled" });
    await first;
  });
});

describe("Phase 15D atomic replacement", () => {
  it("new_open_example_share_atomic_replacement_helper_and_clear_source_state", () => {
    const initial = createInitialAppState();
    const loaded = appStoreReducer(initial, {
      type: "assembled", sourceUnitId: initial.currentDocument.sourceUnitId, sourceText: initial.sourceText,
      cometState: { ...initial.cometState, assembled: true, runState: "Ready", diagnostics: [createStructuredDiagnostic(1, "x", "assembler.missingEnd", {})], trace: [{ index: 1, address: 32, instruction: "LD", detail: "old" }], sourceMap: [{ line: 1, address: 32, machineWords: [0], source: "old" }] },
      assembleStatus: "success", generatedCaslSource: "OLD", cppToCaslMapping: [{ cppLine: 1, caslLines: [1], reason: "old", kind: "assignment" }]
    });
    const replacement = createUntitledDocument("cpp", createSequentialDocumentIdFactory("atomic"));
    const next = appStoreReducer(loaded, { type: "currentDocumentReplaced", document: replacement });
    expect(next).toMatchObject({ currentDocument: replacement, sourceText: "", sourceMode: "cpp", diagnostics: [], generatedCaslSource: "", cppToCaslMapping: [], assembleResult: null, selectedDemoProgramId: "" });
    expect(next.cometState).toMatchObject({ assembled: false, runState: "Idle", trace: [], sourceMap: [] });
    expect(next.observationMode).toBe(initial.observationMode);
    expect(next.lessonProgress).toBe(initial.lessonProgress);
  });

  it("stale_assemble_completion_is_rejected_by_source_unit", () => {
    const initial = createInitialAppState();
    const replacement = createUntitledDocument("casl", createSequentialDocumentIdFactory("stale"));
    const replaced = appStoreReducer(initial, { type: "currentDocumentReplaced", document: replacement });
    expect(appStoreReducer(replaced, { type: "assembled", sourceUnitId: initial.currentDocument.sourceUnitId, sourceText: initial.sourceText, cometState: initial.cometState, assembleStatus: "success" })).toBe(replaced);
  });
});

describe("Phase 15D beforeunload guard", () => {
  it("dirty_document_registers_once_and_clean_removes_guard", () => {
    const target = new FakeBeforeUnloadTarget();
    const manager = new BeforeUnloadGuardManager(target);
    manager.setDirty(true);
    manager.setDirty(true);
    expect(target.adds).toBe(1);
    manager.setDirty(false);
    expect(target.removes).toBe(1);
  });

  it("beforeunload_prevents_default_without_mutating_document_or_saving", () => {
    const target = new FakeBeforeUnloadTarget();
    const manager = new BeforeUnloadGuardManager(target);
    const document = editDocument(clean(), "dirty");
    manager.setDirty(true);
    const preventDefault = vi.fn();
    const event = { preventDefault, returnValue: false } as unknown as BeforeUnloadEvent;
    target.listener?.(event);
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(event.returnValue).toBe(true);
    expect(isDocumentDirty(document)).toBe(true);
  });

  it("dispose_removes_listener_and_missing_window_is_safe", () => {
    const target = new FakeBeforeUnloadTarget();
    const manager = new BeforeUnloadGuardManager(target);
    manager.setDirty(true);
    manager.dispose();
    expect(target.removes).toBe(1);
    expect(() => new BeforeUnloadGuardManager(null).setDirty(true)).not.toThrow();
  });
});

describe("Phase 15D session metadata contract", () => {
  it("accepts_only_non_source_lifecycle_metadata", () => {
    expect(validateSessionLifecycleMetadata({ version: 1, lastDocumentLanguage: "cpp", lastExampleId: "cpp-addition", observationMode: "cpu-flow", circuitFocusEnabled: true })).toEqual({ version: 1, lastDocumentLanguage: "cpp", lastExampleId: "cpp-addition", observationMode: "cpu-flow", circuitFocusEnabled: true });
  });

  it.each(["source", "content", "diagnostics", "vmState", "documentId", "sourceUnitId", "fileHandle", "saveTargetId", "path", "locale", "operationId"])("excludes_%s", (key) => {
    expect(validateSessionLifecycleMetadata({ version: 1, [key]: "unsafe" })).toBeNull();
  });

  it("unknown_version_is_ignored_and_no_storage_is_used", () => {
    expect(validateSessionLifecycleMetadata({ version: 2 })).toBeNull();
    expect(validateSessionLifecycleMetadata({ version: 1, futureUnknownField: true })).toBeNull();
    expect(localStorage.length).toBe(0);
  });
});

class FakeBeforeUnloadTarget implements BeforeUnloadWindow {
  adds = 0;
  removes = 0;
  listener: ((event: BeforeUnloadEvent) => void) | null = null;
  addEventListener(_type: "beforeunload", listener: (event: BeforeUnloadEvent) => void) { this.adds += 1; this.listener = listener; }
  removeEventListener() { this.removes += 1; this.listener = null; }
}

class DeferredOpenAdapter implements TextFileAdapter {
  constructor(private readonly result: Promise<FileOperationResult<OpenedTextFile>>) {}
  openTextFile() { return this.result; }
  saveTextFile(_request: SaveTextFileRequest): Promise<FileOperationResult<SavedTextFile>> { return Promise.resolve({ status: "cancelled" }); }
}

function controller(adapter: TextFileAdapter = new DeferredOpenAdapter(Promise.resolve({ status: "cancelled" }))) {
  return new DocumentSessionController(adapter, createSequentialDocumentIdFactory("replacement-controller"));
}

function clean(): SourceDocument {
  return createExternalDocument({ fileName: "current.cpp", extension: ".cpp", language: "cpp", text: "int main() {}", byteLength: 13, encoding: "utf-8", lineEnding: "lf" }, createSequentialDocumentIdFactory("current"));
}
