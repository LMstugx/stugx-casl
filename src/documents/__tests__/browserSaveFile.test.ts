// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { appStoreReducer, createInitialAppState } from "../../store/useAppStore";
import { BrowserTextFileAdapter, type BrowserFileSelectionPort, type Utf8DecoderPort } from "../browserTextFileAdapter";
import { DomBrowserSavePlatform, type BrowserSavePlatform } from "../browserSaveStrategy";
import { DocumentSessionController } from "../documentSessionController";
import { createExternalDocument, createUntitledDocument, editDocument, isDocumentDirty } from "../documentModel";
import type { FileOperationResult, OpenedTextFile, SaveTextFileRequest, SavedTextFile, TextFileAdapter } from "../fileAdapter";
import { createSequentialDocumentIdFactory } from "../idFactory";
import { defaultFileNameForLanguage, ensureExpectedExtension, sanitizeSuggestedFileName } from "../saveFileName";
import type { FileSystemFileHandleLike, WritableFileStreamLike } from "../transientWriteBinding";
import type { DocumentId, DocumentWriteBinding, SaveTargetId, SourceDocument, SourceUnitId } from "../types";

const noOpen: BrowserFileSelectionPort = { selectSingleFile: async () => ({ status: "cancelled" }) };
const decoder: Utf8DecoderPort = { decode: (bytes) => new TextDecoder().decode(bytes) };

class RecordingHandle implements FileSystemFileHandleLike {
  writes: Uint8Array[] = [];
  events: string[] = [];
  failure: unknown = null;
  constructor(readonly name: string) {}
  async createWritable(): Promise<WritableFileStreamLike> {
    if (this.failure) throw this.failure;
    this.events.push("create");
    return {
      write: async (data) => { this.events.push("write"); this.writes.push(data.slice()); },
      close: async () => { this.events.push("close"); }
    };
  }
}

class FakeSavePlatform implements BrowserSavePlatform {
  downloads: Array<{ fileName: string; bytes: Uint8Array }> = [];
  pickerError: unknown = null;
  constructor(readonly supported: boolean, readonly handle = new RecordingHandle("saved.cpp")) {}
  supportsFileSystemAccess() { return this.supported; }
  async showSaveFilePicker() {
    if (this.pickerError) throw this.pickerError;
    return this.handle;
  }
  async requestDownload(fileName: string, bytes: Uint8Array) {
    this.downloads.push({ fileName, bytes: bytes.slice() });
  }
}

