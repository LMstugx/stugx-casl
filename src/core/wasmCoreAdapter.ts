import type { CoreAdapter } from "./coreAdapter";
import type { AssembleResultDto, CometStateDto, StepResultDto } from "./coreDto";
import { loadWasmModule, type LoadedWasmCore } from "./wasmLoader";

export class WasmCoreAdapter implements CoreAdapter {
  private corePromise: Promise<LoadedWasmCore> | null = null;
  private initialized = false;
  private disposed = false;

  async assemble(sourceText: string): Promise<AssembleResultDto> {
    const core = await this.ensureInitialized();
    return parseJson<AssembleResultDto>(core.assemble(sourceText), "assemble", core);
  }

  async reset(): Promise<CometStateDto> {
    const core = await this.ensureInitialized();
    return parseJson<CometStateDto>(core.reset(), "reset", core);
  }

  async step(): Promise<StepResultDto> {
    const core = await this.ensureInitialized();
    return parseJson<StepResultDto>(core.step(), "step", core);
  }

  async run(maxSteps: number): Promise<CometStateDto> {
    const core = await this.ensureInitialized();
    return parseJson<CometStateDto>(core.run(maxSteps), "run", core);
  }

  async getState(): Promise<CometStateDto> {
    const core = await this.ensureInitialized();
    return parseJson<CometStateDto>(core.getState(), "getState", core);
  }

  async dispose(): Promise<void> {
    if (!this.corePromise || this.disposed) return;
    const core = await this.corePromise;
    core.destroy();
    this.disposed = true;
    this.initialized = false;
    this.corePromise = null;
  }

  private async ensureInitialized(): Promise<LoadedWasmCore> {
    if (this.disposed) {
      throw new Error("WASM core adapter has been disposed.");
    }
    this.corePromise ??= loadWasmModule();
    const core = await this.corePromise;
    if (!this.initialized) {
      parseJson<CometStateDto>(core.create(), "create", core);
      this.initialized = true;
    }
    return core;
  }
}

function parseJson<T>(json: string, operation: string, core: LoadedWasmCore): T {
  try {
    return JSON.parse(json) as T;
  } catch (error) {
    const lastError = safeLastError(core);
    const detail = lastError ? ` Last WASM error: ${lastError}` : "";
    throw new Error(`Failed to parse WASM ${operation} JSON: ${(error as Error).message}.${detail}`);
  }
}

function safeLastError(core: LoadedWasmCore): string {
  try {
    return core.getLastError();
  } catch {
    return "";
  }
}
