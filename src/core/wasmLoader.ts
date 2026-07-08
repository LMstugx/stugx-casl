export type WasmExportedFunction = (...args: unknown[]) => unknown;

export interface StugxCaslWasmModule {
  cwrap: (name: string, returnType: string | null, argTypes: string[]) => WasmExportedFunction;
  UTF8ToString: (pointer: number) => string;
}

type EmscriptenModuleFactory = (moduleArgs?: Record<string, unknown>) => Promise<StugxCaslWasmModule>;

export type LoadedWasmCore = {
  module: StugxCaslWasmModule;
  create: () => string;
  destroy: () => void;
  assemble: (sourceText: string) => string;
  step: () => string;
  reset: () => string;
  run: (maxSteps: number) => string;
  getState: () => string;
  getLastError: () => string;
};

type NodeFsSync = {
  readFileSync(path: string): Uint8Array;
};

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
    const imported = (await import(/* @vite-ignore */ moduleUrl)) as { default?: unknown };
    if (typeof imported.default !== "function") {
      throw new Error("WASM module did not export an Emscripten factory function.");
    }
    return imported.default as EmscriptenModuleFactory;
  } catch (error) {
    throw new Error(`Failed to load WASM module JS from ${moduleUrl}: ${(error as Error).message}`);
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
  return fs.readFileSync(wasmPath);
}

function wrapJsonFunction(module: StugxCaslWasmModule, name: string, argTypes: string[]) {
  const callPointer = module.cwrap(name, "number", argTypes) as (...args: unknown[]) => number;
  return (...args: unknown[]) => {
    const pointer = callPointer(...args);
    const json = module.UTF8ToString(pointer);
    if (!json) throw new Error(`${name} returned an empty JSON string.`);
    return json;
  };
}

export async function loadWasmModule(): Promise<LoadedWasmCore> {
  const nodeRuntime = isNodeRuntime();
  const modulePath = nodeRuntime ? projectFilePath("public/wasm/stugx_casl_core.js") : undefined;
  const wasmPath = nodeRuntime ? projectFilePath("public/wasm/stugx_casl_core.wasm") : undefined;
  const moduleUrl = modulePath ? pathToFileHref(modulePath) : "/wasm/stugx_casl_core.js";
  const factory = await importModuleFactory(moduleUrl);
  const wasmBinary = wasmPath ? readNodeWasmBinary(wasmPath) : undefined;
  const moduleArgs: Record<string, unknown> = {
    locateFile: (path: string) => (path.endsWith(".wasm") ? "/wasm/stugx_casl_core.wasm" : path)
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
  const module = await factory(moduleArgs);

  return {
    module,
    create: wrapJsonFunction(module, "stugx_casl_create", []) as () => string,
    destroy: module.cwrap("stugx_casl_destroy", null, []) as () => void,
    assemble: wrapJsonFunction(module, "stugx_casl_assemble", ["string"]) as (sourceText: string) => string,
    step: wrapJsonFunction(module, "stugx_casl_step", []) as () => string,
    reset: wrapJsonFunction(module, "stugx_casl_reset", []) as () => string,
    run: wrapJsonFunction(module, "stugx_casl_run", ["number"]) as (maxSteps: number) => string,
    getState: wrapJsonFunction(module, "stugx_casl_get_state", []) as () => string,
    getLastError: wrapJsonFunction(module, "stugx_casl_get_last_error", []) as () => string
  };
}
