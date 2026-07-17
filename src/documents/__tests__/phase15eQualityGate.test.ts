// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { BrowserInputFileSelectionPort, BrowserTextFileAdapter, type BrowserFileSelectionPort } from "../browserTextFileAdapter";
import { DomBrowserSavePlatform, type BrowserSavePlatform } from "../browserSaveStrategy";
import { BeforeUnloadGuardManager, type BeforeUnloadWindow } from "../beforeUnloadGuard";
import { createUntitledDocument, editDocument } from "../documentModel";
import { DocumentSessionController } from "../documentSessionController";
import {
  DEFAULT_MAX_TEXT_FILE_BYTES,
  FILE_OPERATION_FAILURE_KINDS,
  FILE_OPERATION_RESULT_STATUSES,
  SUPPORTED_TEXT_EXTENSIONS,
  type FileOperationResult,
  type OpenedTextFile,
  type SaveTextFileRequest,
  type SavedTextFile,
  type TextFileAdapter
} from "../fileAdapter";
import {
  APPLICATION_PREFERENCE_CATEGORIES,
  BEFORE_UNLOAD_POLICY,
  FILE_ENCODING_POLICY,
  FILE_LIFECYCLE_BASELINE_VERSION,
  PROHIBITED_PERSISTENCE_FIELDS
} from "../fileLifecycleContract";
import { createSequentialDocumentIdFactory } from "../idFactory";
import { FILE_LIFECYCLE_STATUSES } from "../lifecycle";
import { SOURCE_REPLACEMENT_INTENT_KINDS } from "../replacementIntent";
import { sanitizeSuggestedFileName } from "../saveFileName";
import { SESSION_METADATA_ALLOWED_KEYS, SESSION_METADATA_PROHIBITED_KEYS, validateSessionLifecycleMetadata } from "../sessionLifecycleMetadata";
import { SOURCE_OWNED_STATE_CATEGORIES } from "../sourceOwnership";
import { TransientWriteBindingRegistry, type FileSystemFileHandleLike, type WritableFileStreamLike } from "../transientWriteBinding";
import {
  DOCUMENT_EXTENSIONS,
  DOCUMENT_LANGUAGES,
  DOCUMENT_ORIGINS,
  DOCUMENT_SAVE_CAPABILITIES,
  SAVE_STRATEGIES,
  type DocumentId,
  type SourceDocument
} from "../types";
import { UNSAVED_DECISIONS } from "../unsavedGuard";
import { safeDisplayFileName, validateTextFileCandidate } from "../validation";

