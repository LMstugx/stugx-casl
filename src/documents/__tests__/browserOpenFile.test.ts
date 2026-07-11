// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { appStoreReducer, createInitialAppState } from "../../store/useAppStore";
import { BrowserInputFileSelectionPort, BrowserTextFileAdapter, type BrowserFileSelection, type BrowserFileSelectionPort } from "../browserTextFileAdapter";
import { DocumentSessionController } from "../documentSessionController";
import { createExternalDocument, createUntitledDocument, editDocument, isDocumentDirty } from "../documentModel";
import { defaultFileOpenOptions, type FileOperationResult, type OpenedTextFile, type SaveTextFileRequest, type SavedTextFile, type TextFileAdapter } from "../fileAdapter";
import { createSequentialDocumentIdFactory } from "../idFactory";

class QueueSelectionPort implements BrowserFileSelectionPort {
  calls = 0;
  constructor(private readonly values: BrowserFileSelection[]) {}
  async selectSingleFile(): Promise<BrowserFileSelection> {
    return this.values[this.calls++] ?? { status: "cancelled" };
  }
}

class FakeAdapter implements TextFileAdapter {
  calls = 0;
  constructor(private readonly openResult: FileOperationResult<OpenedTextFile> | Promise<FileOperationResult<OpenedTextFile>>) {}
  async openTextFile() {
    this.calls += 1;
    return this.openResult;
  }
  async saveTextFile(_request: SaveTextFileRequest): Promise<FileOperationResult<SavedTextFile>> {
    return { status: "failure", kind: "unsupported" };
  }
}

describe("Phase 15B browser text file adapter", () => {
  it.each([
    ["browser_adapter_accepts_single_cas_file", "program.cas", "casl"],
    ["browser_adapter_accepts_single_cpp_file", "program.cpp", "cpp"]
  ])("%s", async (_name, fileName, language) => {
    const result = await adapterFor(fileName, bytes("A\r\nB")).openTextFile(defaultFileOpenOptions());
    expect(result).toMatchObject({ status: "success", value: { fileName, language, text: "A\nB", lineEnding: "crlf" } });
  });

  it("browser_adapter_rejects_invalid_extension", async () => {
    await expect(adapterFor("program.txt", bytes("A")).openTextFile(defaultFileOpenOptions())).resolves.toEqual({ status: "failure", kind: "invalid-extension" });
  });

  it("browser_adapter_rejects_oversized_bytes", async () => {
    const options = { acceptedExtensions: [".cas", ".cpp"] as const, maxBytes: 2 };
    await expect(adapterFor("program.cas", bytes("ABC")).openTextFile(options)).resolves.toEqual({ status: "failure", kind: "too-large" });
  });

  it("browser_adapter_rejects_invalid_utf8", async () => {
    const result = await adapterFor("program.cas", new Uint8Array([0xc3, 0x28])).openTextFile(defaultFileOpenOptions());
    expect(result).toMatchObject({ status: "failure", kind: "invalid-encoding" });
  });

  it("browser_adapter_removes_utf8_bom", async () => {
    const result = await adapterFor("program.cas", new Uint8Array([0xef, 0xbb, 0xbf, 0x41])).openTextFile(defaultFileOpenOptions());
    expect(success(result).text).toBe("A");
  });

  it("browser_adapter_rejects_binary_nul_content", async () => {
    await expect(adapterFor("program.cas", bytes("A\0B")).openTextFile(defaultFileOpenOptions())).resolves.toEqual({ status: "failure", kind: "binary" });
  });

  it("browser_adapter_cancel_returns_cancelled", async () => {
    const adapter = new BrowserTextFileAdapter(new QueueSelectionPort([{ status: "cancelled" }]));
    await expect(adapter.openTextFile(defaultFileOpenOptions())).resolves.toEqual({ status: "cancelled" });
  });

  it("browser_adapter_failure_returns_safe_failure", async () => {
    const adapter = new BrowserTextFileAdapter(new QueueSelectionPort([{ status: "failure", kind: "unsupported", rawContext: new Error("private") }]));
    await expect(adapter.openTextFile(defaultFileOpenOptions())).resolves.toMatchObject({ status: "failure", kind: "unsupported" });
  });

  it("browser_adapter_maps_array_buffer_failure_to_io", async () => {
    const selection: BrowserFileSelection = { status: "selected", file: { name: "program.cas", arrayBuffer: async () => { throw new Error("read failed"); } } };
    const result = await new BrowserTextFileAdapter(new QueueSelectionPort([selection])).openTextFile(defaultFileOpenOptions());
    expect(result).toMatchObject({ status: "failure", kind: "io" });
  });

  it("browser_adapter_reselects_same_file", async () => {
    const selection = selected("same.cas", bytes("A"));
    const port = new QueueSelectionPort([selection, selection]);
    const adapter = new BrowserTextFileAdapter(port);
    expect((await adapter.openTextFile(defaultFileOpenOptions())).status).toBe("success");
    expect((await adapter.openTextFile(defaultFileOpenOptions())).status).toBe("success");
    expect(port.calls).toBe(2);
  });

  it("browser_adapter_cleans_dom_input", async () => {
    const port = new BrowserInputFileSelectionPort();
    const pending = port.selectSingleFile(".cas,.cpp");
    const input = document.querySelector('input[type="file"]');
    expect(input).not.toBeNull();
    input?.dispatchEvent(new Event("cancel"));
    await expect(pending).resolves.toEqual({ status: "cancelled" });
    expect(document.querySelector('input[type="file"]')).toBeNull();
  });

  it("browser_adapter_cleans_dom_after_click_failure", async () => {
    const click = HTMLInputElement.prototype.click;
    HTMLInputElement.prototype.click = () => { throw new Error("picker blocked"); };
    try {
      const result = await new BrowserInputFileSelectionPort().selectSingleFile(".cas,.cpp");
      expect(result).toMatchObject({ status: "failure", kind: "unknown" });
      expect(document.querySelector('input[type="file"]')).toBeNull();
    } finally {
      HTMLInputElement.prototype.click = click;
    }
  });
});

