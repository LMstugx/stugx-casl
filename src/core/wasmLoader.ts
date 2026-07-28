export type WasmExportedFunction = (...args: unknown[]) => unknown;

export interface StugxCaslWasmModule {
  cwrap: (name: string, returnType: string | null, argTypes: string[]) => WasmExportedFunction;
  UTF8ToString: (pointer: number) => string;
  HEAPU8?: Uint8Array;
}

type EmscriptenModuleFactory = (moduleArgs?: Record<string, unknown>) => Promise<StugxCaslWasmModule>;

export type WasmModuleLoadOptions = {
  modulePath?: string;
  wasmPath?: string;
  moduleUrl?: string;
  wasmUrl?: string;
};

export type LoadedWasmCore = {
  module: StugxCaslWasmModule;
  create: () => string;
  destroy: () => void;
  assemble: (sourceText: string) => string;
  step: () => string;
  reset: () => string;
  reload: (mode: number) => string;
  run: (maxSteps: number) => string;
  getState: () => string;
  enqueueInput: (encodedWords: string, endOfFile: number) => string;
  getLastError: () => string;
};

type NodeFsSync = {
  existsSync(path: string): boolean;
  readFileSync(path: string): Uint8Array;
};

const WASM_MODULE_RELATIVE_PATH = "public/wasm/stugx_casl_core.js";
const WASM_BINARY_RELATIVE_PATH = "public/wasm/stugx_casl_core.wasm";
export const WASM_MODULE_PUBLIC_PATH = "wasm/stugx_casl_core.js";
export const WASM_BINARY_PUBLIC_PATH = "wasm/stugx_casl_core.wasm";
const WASM_BUILD_HINT = "Please run scripts/build-wasm.ps1 before using the WASM backend.";

function isNodeRuntime(): boolean {
  const processLike = (globalThis as { process?: { versions?: { node?: string }; type?: string } }).process;
  return Boolean(processLike?.versions?.node) && !("window" in globalThis);
}

function projectFilePath(relativePath: string): string {
  const processLike = (globalThis as { process?: { cwd?: () => string } }).process;
  const cwd = processLike?.cwd?.();
  if (!cwd) throw new Error("Cannot resolve local WASM path outside a Node runtime.");
  return `${cwd.replace(/[\\/]$/, "")}\\${relativePath.replace(/^\//, "").replace(/\//g, "\\")}`;
}

async function importModuleFactory(moduleUrl: string): Promise<EmscriptenModuleFactory> {
  try {
    const imported = isNodeRuntime()
      ? ((await import(/* @vite-ignore */ moduleUrl)) as { default?: unknown })
      : ((await import(/* @vite-ignore */ moduleUrl)) as { default?: unknown });
    if (typeof imported.default !== "function") {
      throw new Error("WASM module did not export an Emscripten factory function.");
    }
    return imported.default as EmscriptenModuleFactory;
  } catch (error) {
    throw new Error(`Failed to load WASM module JS from ${moduleUrl}: ${(error as Error).message}. ${WASM_BUILD_HINT}`);
  }
}

function pathToFileHref(path: string): string {
  return `file:///${path.replace(/\\/g, "/").replace(/^\//, "")}`;
}

function readNodeWasmBinary(wasmPath: string): Uint8Array {
  const processLike = (globalThis as { process?: { getBuiltinModule?: (name: string) => NodeFsSync } }).process;
  const fs = processLike?.getBuiltinModule?.("fs");
  if (!fs) {
    throw new Error("Node fs module is unavailable for loading the local WASM binary.");
  }
  if (!fs.existsSync(wasmPath)) {
    throw new Error(`${WASM_BINARY_RELATIVE_PATH} not found at ${wasmPath}. ${WASM_BUILD_HINT}`);
  }
  return fs.readFileSync(wasmPath);
}

function assertNodeFileExists(path: string, relativePath: string): void {
  const processLike = (globalThis as { process?: { getBuiltinModule?: (name: string) => NodeFsSync } }).process;
  const fs = processLike?.getBuiltinModule?.("fs");
  if (!fs) {
    throw new Error(`Node fs module is unavailable for checking ${relativePath}.`);
  }
  if (!fs.existsSync(path)) {
    throw new Error(`${relativePath} not found at ${path}. ${WASM_BUILD_HINT}`);
  }
}

function wrapStringFunction(module: StugxCaslWasmModule, name: string, argTypes: string[], options: { allowEmpty: boolean }) {
  const callPointer = module.cwrap(name, "number", argTypes) as (...args: unknown[]) => number;
  return (...args: unknown[]) => {
    const pointer = callPointer(...args);
    if (!pointer) {
      throw new Error(`${name} returned a null string pointer. ${WASM_BUILD_HINT}`);
    }
    const json = readCString(module, pointer);
    if (!json && !options.allowEmpty) {
      throw new Error(`${name} returned an empty JSON string. ${WASM_BUILD_HINT}`);
    }
    return json;
  };
}

function readCString(module: StugxCaslWasmModule, pointer: number): string {
  if (!module.HEAPU8) return module.UTF8ToString(pointer);

  const heap = module.HEAPU8;
  let end = pointer;
  while (end < heap.length && heap[end] !== 0) end += 1;
  if (end >= heap.length) {
    throw new Error("WASM string pointer was not null-terminated.");
  }

  const bytes = Uint8Array.from(heap.subarray(pointer, end));
  return new TextDecoder().decode(bytes);
}