const baselineRaw = readFileSync("docs/file-lifecycle-baseline-v1.json", "utf8");
const baseline = JSON.parse(baselineRaw) as Record<string, unknown>;
const matrixRaw = readFileSync("docs/file-lifecycle-operation-matrix-v1.json", "utf8");
const matrix = JSON.parse(matrixRaw) as {
  matrixVersion: number;
  coverage: { stateCount: number; operationCount: number; totalCombinations: number };
  states: Array<Record<string, unknown>>;
  operations: Array<Record<string, unknown>>;
};
const phase15e = readFileSync("docs/phase15e-file-lifecycle-final-quality-gate.md", "utf8");
const documentationIndex = readFileSync("docs/README.md", "utf8");
const historicalPathsFromIndex = documentationIndex.replace(
  /\]\((?!https?:)([^)#]+)(?:#[^)]*)?\)/g,
  (_match, target: string) => `](docs/${target})`
);
const readme = `${readFileSync("README.md", "utf8")}\n${documentationIndex}\n${historicalPathsFromIndex}`;
const diagnosticBaseline = JSON.parse(readFileSync("docs/diagnostic-localization-baseline-v1.json", "utf8")) as { structuredDiagnostics: unknown[] };

describe("Phase 15E baseline freeze", () => {
  it("file_lifecycle_baseline_manifest_exists_and_is_deterministic", () => {
    expect(baselineRaw).toBe(`${JSON.stringify(baseline, null, 2)}\n`);
    expect(Object.keys(baseline)).toEqual([
      "baselineVersion", "purpose", "runtimeSourceOfTruth", "supportedDocumentLanguages", "supportedExtensions",
      "maxFileBytes", "encodingPolicy", "lineEndingPolicy", "documentOrigins", "saveCapabilities",
      "lifecycleStatuses", "replacementIntentKinds", "fileOperationResultStatuses", "fileFailureKinds",
      "saveStrategies", "dirtyGuardDecisions", "identityRules", "sourceOwnedStateCategories",
      "applicationPreferenceCategories", "sessionMetadataAllowedKeys", "prohibitedPersistenceFields", "beforeUnloadPolicy", "saveSemantics",
      "backendCapabilities", "operationMatrix", "phase14DiagnosticBaseline", "legacyCompatibility"
    ]);
  });

  it("baseline_manifest_matches_runtime_contracts", () => {
    expect(baseline.baselineVersion).toBe(FILE_LIFECYCLE_BASELINE_VERSION);
    expect(baseline.supportedDocumentLanguages).toEqual(DOCUMENT_LANGUAGES);
    expect(baseline.supportedExtensions).toEqual(DOCUMENT_EXTENSIONS);
    expect(baseline.supportedExtensions).toEqual(SUPPORTED_TEXT_EXTENSIONS);
    expect(baseline.maxFileBytes).toBe(DEFAULT_MAX_TEXT_FILE_BYTES);
    expect(baseline.encodingPolicy).toEqual(FILE_ENCODING_POLICY);
    expect(baseline.documentOrigins).toEqual(DOCUMENT_ORIGINS);
    expect(baseline.saveCapabilities).toEqual(DOCUMENT_SAVE_CAPABILITIES);
    expect(baseline.lifecycleStatuses).toEqual(FILE_LIFECYCLE_STATUSES);
    expect(baseline.replacementIntentKinds).toEqual(SOURCE_REPLACEMENT_INTENT_KINDS);
    expect(baseline.fileOperationResultStatuses).toEqual(FILE_OPERATION_RESULT_STATUSES);
    expect(baseline.fileFailureKinds).toEqual(FILE_OPERATION_FAILURE_KINDS);
    expect(baseline.saveStrategies).toEqual(SAVE_STRATEGIES);
    expect(baseline.dirtyGuardDecisions).toEqual(UNSAVED_DECISIONS);
    expect(baseline.sourceOwnedStateCategories).toEqual(SOURCE_OWNED_STATE_CATEGORIES);
    expect(baseline.applicationPreferenceCategories).toEqual(APPLICATION_PREFERENCE_CATEGORIES);
    expect(baseline.sessionMetadataAllowedKeys).toEqual(SESSION_METADATA_ALLOWED_KEYS);
    expect(baseline.prohibitedPersistenceFields).toEqual(PROHIBITED_PERSISTENCE_FIELDS);
    expect(baseline.beforeUnloadPolicy).toEqual(BEFORE_UNLOAD_POLICY);
  });

  it("baseline_manifest_is_not_runtime_source", () => {
    for (const path of [
      "src/documents/documentModel.ts",
      "src/documents/documentSessionController.ts",
      "src/documents/browserTextFileAdapter.ts",
      "src/documents/lifecycle.ts"
    ]) expect(readFileSync(path, "utf8")).not.toContain("file-lifecycle-baseline-v1.json");
  });

  it("baseline_prohibited_persistence_covers_session_contract", () => {
    const prohibited = new Set(baseline.prohibitedPersistenceFields as string[]);
    for (const field of ["sourceContent", "absolutePath", "fileSystemFileHandle", "saveTargetId", "documentId", "sourceUnitId", "diagnostics", "generatedCasl", "machineCode", "vmState", "trace", "pendingOperation", "rawContext", "locale"]) {
      expect(prohibited.has(field), field).toBe(true);
    }
    expect(SESSION_METADATA_ALLOWED_KEYS).toEqual(["version", "lastDocumentLanguage", "lastExampleId", "observationMode", "circuitFocusEnabled"]);
    expect(SESSION_METADATA_PROHIBITED_KEYS).not.toContain("lastExampleId");
  });

  it("final_gate_documents_pass_and_phase14_baseline_reference", () => {
    expect(phase15e).toContain("covering 112 state/operation combinations");
    expect(phase15e).toContain("One blocker was found and fixed");
    expect(phase15e).toContain("**PASS.**");
    expect(readme).toContain("docs/file-lifecycle-baseline-v1.json");
    expect(readme).toContain("docs/phase15e-file-lifecycle-final-quality-gate.md");
    expect(diagnosticBaseline.structuredDiagnostics).toHaveLength(55);
    expect(baseline.phase14DiagnosticBaseline).toBe("diagnostic-localization-baseline-v1.json");
    expect(baseline.operationMatrix).toBe("file-lifecycle-operation-matrix-v1.json");
  });
});

describe("Phase 15E operation matrix", () => {
  it("operation_matrix_has_no_unclassified_state", () => {
    expect(matrix.matrixVersion).toBe(1);
    expect(matrix.coverage).toEqual({ stateCount: 8, operationCount: 14, totalCombinations: 112 });
    expect(matrix.coverage.totalCombinations).toBe(matrix.states.length * matrix.operations.length);
    expect(matrix.states.map((state) => state.id)).toEqual(["A", "B", "C", "D", "E", "F", "G", "H"]);
    expect(matrix.states.map((state) => [state.origin, state.dirty, state.writeBinding])).toEqual([
      ["untitled", false, false], ["untitled", true, false],
      ["example", false, false], ["example", true, false],
      ["external-file", false, false], ["external-file", true, false],
      ["external-file", false, true], ["external-file", true, true]
    ]);
  });

  it("operation_matrix_classifies_every_major_operation", () => {
    expect(matrix.operations.map((operation) => operation.kind)).toEqual([
      "new-casl", "new-cpp", "open", "switch-example", "save", "save-as", "locale-switch",
      "observation-mode-switch", "beforeunload", "source-edit", "assemble", "run-step", "cancellation", "file-failure"
    ]);
    const required = ["appliesTo", "guard", "saveResolution", "discard", "cancel", "successDocumentIdentity", "successSourceUnitId", "dirtyResult", "writeBindingResult", "sourceOwnedState", "locale"];
    for (const operation of matrix.operations) {
      expect(operation.appliesTo).toBe("A-H");
      for (const field of required) expect(operation[field], `${String(operation.kind)}.${field}`).toBeDefined();
    }
  });
});

describe("Phase 15E cross-operation races", () => {
  it("open_blocks_save_new_and_second_open_until_completion", async () => {
    const adapter = new DeferredLifecycleAdapter();
    const controller = new DocumentSessionController(adapter, createSequentialDocumentIdFactory("open-race"));
    const current = cleanDocument("open-race-document");
    const open = controller.requestReplacement({ intent: { kind: "open-file" }, currentDocument: current, currentExampleId: "" });

    await expect(controller.requestSaveAs({ currentDocument: current, writeBinding: null })).resolves.toEqual({ status: "stale-ignored" });
    await expect(controller.requestReplacement({ intent: { kind: "new-document", language: "cpp" }, currentDocument: current, currentExampleId: "" })).resolves.toEqual({ status: "stale-ignored" });
    await expect(controller.requestReplacement({ intent: { kind: "open-file" }, currentDocument: current, currentExampleId: "" })).resolves.toEqual({ status: "stale-ignored" });
    expect(adapter.saveCalls).toBe(0);
    adapter.finishOpen({ status: "cancelled" });
    await expect(open).resolves.toEqual({ status: "cancelled" });
  });

  it("save_blocks_open_new_and_demo_until_completion", async () => {
    const adapter = new DeferredLifecycleAdapter();
    const controller = new DocumentSessionController(adapter, createSequentialDocumentIdFactory("save-race"));
    const current = editDocument(createUntitledDocument("cpp", createSequentialDocumentIdFactory("save-race-document")), "int main() {}\n");
    const save = controller.requestSaveAs({ currentDocument: current, writeBinding: null });

    for (const intent of [{ kind: "open-file" }, { kind: "new-document", language: "casl" }, { kind: "select-example", exampleId: "cpp-addition" }] as const) {
      await expect(controller.requestReplacement({ intent, currentDocument: current, currentExampleId: "" })).resolves.toEqual({ status: "stale-ignored" });
    }
    expect(adapter.openCalls).toBe(0);
    adapter.finishSave(savedDownload(adapter.saveRequest!));
    await expect(save).resolves.toMatchObject({ status: "saved", strategy: "download" });
  });

  it("controller_invalidation_makes_late_completion_stale", async () => {
    const adapter = new DeferredLifecycleAdapter();
    const controller = new DocumentSessionController(adapter, createSequentialDocumentIdFactory("unmount-race"));
    const current = cleanDocument("unmount-document");
    const pending = controller.requestReplacement({ intent: { kind: "open-file" }, currentDocument: current, currentExampleId: "" });
    controller.invalidateActiveOperation();
    adapter.finishOpen({ status: "success", value: opened("late.cpp", "int main() {}") });
    await expect(pending).resolves.toEqual({ status: "stale-ignored" });
  });
});

describe("Phase 15E adapter cleanup and security", () => {
  it("cancelled_input_removes_listener_and_ignores_stale_change", async () => {
    const port = new BrowserInputFileSelectionPort();
    const pending = port.selectSingleFile(".cas,.cpp");
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    input.dispatchEvent(new Event("cancel"));
    await expect(pending).resolves.toEqual({ status: "cancelled" });
    input.dispatchEvent(new Event("change"));
    expect(document.querySelector('input[type="file"]')).toBeNull();
  });

  it.each(["write", "close"] as const)("filesystem_%s_failure_is_not_confirmed", async (failureAt) => {
    const handle = new FailingHandle("main.cpp", failureAt);
    const adapter = new BrowserTextFileAdapter(noOpen, undefined, new FixedSavePlatform(handle));
    const result = await adapter.saveTextFile(saveRequest());
    expect(result).toMatchObject({ status: "failure", kind: "io" });
    expect(JSON.stringify(result)).not.toContain("confirmedWrite");
  });

  it("download_click_failure_still_cleans_anchor_and_url", async () => {
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    const originalClick = HTMLAnchorElement.prototype.click;
    const revoke = vi.fn();
    URL.createObjectURL = () => "blob:phase15e";
    URL.revokeObjectURL = revoke;
    HTMLAnchorElement.prototype.click = () => { throw new Error("blocked"); };
    try {
      await expect(new DomBrowserSavePlatform().requestDownload("main.cpp", new Uint8Array([65]))).rejects.toThrow("blocked");
      expect(revoke).toHaveBeenCalledWith("blob:phase15e");
      expect(document.querySelector("a[download]")).toBeNull();
    } finally {
      URL.createObjectURL = originalCreate;
      URL.revokeObjectURL = originalRevoke;
      HTMLAnchorElement.prototype.click = originalClick;
    }
  });

  it("binding_registry_is_document_scoped_and_clear_is_leak_free", () => {
    const registry = new TransientWriteBindingRegistry();
    const first = "document:first" as DocumentId;
    const second = "document:second" as DocumentId;
    const handle = new FailingHandle("main.cpp", null);
    const binding = registry.register(first, "main.cpp", handle);
    expect(registry.resolve(second, binding.targetId)).toBeNull();
    expect(registry.resolve(first, binding.targetId)).toBe(handle);
    registry.clear();
    expect(registry.size).toBe(0);
  });

  it("malicious_and_international_filenames_remain_safe_basenames", () => {
    expect(sanitizeSuggestedFileName("<script>alert(1)</script>.cpp", "cpp")).toBe("script.cpp");
    expect(sanitizeSuggestedFileName("../../main.cpp", "cpp")).toBe("main.cpp");
    expect(sanitizeSuggestedFileName("C:\\secret\\main.cpp", "cpp")).toBe("main.cpp");
    expect(sanitizeSuggestedFileName("CON", "cpp")).toBe("main.cpp");
    expect(sanitizeSuggestedFileName("  .  ", "casl")).toBe("main.cas");
    expect(sanitizeSuggestedFileName("学習😀.cpp", "cpp")).toBe("学習😀.cpp");
    const displayed = safeDisplayFileName("C:\\secret\\<b>教材</b>.cpp");
    expect(displayed).toBe("b>.cpp");
    expect(displayed).not.toMatch(/[\\/]/);
  });

  it("byte_limit_is_exact_and_source_remains_plain_text", () => {
    const exact = "x".repeat(DEFAULT_MAX_TEXT_FILE_BYTES);
    expect(validateTextFileCandidate({ fileName: "main.cpp", text: exact }).status).toBe("success");
    expect(validateTextFileCandidate({ fileName: "main.cpp", text: `${exact}x` })).toEqual({ status: "failure", kind: "too-large" });
    const source = '<script>alert("no execution")</script> // 日本語 中文';
    const result = validateTextFileCandidate({ fileName: "教材.cpp", text: source });
    expect(result).toMatchObject({ status: "success", value: { text: source, fileName: "教材.cpp" } });
    expect(localStorage.length).toBe(0);
  });

  it("session_metadata_rejects_invalid_enums_without_storage", () => {
    expect(validateSessionLifecycleMetadata({ version: 1, lastDocumentLanguage: "python" })).toBeNull();
    expect(validateSessionLifecycleMetadata({ version: 1, observationMode: "unknown" })).toBeNull();
    expect(localStorage.length).toBe(0);
  });

  it("beforeunload_is_dirty_only_and_remount_cleanup_is_balanced", () => {
    const target = new CountingBeforeUnloadTarget();
    const first = new BeforeUnloadGuardManager(target);
    first.setDirty(false);
    first.setDirty(true);
    first.dispose();
    const second = new BeforeUnloadGuardManager(target);
    second.setDirty(true);
    second.dispose();
    expect({ adds: target.adds, removes: target.removes }).toEqual({ adds: 2, removes: 2 });
  });
});

const noOpen: BrowserFileSelectionPort = { selectSingleFile: async () => ({ status: "cancelled" }) };

class DeferredLifecycleAdapter implements TextFileAdapter {
  openCalls = 0;
  saveCalls = 0;
  saveRequest: SaveTextFileRequest | null = null;
  private resolveOpen!: (value: FileOperationResult<OpenedTextFile>) => void;
  private resolveSave!: (value: FileOperationResult<SavedTextFile>) => void;
  private readonly openResult = new Promise<FileOperationResult<OpenedTextFile>>((resolve) => { this.resolveOpen = resolve; });
  private readonly saveResult = new Promise<FileOperationResult<SavedTextFile>>((resolve) => { this.resolveSave = resolve; });
  openTextFile() { this.openCalls += 1; return this.openResult; }
  saveTextFile(request: SaveTextFileRequest) { this.saveCalls += 1; this.saveRequest = request; return this.saveResult; }
  finishOpen(value: FileOperationResult<OpenedTextFile>) { this.resolveOpen(value); }
  finishSave(value: FileOperationResult<SavedTextFile>) { this.resolveSave(value); }
}

class FailingHandle implements FileSystemFileHandleLike {
  constructor(readonly name: string, private readonly failureAt: "write" | "close" | null) {}
  async createWritable(): Promise<WritableFileStreamLike> {
    return {
      write: async () => { if (this.failureAt === "write") throw new Error("write failed"); },
      close: async () => { if (this.failureAt === "close") throw new Error("close failed"); }
    };
  }
}

class FixedSavePlatform implements BrowserSavePlatform {
  constructor(private readonly handle: FileSystemFileHandleLike) {}
  supportsFileSystemAccess() { return true; }
  showSaveFilePicker() { return Promise.resolve(this.handle); }
  requestDownload() { return Promise.resolve(); }
}

class CountingBeforeUnloadTarget implements BeforeUnloadWindow {
  adds = 0;
  removes = 0;
  addEventListener() { this.adds += 1; }
  removeEventListener() { this.removes += 1; }
}

function cleanDocument(prefix: string): SourceDocument {
  return createUntitledDocument("cpp", createSequentialDocumentIdFactory(prefix));
}

function opened(fileName: string, text: string): OpenedTextFile {
  return { fileName, extension: ".cpp", language: "cpp", text, byteLength: new TextEncoder().encode(text).byteLength, encoding: "utf-8", lineEnding: "lf" };
}

function saveRequest(): SaveTextFileRequest {
  return {
    documentId: "document:save" as DocumentId,
    sourceUnitId: "source:save" as import("../types").SourceUnitId,
    revision: 1,
    mode: "save-as",
    fileName: "main.cpp",
    extension: ".cpp",
    language: "cpp",
    text: "int main() {}\n",
    encoding: "utf-8",
    lineEnding: "lf"
  };
}

function savedDownload(request: SaveTextFileRequest): FileOperationResult<SavedTextFile> {
  return {
    status: "success",
    value: {
      strategy: "download",
      fileName: request.fileName,
      extension: request.extension,
      byteLength: new TextEncoder().encode(request.text).byteLength,
      encoding: "utf-8",
      lineEnding: request.lineEnding,
      savedRevision: request.revision,
      confirmedWrite: false,
      downloadRequested: true
    }
  };
}
