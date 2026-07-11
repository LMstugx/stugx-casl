import {
  type FileOpenOptions,
  type FileOperationResult,
  type OpenedTextFile,
  type SaveTextFileRequest,
  type SavedTextFile,
  type TextFileAdapter
} from "./fileAdapter";
import { validateTextFileCandidate } from "./validation";

type BrowserFileLike = Pick<File, "name" | "arrayBuffer">;

export type BrowserFileSelection =
  | { status: "selected"; file: BrowserFileLike }
  | { status: "cancelled" }
  | { status: "failure"; kind: "unsupported" | "io" | "unknown"; rawContext?: unknown };

export interface BrowserFileSelectionPort {
  selectSingleFile(accept: string): Promise<BrowserFileSelection>;
  dispose?(): void;
}

export interface Utf8DecoderPort {
  decode(bytes: Uint8Array): string;
}

export class BrowserTextFileAdapter implements TextFileAdapter {
  constructor(
    private readonly selectionPort: BrowserFileSelectionPort = new BrowserInputFileSelectionPort(),
    private readonly decoder: Utf8DecoderPort = new StrictUtf8Decoder()
  ) {}

  async openTextFile(options: FileOpenOptions): Promise<FileOperationResult<OpenedTextFile>> {
    const selection = await this.selectionPort.selectSingleFile(options.acceptedExtensions.join(","));
    if (selection.status === "cancelled") return { status: "cancelled" };
    if (selection.status === "failure") return selection;

    try {
      const buffer = await selection.file.arrayBuffer();
      if (buffer.byteLength > options.maxBytes) return { status: "failure", kind: "too-large" };
      const text = this.decoder.decode(new Uint8Array(buffer));
      return validateTextFileCandidate({ fileName: selection.file.name, text, byteLength: buffer.byteLength }, options);
    } catch (error) {
      if (error instanceof InvalidUtf8Error) {
        return { status: "failure", kind: "invalid-encoding", rawContext: error };
      }
      return { status: "failure", kind: "io", rawContext: error };
    }
  }

  async saveTextFile(_request: SaveTextFileRequest): Promise<FileOperationResult<SavedTextFile>> {
    return { status: "failure", kind: "unsupported" };
  }

  dispose(): void {
    this.selectionPort.dispose?.();
  }
}

export class BrowserInputFileSelectionPort implements BrowserFileSelectionPort {
  private cancelActiveSelection: (() => void) | null = null;

  async selectSingleFile(accept: string): Promise<BrowserFileSelection> {
    if (typeof document === "undefined" || !document.body) {
      return { status: "failure", kind: "unsupported" };
    }
    if (this.cancelActiveSelection) {
      return { status: "failure", kind: "io" };
    }

    return new Promise<BrowserFileSelection>((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = accept;
      input.multiple = false;
      input.hidden = true;
      input.setAttribute("aria-hidden", "true");
      let settled = false;
      let focusTimer: number | undefined;

      const finish = (result: BrowserFileSelection) => {
        if (settled) return;
        settled = true;
        if (focusTimer !== undefined) window.clearTimeout(focusTimer);
        input.removeEventListener("change", onChange);
        input.removeEventListener("cancel", onCancel);
        window.removeEventListener("focus", onWindowFocus);
        input.value = "";
        input.remove();
        this.cancelActiveSelection = null;
        resolve(result);
      };
      const onChange = () => {
        const file = input.files?.item(0);
        finish(file ? { status: "selected", file } : { status: "cancelled" });
      };
      const onCancel = () => finish({ status: "cancelled" });
      const onWindowFocus = () => {
        focusTimer = window.setTimeout(() => {
          if (!settled && !input.files?.length) finish({ status: "cancelled" });
        }, 0);
      };

      input.addEventListener("change", onChange, { once: true });
      input.addEventListener("cancel", onCancel, { once: true });
      window.addEventListener("focus", onWindowFocus);
      document.body.append(input);
      this.cancelActiveSelection = () => finish({ status: "cancelled" });

      try {
        input.value = "";
        input.click();
      } catch (error) {
        finish({ status: "failure", kind: "unknown", rawContext: error });
      }
    });
  }

  dispose(): void {
    this.cancelActiveSelection?.();
  }
}

class StrictUtf8Decoder implements Utf8DecoderPort {
  decode(bytes: Uint8Array): string {
    if (typeof TextDecoder === "undefined") throw new InvalidUtf8Error("UTF-8 decoding is unavailable");
    try {
      return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      const decoded = new TextDecoder("utf-8").decode(bytes);
      if (decoded.includes("\uFFFD")) throw new InvalidUtf8Error("The file is not valid UTF-8");
      return decoded;
    }
  }
}

class InvalidUtf8Error extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidUtf8Error";
  }
}