function wrapJsonFunction(module: StugxCaslWasmModule, name: string, argTypes: string[]) {
  return wrapStringFunction(module, name, argTypes, { allowEmpty: false });
}

function wrapOptionalStringFunction(module: StugxCaslWasmModule, name: string, argTypes: string[]) {
  return wrapStringFunction(module, name, argTypes, { allowEmpty: true });
}

export async function loadWasmModule(options: WasmModuleLoadOptions = {}): Promise<LoadedWasmCore> {
  const nodeRuntime = isNodeRuntime();
  const modulePath = nodeRuntime ? options.modulePath ?? projectFilePath(WASM_MODULE_RELATIVE_PATH) : undefined;
  const wasmPath = nodeRuntime ? options.wasmPath ?? projectFilePath(WASM_BINARY_RELATIVE_PATH) : undefined;
  if (modulePath) assertNodeFileExists(modulePath, WASM_MODULE_RELATIVE_PATH);
  const browserUrls = resolveWasmAssetUrls();
  const moduleUrl = options.moduleUrl ?? (modulePath ? pathToFileHref(modulePath) : browserUrls.moduleUrl);
  const wasmUrl = options.wasmUrl ?? browserUrls.wasmUrl;
  const factory = await importModuleFactory(moduleUrl);
  const wasmBinary = wasmPath ? readNodeWasmBinary(wasmPath) : undefined;
  const moduleArgs: Record<string, unknown> = {
    locateFile: (path: string) => (path.endsWith(".wasm") ? wasmUrl : path)
  };
  if (wasmBinary) {
    moduleArgs.instantiateWasm = (imports: WebAssembly.Imports, receiveInstance: (instance: WebAssembly.Instance) => void) => {
      void WebAssembly.instantiate(wasmBinary, imports).then((result) => {
        const instantiated = result as unknown as WebAssembly.Instance | { instance: WebAssembly.Instance };
        const instance = instantiated instanceof WebAssembly.Instance ? instantiated : instantiated.instance;
        receiveInstance(instance);
      });
      return {};
    };
  }
  let module: StugxCaslWasmModule;
  try {
    module = await factory(moduleArgs);
  } catch (error) {
    throw new Error(`Failed to initialize WASM core module from ${moduleUrl}: ${(error as Error).message}. ${WASM_BUILD_HINT}`);
  }

  return {
    module,
    create: wrapJsonFunction(module, "stugx_casl_create", []) as () => string,
    destroy: module.cwrap("stugx_casl_destroy", null, []) as () => void,
    assemble: wrapJsonFunction(module, "stugx_casl_assemble", ["string"]) as (sourceText: string) => string,
    step: wrapJsonFunction(module, "stugx_casl_step", []) as () => string,
    reset: wrapJsonFunction(module, "stugx_casl_reset", []) as () => string,
    reload: wrapJsonFunction(module, "stugx_casl_reload", ["number"]) as (mode: number) => string,
    run: wrapJsonFunction(module, "stugx_casl_run", ["number"]) as (maxSteps: number) => string,
    getState: wrapJsonFunction(module, "stugx_casl_get_state", []) as () => string,
    enqueueInput: wrapJsonFunction(module, "stugx_casl_enqueue_input", ["string", "number"]) as (encodedWords: string, endOfFile: number) => string,
    getLastError: wrapOptionalStringFunction(module, "stugx_casl_get_last_error", []) as () => string
  };
}

export function resolveWasmAssetUrls(
  basePath: string = import.meta.env.BASE_URL,
  documentBaseUrl: string | undefined = resolveDocumentBaseUrl()
): { moduleUrl: string; wasmUrl: string } {
  const base = normalizeAssetBasePath(basePath);
  if (base === "./" && documentBaseUrl) {
    return {
      moduleUrl: new URL(WASM_MODULE_PUBLIC_PATH, documentBaseUrl).href,
      wasmUrl: new URL(WASM_BINARY_PUBLIC_PATH, documentBaseUrl).href
    };
  }
  return {
    moduleUrl: `${base}${WASM_MODULE_PUBLIC_PATH}`,
    wasmUrl: `${base}${WASM_BINARY_PUBLIC_PATH}`
  };
}

function normalizeAssetBasePath(basePath: string): string {
  const candidate = basePath.trim() || "/";
  if (candidate === "./") return candidate;
  if (!candidate.startsWith("/") || candidate.includes("\\") || candidate.includes("?") || candidate.includes("#")) {
    throw new Error("Invalid deployment base path for WASM assets.");
  }
  const normalized = candidate.endsWith("/") ? candidate : `${candidate}/`;
  if (normalized.split("/").some((segment) => segment === "." || segment === "..")) {
    throw new Error("Invalid relative segment in WASM deployment base path.");
  }
  return normalized.replace(/\/{2,}/g, "/");
}

function resolveDocumentBaseUrl(): string | undefined {
  if (typeof document === "undefined") return undefined;
  return new URL(".", document.baseURI).href;
}