describe("Phase 15B document session controller", () => {
  it("clean_document_open_starts_adapter", async () => {
    const adapter = new FakeAdapter(openedResult("next.cpp", "int main() {}"));
    const controller = new DocumentSessionController(adapter, createSequentialDocumentIdFactory("open-clean"));
    const result = await controller.requestOpen({ currentDocument: external("current.cas", "A") });
    expect(result.status).toBe("opened");
    expect(adapter.calls).toBe(1);
  });

  it("dirty_document_requires_guard", async () => {
    const adapter = new FakeAdapter(openedResult("next.cas", "B"));
    const controller = new DocumentSessionController(adapter, createSequentialDocumentIdFactory("open-guard"));
    const result = await controller.requestOpen({ currentDocument: editDocument(external("current.cas", "A"), "dirty") });
    expect(result.status).toBe("blocked-unsaved");
    expect(adapter.calls).toBe(0);
  });

  it("dirty_guard_discard_does_not_clear_before_open_success", async () => {
    let resolveOpen!: (value: FileOperationResult<OpenedTextFile>) => void;
    const pending = new Promise<FileOperationResult<OpenedTextFile>>((resolve) => { resolveOpen = resolve; });
    const document = editDocument(external("current.cas", "A"), "dirty");
    const controller = new DocumentSessionController(new FakeAdapter(pending), createSequentialDocumentIdFactory("open-pending"));
    const resultPromise = controller.requestOpen({ currentDocument: document, allowDiscard: true });
    expect(document.content).toBe("dirty");
    resolveOpen({ status: "cancelled" });
    await expect(resultPromise).resolves.toEqual({ status: "cancelled" });
    expect(document.content).toBe("dirty");
  });

  it.each([
    ["picker_cancel_after_discard_choice_preserves_current_document", { status: "cancelled" } as const, "cancelled"],
    ["open_failure_preserves_current_document", { status: "failure", kind: "io" } as const, "failed"]
  ])("%s", async (_name, adapterResult, expectedStatus) => {
    const document = editDocument(external("current.cas", "A"), "dirty");
    const controller = new DocumentSessionController(new FakeAdapter(adapterResult), createSequentialDocumentIdFactory("open-preserve"));
    expect((await controller.requestOpen({ currentDocument: document, allowDiscard: true })).status).toBe(expectedStatus);
    expect(document.content).toBe("dirty");
  });

  it("open_success_creates_new_document_and_source_unit_ids", async () => {
    const document = external("current.cas", "A");
    const controller = new DocumentSessionController(new FakeAdapter(openedResult("next.cpp", "B")), createSequentialDocumentIdFactory("open-new"));
    const result = await controller.requestOpen({ currentDocument: document });
    expect(result.status).toBe("opened");
    if (result.status !== "opened") return;
    expect(result.documentId).not.toBe(document.documentId);
    expect(result.sourceUnitId).not.toBe(document.sourceUnitId);
    expect(result.document).toMatchObject({ origin: "external-file", fileName: "next.cpp", content: "B", savedRevision: 0 });
    expect(isDocumentDirty(result.document)).toBe(false);
  });

  it("stale_open_completion_is_ignored", async () => {
    const document = external("current.cas", "A");
    const controller = new DocumentSessionController(new FakeAdapter(openedResult("next.cas", "B")), createSequentialDocumentIdFactory("open-stale"));
    await expect(controller.requestOpen({ currentDocument: document, isCurrentDocument: () => false })).resolves.toEqual({ status: "stale-ignored" });
  });

  it("concurrent_open_request_is_ignored", async () => {
    let resolveOpen!: (value: FileOperationResult<OpenedTextFile>) => void;
    const pending = new Promise<FileOperationResult<OpenedTextFile>>((resolve) => { resolveOpen = resolve; });
    const controller = new DocumentSessionController(new FakeAdapter(pending), createSequentialDocumentIdFactory("open-concurrent"));
    const document = external("current.cas", "A");
    const first = controller.requestOpen({ currentDocument: document });
    await expect(controller.requestOpen({ currentDocument: document })).resolves.toEqual({ status: "stale-ignored" });
    resolveOpen({ status: "cancelled" });
    await first;
  });
});

