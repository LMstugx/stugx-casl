export type WasmExportedFunction = (...args: unknown[]) => number | void;

export interface StugxCaslWasmModule {
  cwrap: (name: string, returnType: string | null, argTypes: string[]) => WasmExportedFunction;
  UTF8ToString: (pointer: number) => string;
}

export type LoadedWasmCore = {
  module: StugxCaslWasmModule;
  create: () => number;
  destroy: () => void;
  assemble: (sourceText: string) => number;
  step: () => number;
  reset: () => number;
  run: (maxSteps: number) => number;
  getState: () => number;
  getLastError: () => number;
};

export async function loadWasmModule(): Promise<LoadedWasmCore> {
  throw new Error("WASM module loading is planned for Phase 4B. Build output will live at /wasm/stugx_casl_core.js.");
}

