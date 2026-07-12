export interface BrowserCapabilityMatrix {
  webAssembly: boolean;
  textDecoder: boolean;
  strictUtf8Decoder: boolean;
  blobDownload: boolean;
  fileInput: boolean;
  fileSystemAccess: boolean;
  localStorage: boolean;
  beforeUnload: boolean;
  reducedMotion: boolean;
  secureContext: boolean;
}

export function detectBrowserCapabilities(scope: typeof globalThis = globalThis): BrowserCapabilityMatrix {
  const windowLike = scope as typeof globalThis & {
    showSaveFilePicker?: unknown;
    matchMedia?: (query: string) => { matches: boolean };
    isSecureContext?: boolean;
  };
  return {
    webAssembly: typeof scope.WebAssembly === "object" && typeof scope.WebAssembly.instantiate === "function",
    textDecoder: typeof scope.TextDecoder === "function",
    strictUtf8Decoder: supportsFatalTextDecoder(scope),
    blobDownload: typeof scope.Blob === "function" && typeof scope.URL?.createObjectURL === "function",
    fileInput: typeof scope.document?.createElement === "function" && typeof scope.File === "function",
    fileSystemAccess: windowLike.isSecureContext === true && typeof windowLike.showSaveFilePicker === "function",
    localStorage: hasLocalStorage(scope),
    beforeUnload: "onbeforeunload" in windowLike,
    reducedMotion: windowLike.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
    secureContext: windowLike.isSecureContext === true
  };
}

export function hasRequiredProductionCapabilities(capabilities: BrowserCapabilityMatrix): boolean {
  return capabilities.webAssembly;
}

function supportsFatalTextDecoder(scope: typeof globalThis): boolean {
  try {
    if (typeof scope.TextDecoder !== "function") return false;
    new scope.TextDecoder("utf-8", { fatal: true });
    return true;
  } catch {
    return false;
  }
}

function hasLocalStorage(scope: typeof globalThis): boolean {
  try {
    return Boolean((scope as typeof globalThis & { localStorage?: Storage }).localStorage);
  } catch {
    return false;
  }
}
