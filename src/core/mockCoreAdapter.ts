import type { CoreAdapter } from "./coreAdapter";
import { toAssembleResultDto, toCometStateDto, toStepResultDto } from "./coreDto";
import { mockCaslCore, createEmptyCometState } from "./mockCaslCore";
import type { CometState } from "./types";

export class MockCoreAdapter implements CoreAdapter {
  private state: CometState = createEmptyCometState("Idle", ["Editor ready. Assemble to load the current source."]);

  async assemble(sourceText: string) {
    this.state = mockCaslCore.assemble(sourceText);
    return toAssembleResultDto(this.state);
  }

  async reset() {
    this.state = mockCaslCore.reset(this.state);
    return toCometStateDto(this.state);
  }

  async step() {
    this.state = mockCaslCore.step(this.state);
    return toStepResultDto(this.state);
  }

  async run(maxSteps: number) {
    const boundedSteps = Math.max(0, Math.floor(maxSteps));
    for (let index = 0; index < boundedSteps; index += 1) {
      if (this.state.runState === "Finished" || this.state.runState === "Error") break;
      this.state = mockCaslCore.step(this.state);
    }
    return toCometStateDto(this.state);
  }

  async getState() {
    return toCometStateDto(this.state);
  }
}