describe("Phase 15C browser save adapter", () => {
  it("save_as_uses_file_system_access_when_available_and_closes_before_success", async () => {
    const platform = new FakeSavePlatform(true);
    const result = await adapter(platform).saveTextFile(request());
    expect(result).toMatchObject({ status: "success", value: { strategy: "file-system-access", confirmedWrite: true, fileName: "saved.cpp", savedRevision: 3 } });
    expect(platform.handle.events).toEqual(["create", "write", "close"]);
  });

  it("confirmed_write_creates_transient_binding_and_plain_save_reuses_it", async () => {
    const platform = new FakeSavePlatform(true);
    const subject = adapter(platform);
    const first = await subject.saveTextFile(request());
    if (first.status !== "success" || !first.value.confirmedWrite) throw new Error("expected confirmed write");
    expect(subject.hasWriteBinding(first.value.writeBinding)).toBe(true);
    const second = await subject.saveTextFile({ ...request(), mode: "save", targetId: first.value.targetId, revision: 4 });
    expect(second).toMatchObject({ status: "success", value: { savedRevision: 4, targetId: first.value.targetId } });
    expect(platform.handle.events).toEqual(["create", "write", "close", "create", "write", "close"]);
  });

  it("save_as_falls_back_to_download_without_creating_binding", async () => {
    const platform = new FakeSavePlatform(false);
    const result = await adapter(platform).saveTextFile(request());
    expect(result).toMatchObject({ status: "success", value: { strategy: "download", confirmedWrite: false, downloadRequested: true } });
    expect(platform.downloads).toHaveLength(1);
  });

  it("download_creates_utf8_content_with_requested_line_endings_and_no_bom", async () => {
    const platform = new FakeSavePlatform(false);
    await adapter(platform).saveTextFile({ ...request(), text: "A\nB", lineEnding: "crlf" });
    const bytes = platform.downloads[0].bytes;
    expect(new TextDecoder().decode(bytes)).toBe("A\r\nB");
    expect(Array.from(bytes.slice(0, 3))).not.toEqual([0xef, 0xbb, 0xbf]);
  });

  it("file_system_cancel_returns_cancelled", async () => {
    const platform = new FakeSavePlatform(true);
    platform.pickerError = new DOMException("cancelled", "AbortError");
    await expect(adapter(platform).saveTextFile(request())).resolves.toEqual({ status: "cancelled" });
  });

  it("permission_failure_is_safe_and_preserves_raw_context", async () => {
    const platform = new FakeSavePlatform(true);
    platform.handle.failure = new DOMException("private path", "NotAllowedError");
    const result = await adapter(platform).saveTextFile(request());
    expect(result).toMatchObject({ status: "failure", kind: "permission" });
    expect(result).toHaveProperty("rawContext");
  });

  it("save_rejects_stale_target", async () => {
    const result = await adapter(new FakeSavePlatform(true)).saveTextFile({ ...request(), mode: "save", targetId: "missing" as SaveTargetId });
    expect(result).toEqual({ status: "failure", kind: "stale-target" });
  });

  it("output_byte_limit_is_enforced", async () => {
    const result = await adapter(new FakeSavePlatform(false)).saveTextFile({ ...request(), text: "x".repeat(1024 * 1024 + 1) });
    expect(result).toEqual({ status: "failure", kind: "too-large" });
  });

  it("adapter_result_never_contains_a_path_or_locale", async () => {
    const result = await adapter(new FakeSavePlatform(false)).saveTextFile({ ...request(), fileName: "C:\\private\\main.cpp" });
    expect(JSON.stringify(result)).not.toContain("private");
    expect(JSON.stringify(result)).not.toContain("locale");
  });

  it("download_revokes_object_url_and_cleans_dom_anchor", async () => {
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    const originalClick = HTMLAnchorElement.prototype.click;
    const revoke = vi.fn();
    const downloads: string[] = [];
    URL.createObjectURL = vi.fn(() => "blob:save-test");
    URL.revokeObjectURL = revoke;
    HTMLAnchorElement.prototype.click = function click() { downloads.push(this.download); };
    try {
      await new DomBrowserSavePlatform().requestDownload("main.cpp", new TextEncoder().encode("A"));
      expect(downloads).toEqual(["main.cpp"]);
      expect(revoke).toHaveBeenCalledWith("blob:save-test");
      expect(document.querySelector('a[download="main.cpp"]')).toBeNull();
    } finally {
      URL.createObjectURL = originalCreate;
      URL.revokeObjectURL = originalRevoke;
      HTMLAnchorElement.prototype.click = originalClick;
    }
  });
});

describe("Phase 15C filename policy", () => {
  it("uses_stable_nonlocalized_defaults", () => {
    expect(defaultFileNameForLanguage("casl")).toBe("main.cas");
    expect(defaultFileNameForLanguage("cpp")).toBe("main.cpp");
  });

  it("appends_missing_extension_and_rejects_mismatch", () => {
    expect(ensureExpectedExtension("lesson", "casl")).toBe("lesson.cas");
    expect(ensureExpectedExtension("lesson.cpp", "casl")).toBeNull();
  });

  it("removes_path_segments_controls_and_windows_trailing_characters", () => {
    expect(sanitizeSuggestedFileName("C:\\private\\bad\0name. ", "cpp")).toBe("badname.cpp");
  });

  it("empty_or_reserved_filename_uses_default", () => {
    expect(sanitizeSuggestedFileName("CON", "casl")).toBe("main.cas");
    expect(sanitizeSuggestedFileName("", "cpp")).toBe("main.cpp");
  });
});

