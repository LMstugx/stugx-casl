import type { CoreAdapter } from "./coreAdapter";
import { MockCoreAdapter } from "./mockCoreAdapter";

let activeAdapter: CoreAdapter = new MockCoreAdapter();

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
