import type { CoreAdapter, ReloadInitializationMode } from "./coreAdapter";
import type { AssembleResultDto, CometStateDto, StepResultDto } from "./coreDto";
import { loadWasmModule, type LoadedWasmCore } from "./wasmLoader";
import { encodeCaslInputRecord } from "./caslIoEncoding";
import type { CoreDebuggerMutationResult, DebuggerMutationRequest } from "../debugger/debuggerMutation";
import { registerIndex } from "../debugger/debuggerMutation";

export class WasmCoreAdapter implements CoreAdapter {
  private corePromise: Promise<LoadedWasmCore> | null = null;
  private initialized = false;
  private disposed = false;

  async assemble(sourceText: string): Promise<AssembleResultDto> {
    const core = await this.ensureInitialized();
    return parseWasmJson<AssembleResultDto>(core.assemble(sourceText), "assemble", core);
  }

  async reset(): Promise<CometStateDto> {
    const core = await this.ensureInitialized();
    return parseWasmJson<CometStateDto>(core.reset(), "reset", core);
  }

  async reload(mode: ReloadInitializationMode): Promise<CometStateDto> {
    const core = await this.ensureInitialized();
    const modeValue = mode === "assembled" ? 0 : mode === "zero" ? 1 : 2;
    return parseWasmJson<CometStateDto>(core.reload(modeValue), "reload", core);
  }

  async step(): Promise<StepResultDto> {
    const core = await this.ensureInitialized();
    return parseWasmJson<StepResultDto>(core.step(), "step", core);
  }

  async run(maxSteps: number): Promise<CometStateDto> {
    const core = await this.ensureInitialized();
    return parseWasmJson<CometStateDto>(core.run(maxSteps), "run", core);
  }

  async getState(): Promise<CometStateDto> {
    const core = await this.ensureInitialized();
    return parseWasmJson<CometStateDto>(core.getState(), "getState", core);
  }

  async enqueueInput(text: string, endOfFile = false): Promise<CometStateDto> {
    const core = await this.ensureInitialized();
    const encodedWords = encodeCaslInputRecord(text).join(",");
    return parseWasmJson<CometStateDto>(
      core.enqueueInput(encodedWords, endOfFile ? 1 : 0),
      "enqueueInput",
      core
    );
  }

  async mutateDebuggerState(request: DebuggerMutationRequest): Promise<CoreDebuggerMutationResult> {
    const core = await this.ensureInitialized();
    const [kind, target] = encodeMutationTarget(request);
    return parseWasmJson<CoreDebuggerMutationResult>(
      core.mutate(kind, target, request.nextWord),
      "mutateDebuggerState",
      core
    );
  }

  async fullClear(): Promise<CometStateDto> {
    const core = await this.ensureInitialized();
    return parseWasmJson<CometStateDto>(core.fullClear(), "fullClear", core);
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
      parseWasmJson<CometStateDto>(core.create(), "create", core);
      this.initialized = true;
    }
    return core;
  }
}

function encodeMutationTarget(request: DebuggerMutationRequest): [number, number] {
  if (request.target.kind === "general-register") return [0, registerIndex(request.target.register)];
  if (request.target.kind === "program-register") return [1, 0];
  if (request.target.kind === "stack-pointer") return [2, 0];
  if (request.target.kind === "flag-register") return [3, 0];
  return [4, request.target.address];
}

export function parseWasmJson<T>(json: string, operation: string, core: Pick<LoadedWasmCore, "getLastError">): T {
  try {
    return JSON.parse(json) as T;
  } catch (error) {
    const lastError = safeLastError(core);
    const rawResponse = summarizeRawResponse(json);
    const detail = lastError ? ` Last WASM error: ${lastError}` : "";
    throw new Error(`Failed to parse WASM ${operation} JSON: ${(error as Error).message}. Raw response: ${rawResponse}.${detail}`);
  }
}

function safeLastError(core: Pick<LoadedWasmCore, "getLastError">): string {
  try {
    return core.getLastError();
  } catch {
    return "";
  }
}

function summarizeRawResponse(response: string): string {
  const compact = response.replace(/\s+/g, " ").trim();
  if (!compact) return "<empty>";
  return compact.length > 180 ? `${compact.slice(0, 180)}...` : compact;
}