describe("Phase 15C save controller revision contract", () => {
  it("save_as_success_preserves_document_and_source_unit_ids", async () => {
    const current = editDocument(createUntitledDocument("cpp", createSequentialDocumentIdFactory("save-ids")), "int main() {}\n");
    const controller = new DocumentSessionController(new ImmediateSaveAdapter("file-system-access"), createSequentialDocumentIdFactory("controller"));
    const result = await controller.requestSaveAs({ currentDocument: current, writeBinding: null });
    expect(result).toMatchObject({ status: "saved", stillDirty: false });
    if (result.status !== "saved") return;
    expect(result.document.documentId).toBe(current.documentId);
    expect(result.document.sourceUnitId).toBe(current.sourceUnitId);
    expect(result.document.content).toBe(current.content);
    expect(result.document.saveCapability).toBe("save");
  });

  it("download_save_as_remains_save_as_only", async () => {
    const current = editDocument(createUntitledDocument("cpp", createSequentialDocumentIdFactory("download")), "A");
    const result = await new DocumentSessionController(new ImmediateSaveAdapter("download"), createSequentialDocumentIdFactory("download-controller"))
      .requestSaveAs({ currentDocument: current, writeBinding: null });
    expect(result).toMatchObject({ status: "saved", strategy: "download", document: { saveCapability: "save-as-only" }, writeBinding: null });
  });

  it("save_success_marks_only_the_captured_revision_saved", async () => {
    const ids = createSequentialDocumentIdFactory("race");
    const original = editDocument({ ...createUntitledDocument("cpp", ids), saveCapability: "save" }, "A");
    let latest = original;
    let complete!: (value: FileOperationResult<SavedTextFile>) => void;
    const deferred = new Promise<FileOperationResult<SavedTextFile>>((resolve) => { complete = resolve; });
    const adapter = new DeferredSaveAdapter(deferred);
    const controller = new DocumentSessionController(adapter, createSequentialDocumentIdFactory("race-controller"));
    const pending = controller.requestSave({ currentDocument: original, writeBinding: binding(original), getCurrentDocument: () => latest });
    latest = editDocument(original, "AB");
    complete(successSaved(adapter.request!, "file-system-access"));
    const result = await pending;
    expect(result).toMatchObject({ status: "saved", savedRevision: original.revision, stillDirty: true });
    if (result.status === "saved") expect(result.document.revision).toBe(latest.revision);
  });

  it("replacement_during_save_ignores_completion", async () => {
    const ids = createSequentialDocumentIdFactory("stale-save");
    const original = editDocument({ ...createUntitledDocument("cpp", ids), saveCapability: "save" }, "A");
    let latest: SourceDocument = original;
    let complete!: (value: FileOperationResult<SavedTextFile>) => void;
    const deferred = new Promise<FileOperationResult<SavedTextFile>>((resolve) => { complete = resolve; });
    const adapter = new DeferredSaveAdapter(deferred);
    const pending = new DocumentSessionController(adapter, createSequentialDocumentIdFactory("stale-controller"))
      .requestSave({ currentDocument: original, writeBinding: binding(original), getCurrentDocument: () => latest });
    latest = createExternalDocument(opened("replacement.cpp", "B"), ids);
    complete(successSaved(adapter.request!, "file-system-access"));
    await expect(pending).resolves.toEqual({ status: "stale-ignored" });
    expect(adapter.released).toEqual([original.documentId]);
  });

  it("failure_and_cancel_do_not_mark_document_clean", async () => {
    const current = editDocument(createUntitledDocument("cpp", createSequentialDocumentIdFactory("preserve")), "A");
    for (const result of [{ status: "cancelled" } as const, { status: "failure", kind: "io" } as const]) {
      const controller = new DocumentSessionController(new FixedSaveAdapter(result), createSequentialDocumentIdFactory("preserve-controller"));
      const outcome = await controller.requestSaveAs({ currentDocument: current, writeBinding: null });
      expect(outcome.status).not.toBe("saved");
      expect(isDocumentDirty(current)).toBe(true);
    }
  });

  it("only_one_file_operation_is_active", async () => {
    let complete!: (value: FileOperationResult<SavedTextFile>) => void;
    const deferred = new Promise<FileOperationResult<SavedTextFile>>((resolve) => { complete = resolve; });
    const adapter = new DeferredSaveAdapter(deferred);
    const current = editDocument(createUntitledDocument("cpp", createSequentialDocumentIdFactory("one-op")), "A");
    const controller = new DocumentSessionController(adapter, createSequentialDocumentIdFactory("one-controller"));
    const first = controller.requestSaveAs({ currentDocument: current, writeBinding: null });
    await expect(controller.requestSaveAs({ currentDocument: current, writeBinding: null })).resolves.toEqual({ status: "stale-ignored" });
    complete(successSaved(adapter.request!, "download"));
    await first;
  });

  it("save_store_commit_preserves_runtime_diagnostics_and_generated_state", () => {
    const state = createInitialAppState();
    const savedDocument = {
      ...state.currentDocument,
      fileName: "saved.cpp",
      displayName: "saved.cpp",
      origin: "external-file" as const,
      saveCapability: "save-as-only" as const,
      savedRevision: state.currentDocument.revision
    };
    const next = appStoreReducer(state, { type: "currentDocumentSaved", document: savedDocument, writeBinding: null });
    expect(next.currentDocument).toBe(savedDocument);
    expect(next.cometState).toBe(state.cometState);
    expect(next.diagnostics).toBe(state.diagnostics);
    expect(next.generatedCaslSource).toBe(state.generatedCaslSource);
    expect(next.cppToCaslMapping).toBe(state.cppToCaslMapping);
    expect(next.sourceText).toBe(state.sourceText);
  });
});

