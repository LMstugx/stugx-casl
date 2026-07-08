import type { CoreAdapter } from "./coreAdapter";
import { MockCoreAdapter } from "./mockCoreAdapter";
import { WasmCoreAdapter } from "./wasmCoreAdapter";

function createDefaultAdapter(): CoreAdapter {
  return import.meta.env.VITE_CORE_BACKEND === "wasm" ? new WasmCoreAdapter() : new MockCoreAdapter();
}

let activeAdapter: CoreAdapter = createDefaultAdapter();

export function getCoreAdapter(): CoreAdapter {
  return activeAdapter;
}

export function setCoreAdapter(adapter: CoreAdapter): void {
  activeAdapter = adapter;
}

export const coreBridge = {
  assemble(sourceText: string) {
    return activeAdapter.assemble(sourceText);
  },
  reset() {
    return activeAdapter.reset();
  },
  step() {
    return activeAdapter.step();
  },
  run(maxSteps: number) {
    return activeAdapter.run(maxSteps);
  },
  getState() {
    return activeAdapter.getState();
  }
};
