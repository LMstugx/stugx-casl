import type { CoreAdapter, ReloadInitializationMode } from "./coreAdapter";
import { toAssembleResultDto, toCometStateDto, toStepResultDto } from "./coreDto";
import { mockCaslCore, createEmptyCometState } from "./mockCaslCore";
import type { CometState } from "./types";
import { encodeCaslInputRecord } from "./caslIoEncoding";
import {
  debuggerMutationWord,
  isValidDebuggerMutationInput,
  type DebuggerMutationRequest
} from "../debugger/debuggerMutation";

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

  async reload(mode: ReloadInitializationMode) {
    this.state = mockCaslCore.reload(this.state, mode);
    return toCometStateDto(this.state);
  }

  async step() {
    this.state = mockCaslCore.step(this.state);
    return toStepResultDto(this.state);
  }

  async run(maxSteps: number) {
    const boundedSteps = Math.max(0, Math.floor(maxSteps));
    for (let index = 0; index < boundedSteps; index += 1) {
      if (this.state.runState === "Finished" || this.state.runState === "WaitingInput" || this.state.runState === "Error") break;
      this.state = mockCaslCore.step(this.state);
    }
    return toCometStateDto(this.state);
  }

  async getState() {
    return toCometStateDto(this.state);
  }

  async enqueueInput(text: string, endOfFile = false) {
    this.state = mockCaslCore.enqueueInput(this.state, encodeCaslInputRecord(text), endOfFile);
    return toCometStateDto(this.state);
  }

  async mutateDebuggerState(request: DebuggerMutationRequest) {
    if (!isValidDebuggerMutationInput(request)) {
      return {
        status: "rejected" as const,
        reason: "invalid-value" as const,
        state: toCometStateDto(this.state)
      };
    }
    const nextWord = debuggerMutationWord(request);
    const result = mockCaslCore.mutate(this.state, request.target, nextWord);
    this.state = result.state;
    return {
      status: result.applied ? "applied" as const : "rejected" as const,
      previousWord: result.applied ? result.previousWord : undefined,
      nextWord: result.applied ? nextWord : undefined,
      reason: result.applied ? undefined : "backend-rejected" as const,
      state: toCometStateDto(this.state)
    };
  }

  async fullClear() {
    this.state = mockCaslCore.fullClear();
    return toCometStateDto(this.state);
  }
}