describe("Phase 15B atomic store replacement", () => {
  it("source_replacement_clears_all_store_owned_source_state", () => {
    const original = createInitialAppState();
    const loaded = appStoreReducer(original, {
      type: "assembled",
      sourceUnitId: original.currentDocument.sourceUnitId,
      sourceText: original.sourceText,
      cometState: { ...original.cometState, assembled: true, runState: "Ready", output: ["OLD"], sourceMap: [{ line: 1, address: 0x20, machineWords: [0], source: "OLD" }], trace: [{ index: 1, address: 0x20, instruction: "LD", detail: "OLD" }] },
      assembleStatus: "success",
      generatedCaslSource: "OLD CASL",
      cppToCaslMapping: [{ cppLine: 1, caslLines: [1], reason: "OLD", kind: "assignment" }]
    });
    const replacement = createExternalDocument(success(openedResult("external.cas", "MAIN START\n END")), createSequentialDocumentIdFactory("store-open"));
    const next = appStoreReducer(loaded, { type: "currentDocumentReplaced", document: replacement });
    expect(next).toMatchObject({ currentDocument: replacement, sourceText: replacement.content, sourceMode: "casl", selectedDemoProgramId: "", assembleResult: null, diagnostics: [], generatedCaslSource: "", cppToCaslMapping: [], assembleStatus: "default" });
    expect(next.cometState).toMatchObject({ runState: "Idle", assembled: false, output: [], trace: [], sourceMap: [] });
  });

  it("stale_assemble_completion_cannot_repopulate_replaced_document", () => {
    const original = createInitialAppState();
    const replacement = createExternalDocument(success(openedResult("external.cas", "MAIN START\n END")), createSequentialDocumentIdFactory("store-stale"));
    const replaced = appStoreReducer(original, { type: "currentDocumentReplaced", document: replacement });
    const stale = appStoreReducer(replaced, {
      type: "assembled",
      sourceUnitId: original.currentDocument.sourceUnitId,
      sourceText: original.sourceText,
      cometState: { ...original.cometState, assembled: true, runState: "Ready", output: ["OLD"] },
      assembleStatus: "success",
      generatedCaslSource: "OLD"
    });
    expect(stale).toBe(replaced);
  });
});

function adapterFor(fileName: string, contents: Uint8Array) {
  return new BrowserTextFileAdapter(new QueueSelectionPort([selected(fileName, contents)]));
}

function selected(fileName: string, contents: Uint8Array): BrowserFileSelection {
  return { status: "selected", file: { name: fileName, arrayBuffer: async () => contents.slice().buffer } };
}

function bytes(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function openedResult(fileName: string, text: string): FileOperationResult<OpenedTextFile> {
  const extension = fileName.toLowerCase().endsWith(".cpp") ? ".cpp" : ".cas";
  return { status: "success", value: { fileName, extension, language: extension === ".cpp" ? "cpp" : "casl", text, byteLength: bytes(text).byteLength, encoding: "utf-8", lineEnding: "lf" } };
}

function success(result: FileOperationResult<OpenedTextFile>): OpenedTextFile {
  if (result.status !== "success") throw new Error("expected success");
  return result.value;
}

function external(fileName: string, text: string) {
  return createExternalDocument(success(openedResult(fileName, text)), createSequentialDocumentIdFactory(`external-${fileName}`));
}