function adapter(platform: BrowserSavePlatform) {
  return new BrowserTextFileAdapter(noOpen, decoder, platform);
}

function request(): SaveTextFileRequest {
  return {
    documentId: "document-1" as DocumentId,
    sourceUnitId: "source-1" as SourceUnitId,
    revision: 3,
    fileName: "main.cpp",
    extension: ".cpp",
    language: "cpp",
    text: "int main() {}\n",
    encoding: "utf-8",
    lineEnding: "lf",
    mode: "save-as"
  };
}

function binding(document: SourceDocument): DocumentWriteBinding {
  return { documentId: document.documentId, targetId: "target-1" as SaveTargetId, strategy: "file-system-access", fileName: "main.cpp" };
}

function opened(fileName: string, text: string): OpenedTextFile {
  return { fileName, extension: ".cpp", language: "cpp", text, byteLength: new TextEncoder().encode(text).byteLength, encoding: "utf-8", lineEnding: "lf" };
}

function successSaved(request: SaveTextFileRequest, strategy: "file-system-access" | "download"): FileOperationResult<SavedTextFile> {
  if (strategy === "download") return { status: "success", value: { strategy, fileName: request.fileName, extension: request.extension, byteLength: request.text.length, encoding: "utf-8", lineEnding: request.lineEnding, savedRevision: request.revision, confirmedWrite: false, downloadRequested: true } };
  const writeBinding = binding({ documentId: request.documentId } as SourceDocument);
  return { status: "success", value: { strategy, fileName: request.fileName, extension: request.extension, byteLength: request.text.length, encoding: "utf-8", lineEnding: request.lineEnding, savedRevision: request.revision, targetId: writeBinding.targetId, confirmedWrite: true, writeBinding } };
}

class DeferredSaveAdapter implements TextFileAdapter {
  request: SaveTextFileRequest | null = null;
  released: DocumentId[] = [];
  constructor(private readonly result: Promise<FileOperationResult<SavedTextFile>>) {}
  openTextFile(): Promise<FileOperationResult<OpenedTextFile>> { return Promise.resolve({ status: "cancelled" }); }
  saveTextFile(request: SaveTextFileRequest) { this.request = request; return this.result; }
  hasWriteBinding() { return true; }
  releaseDocumentBinding(documentId: DocumentId) { this.released.push(documentId); }
}

class FixedSaveAdapter implements TextFileAdapter {
  constructor(private readonly result: FileOperationResult<SavedTextFile>) {}
  openTextFile(): Promise<FileOperationResult<OpenedTextFile>> { return Promise.resolve({ status: "cancelled" }); }
  saveTextFile() { return Promise.resolve(this.result); }
}

class ImmediateSaveAdapter implements TextFileAdapter {
  constructor(private readonly strategy: "file-system-access" | "download") {}
  openTextFile(): Promise<FileOperationResult<OpenedTextFile>> { return Promise.resolve({ status: "cancelled" }); }
  saveTextFile(request: SaveTextFileRequest) { return Promise.resolve(successSaved(request, this.strategy)); }
  hasWriteBinding() { return true; }
}
