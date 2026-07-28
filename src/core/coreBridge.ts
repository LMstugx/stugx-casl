import type { CoreAdapter, ReloadInitializationMode } from "./coreAdapter";
import { MockCoreAdapter } from "./mockCoreAdapter";
import { WasmCoreAdapter } from "./wasmCoreAdapter";
import type { DebuggerMutationRequest } from "../debugger/debuggerMutation";

export type CoreBackendKind = "mock" | "wasm";
export type CoreBackendStatus = "ready" | "error";

export type CoreBackendInfo = {
  kind: CoreBackendKind;
  label: "Mock Core" | "WASM Core" | "WASM Error";
  status: CoreBackendStatus;
  errorMessage?: string;
};

type AdapterSelection = {
  adapter: CoreAdapter;
  info: CoreBackendInfo;
};

export function resolveCoreBackend(value: unknown): CoreBackendKind {
  return value === "wasm" ? "wasm" : "mock";
}

export function createCoreAdapterForBackend(backend: unknown): AdapterSelection {
  const kind = resolveCoreBackend(backend);
  if (kind === "wasm") {
    return {
      adapter: new WasmCoreAdapter(),
      info: { kind: "wasm", label: "WASM Core", status: "ready" }
    };
  }
  return {
    adapter: new MockCoreAdapter(),
    info: { kind: "mock", label: "Mock Core", status: "ready" }
  };
}

function createDefaultAdapter(): AdapterSelection {
  return createCoreAdapterForBackend(import.meta.env.VITE_CORE_BACKEND);
}

let activeSelection = createDefaultAdapter();

export function getCoreAdapter(): CoreAdapter {
  return activeSelection.adapter;
}

export function getCoreBackendInfo(): CoreBackendInfo {
  return { ...activeSelection.info };
}

export function setCoreAdapter(adapter: CoreAdapter, info: CoreBackendInfo = { kind: "mock", label: "Mock Core", status: "ready" }): void {
  activeSelection = { adapter, info };
}

function setBackendReady(): void {
  activeSelection.info = {
    kind: activeSelection.info.kind,
    label: activeSelection.info.kind === "wasm" ? "WASM Core" : "Mock Core",
    status: "ready"
  };
}

function setBackendError(): void {
  activeSelection.info = {
    kind: activeSelection.info.kind,
    label: activeSelection.info.kind === "wasm" ? "WASM Error" : "Mock Core",
    status: "error",
    errorMessage: "Core backend unavailable"
  };
}

async function callCore<T>(operation: () => Promise<T>): Promise<T> {
  try {
    const result = await operation();
    setBackendReady();
    return result;
  } catch (error) {
    setBackendError();
    throw error;
  }
}

let mutationQueue: Promise<void> = Promise.resolve();

async function callCoreTransaction<T>(operation: () => Promise<T>): Promise<T> {
  const previous = mutationQueue;
  let release!: () => void;
  mutationQueue = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    return await callCore(operation);
  } finally {
    release();
  }
}

export const coreBridge = {
  assemble(sourceText: string) {
    return callCoreTransaction(() => activeSelection.adapter.assemble(sourceText));
  },
  reset() {
    return callCoreTransaction(() => activeSelection.adapter.reset());
  },
  reload(mode: ReloadInitializationMode) {
    return callCoreTransaction(() => {
      if (!activeSelection.adapter.reload) throw new Error("Core backend does not support program reload.");
      return activeSelection.adapter.reload(mode);
    });
  },
  step() {
    return callCoreTransaction(() => activeSelection.adapter.step());
  },
  run(maxSteps: number) {
    return callCoreTransaction(() => activeSelection.adapter.run(maxSteps));
  },
  getState() {
    return callCore(() => activeSelection.adapter.getState());
  },
  enqueueInput(text: string, endOfFile = false) {
    return callCoreTransaction(() => {
      if (!activeSelection.adapter.enqueueInput) throw new Error("Core backend does not support console input.");
      return activeSelection.adapter.enqueueInput(text, endOfFile);
    });
  },
  mutateDebuggerState(request: DebuggerMutationRequest) {
    return callCoreTransaction(() => {
      if (!activeSelection.adapter.mutateDebuggerState) throw new Error("Core backend does not support debugger mutation.");
      return activeSelection.adapter.mutateDebuggerState(request);
    });
  },
  fullClear() {
    return callCoreTransaction(() => {
      if (!activeSelection.adapter.fullClear) throw new Error("Core backend does not support full clear.");
      return activeSelection.adapter.fullClear();
    });
  }
};
