import type { CoreAdapter } from "./coreAdapter";
import type { AssembleResultDto, CometStateDto, StepResultDto } from "./coreDto";

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
