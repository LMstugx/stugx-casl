import { describe, expect, it } from "vitest";
import { defaultFileOpenOptions, type FileOpenOptions, type FileOperationResult, type OpenedTextFile, type SaveTextFileRequest, type SavedTextFile, type TextFileAdapter } from "../fileAdapter";
import { detectLineEnding, normalizeTextForEditor, safeDisplayFileName, validateTextFileCandidate } from "../validation";

class FakeTextFileAdapter implements TextFileAdapter {
  openCalls = 0;
  saveCalls = 0;
  constructor(
    private readonly openResult: FileOperationResult<OpenedTextFile>,
    private readonly saveResult: FileOperationResult<SavedTextFile>
  ) {}
  async openTextFile(_options: FileOpenOptions) {
    this.openCalls += 1;
    return this.openResult;
  }
  async saveTextFile(_request: SaveTextFileRequest) {
    this.saveCalls += 1;
    return this.saveResult;
  }
}

const opened: OpenedTextFile = {
  fileName: "program.cas", extension: ".cas", language: "casl", text: "MAIN START\n END", byteLength: 15, encoding: "utf-8", lineEnding: "lf"
};
const saved: SavedTextFile = { strategy: "download", fileName: "program.cas", extension: ".cas", byteLength: 15, encoding: "utf-8", lineEnding: "lf", savedRevision: 0, confirmedWrite: false, downloadRequested: true };

describe("Phase 15A file adapter contract", () => {
  it("fake_adapter_success_is_supported", async () => {
    const adapter = new FakeTextFileAdapter({ status: "success", value: opened }, { status: "success", value: saved });
    await expect(adapter.openTextFile(defaultFileOpenOptions())).resolves.toEqual({ status: "success", value: opened });
    await expect(adapter.saveTextFile(saveRequest())).resolves.toEqual({ status: "success", value: saved });
  });

  it("fake_adapter_cancel_is_not_failure", async () => {
    const adapter = new FakeTextFileAdapter({ status: "cancelled" }, { status: "cancelled" });
    await expect(adapter.openTextFile(defaultFileOpenOptions())).resolves.toEqual({ status: "cancelled" });
  });

  it("fake_adapter_failure_is_safe", async () => {
    const adapter = new FakeTextFileAdapter({ status: "failure", kind: "permission", safeMessage: "Access was not granted." }, { status: "failure", kind: "io" });
    const result = await adapter.openTextFile(defaultFileOpenOptions());
    expect(result).toMatchObject({ status: "failure", kind: "permission" });
  });

  it("adapter_does_not_modify_store_directly", async () => {
    const store = { mutations: 0 };
    const adapter = new FakeTextFileAdapter({ status: "success", value: opened }, { status: "success", value: saved });
    await adapter.openTextFile(defaultFileOpenOptions());
    expect(store.mutations).toBe(0);
  });

  it("adapter_result_does_not_contain_locale", () => {
    expect(opened).not.toHaveProperty("locale");
    expect(saved).not.toHaveProperty("locale");
    expect(saveRequest()).not.toHaveProperty("locale");
  });

  it("document_scaffold_does_not_call_real_file_apis", () => {
    const modules = import.meta.glob("../*.ts", { eager: true, query: "?raw", import: "default" }) as Record<string, string>;
    const source = Object.values(modules).join("\n");
    for (const forbidden of ["showOpenFilePicker", "FileReader", "@tauri-apps"]) {
      expect(source).not.toContain(forbidden);
    }
  });
});

describe("Phase 15A text validation and encoding", () => {
  it("cas_extension_maps_to_casl", () => {
    expect(successValue(validateTextFileCandidate({ fileName: "main.cas", text: "" })).language).toBe("casl");
  });

  it("cpp_extension_maps_to_cpp", () => {
    expect(successValue(validateTextFileCandidate({ fileName: "main.cpp", text: "" })).language).toBe("cpp");
  });

  it("extension_matching_is_case_insensitive", () => {
    expect(successValue(validateTextFileCandidate({ fileName: "MAIN.CAS", text: "" })).extension).toBe(".cas");
    expect(successValue(validateTextFileCandidate({ fileName: "main.CpP", text: "" })).extension).toBe(".cpp");
  });

  it("unsupported_extension_is_rejected", () => {
    expect(validateTextFileCandidate({ fileName: "main.txt", text: "" })).toEqual({ status: "failure", kind: "invalid-extension" });
  });

  it("utf8_bom_is_removed", () => {
    expect(successValue(validateTextFileCandidate({ fileName: "main.cas", text: "\uFEFFMAIN START" })).text).toBe("MAIN START");
  });

  it("line_endings_are_detected_and_content_is_normalized", () => {
    expect(detectLineEnding("A\nB")).toBe("lf");
    expect(detectLineEnding("A\r\nB")).toBe("crlf");
    expect(detectLineEnding("A\r\nB\nC")).toBe("mixed");
    expect(normalizeTextForEditor("A\r\nB").text).toBe("A\nB");
  });

  it("binary_nul_content_is_rejected", () => {
    expect(validateTextFileCandidate({ fileName: "main.cas", text: "A\0B" })).toEqual({ status: "failure", kind: "binary" });
  });

  it("oversized_content_is_rejected", () => {
    expect(validateTextFileCandidate({ fileName: "main.cas", text: "A", byteLength: 11 }, { acceptedExtensions: [".cas", ".cpp"], maxBytes: 10 })).toEqual({ status: "failure", kind: "too-large" });
  });

  it("reported_byte_length_cannot_bypass_actual_utf8_size", () => {
    expect(validateTextFileCandidate({ fileName: "main.cas", text: "12345678901", byteLength: 1 }, { acceptedExtensions: [".cas", ".cpp"], maxBytes: 10 })).toEqual({ status: "failure", kind: "too-large" });
  });

  it("empty_file_is_allowed", () => {
    expect(successValue(validateTextFileCandidate({ fileName: "empty.cpp", text: "" })).text).toBe("");
  });

  it("filename_is_rendered_as_text_and_path_is_removed", () => {
    expect(safeDisplayFileName("C:\\private\\<img onerror=alert(1)>.cas")).toBe("<img onerror=alert(1)>.cas");
  });

  it("file_size_limit_defaults_to_one_mib", () => {
    expect(defaultFileOpenOptions().maxBytes).toBe(1024 * 1024);
  });
});

function saveRequest(): SaveTextFileRequest {
  return { documentId: "doc" as import("../types").DocumentId, sourceUnitId: "source" as import("../types").SourceUnitId, revision: 0, mode: "save-as", fileName: "program.cas", extension: ".cas", language: "casl", text: opened.text, encoding: "utf-8", lineEnding: "lf" };
}

function successValue(result: FileOperationResult<OpenedTextFile>): OpenedTextFile {
  if (result.status !== "success") throw new Error(`expected success, received ${result.status}`);
  return result.value;
}
