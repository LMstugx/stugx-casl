import type { SaveTextFileRequest } from "./fileAdapter";
import type { FileSystemFileHandleLike } from "./transientWriteBinding";

export interface BrowserSavePlatform {
  supportsFileSystemAccess(): boolean;
  showSaveFilePicker(request: SaveTextFileRequest): Promise<FileSystemFileHandleLike>;
  requestDownload(fileName: string, bytes: Uint8Array): Promise<void>;
}

type SavePickerWindow = Window & {
  showSaveFilePicker?: (options: {
    suggestedName: string;
    types: Array<{ description: string; accept: Record<string, string[]> }>;
    excludeAcceptAllOption: boolean;
  }) => Promise<FileSystemFileHandleLike>;
};

export class DomBrowserSavePlatform implements BrowserSavePlatform {
  supportsFileSystemAccess(): boolean {
    if (typeof window === "undefined") return false;
    const saveWindow = window as SavePickerWindow;
    return window.isSecureContext === true && typeof saveWindow.showSaveFilePicker === "function";
  }

  async showSaveFilePicker(request: SaveTextFileRequest): Promise<FileSystemFileHandleLike> {
    const saveWindow = window as SavePickerWindow;
    if (!this.supportsFileSystemAccess() || !saveWindow.showSaveFilePicker) throw new UnsupportedSaveError();
    return saveWindow.showSaveFilePicker({
      suggestedName: request.fileName,
      types: [{ description: "CASL/C++ source", accept: { "text/plain": [request.extension] } }],
      excludeAcceptAllOption: true
    });
  }

  async requestDownload(fileName: string, bytes: Uint8Array): Promise<void> {
    if (typeof document === "undefined" || !document.body || typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
      throw new UnsupportedSaveError();
    }
    const byteCopy = new Uint8Array(bytes.byteLength);
    byteCopy.set(bytes);
    const blob = new Blob([byteCopy.buffer], { type: "text/plain;charset=utf-8" });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.hidden = true;
    anchor.download = fileName;
    anchor.href = objectUrl;
    document.body.append(anchor);
    try {
      anchor.click();
    } finally {
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    }
  }
}

export class UnsupportedSaveError extends Error {
  constructor() {
    super("Browser save is unsupported");
    this.name = "UnsupportedSaveError";
  }
}

export function isPickerCancellation(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export function isPermissionFailure(error: unknown): boolean {
  return error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "SecurityError");
}
