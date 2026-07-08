import type { CoreAdapter } from "./coreAdapter";
import type { AssembleResultDto, CometStateDto, StepResultDto } from "./coreDto";

// Phase 4A keeps this adapter disabled. Phase 4B will use wasmLoader.ts to
// load /wasm/stugx_casl_core.js and wrap the exported C ABI JSON functions.
export class WasmCoreAdapter implements CoreAdapter {
  async assemble(_sourceText: string): Promise<AssembleResultDto> {
    throw new Error("WASM core adapter is not implemented yet");
  }

  async reset(): Promise<CometStateDto> {
    throw new Error("WASM core adapter is not implemented yet");
  }

  async step(): Promise<StepResultDto> {
    throw new Error("WASM core adapter is not implemented yet");
  }

  async run(_maxSteps: number): Promise<CometStateDto> {
    throw new Error("WASM core adapter is not implemented yet");
  }

  async getState(): Promise<CometStateDto> {
    throw new Error("WASM core adapter is not implemented yet");
  }
}
