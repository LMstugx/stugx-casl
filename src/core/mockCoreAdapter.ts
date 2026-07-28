import type { CoreAdapter, ReloadInitializationMode } from "./coreAdapter";
import { toAssembleResultDto, toCometStateDto, toStepResultDto } from "./coreDto";
import {
  mockCaslCore,
  createEmptyCometState,
  reverseMockInstruction,
  reverseMockMicrocycle
} from "./mockCaslCore";
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
    const previous = this.state;
    this.state = {
      ...mockCaslCore.assemble(sourceText),
      historyEpoch: previous.historyEpoch + 1,
      timelineRevision: previous.timelineRevision + 1
    };
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

  async microStep() {
    this.state = mockCaslCore.microStep(this.state);
    return toStepResultDto(this.state);
  }

  async reverseMicrostep(historyEpoch: number, timelineRevision: number) {
    const reverse = reverseMockMicrocycle(this.state, historyEpoch, timelineRevision);
    this.state = reverse.state;
    const state = toCometStateDto(this.state);
    return {
      ...reverse.result,
      state: {
        ...state,
        historyEpoch: this.state.historyEpoch,
        timelineRevision: this.state.timelineRevision,
        reverseAvailability: {
          ...this.state.reverseAvailability,
          targetPhase: this.state.reverseAvailability.targetPhase ?? null
        },
        reverseInstructionAvailability: {
          ...this.state.reverseInstructionAvailability,
          instructionId: this.state.reverseInstructionAvailability.instructionId ?? null,
          machineAddress: this.state.reverseInstructionAvailability.machineAddress ?? null,
          instructionKind: this.state.reverseInstructionAvailability.instructionKind ?? null
        },
        microcycleHistorySummary: {
          ...this.state.microcycleHistorySummary,
          floorEntryId: this.state.microcycleHistorySummary.floorEntryId ?? null
        }
      }
    };
  }

  async reverseInstruction(historyEpoch: number, timelineRevision: number) {
    const reverse = reverseMockInstruction(this.state, historyEpoch, timelineRevision);
    this.state = reverse.state;
    const state = toCometStateDto(this.state);
    return {
      ...reverse.result,
      state: {
        ...state,
        historyEpoch: this.state.historyEpoch,
        timelineRevision: this.state.timelineRevision,
        reverseAvailability: {
          ...this.state.reverseAvailability,
          targetPhase: this.state.reverseAvailability.targetPhase ?? null
        },
        reverseInstructionAvailability: {
          ...this.state.reverseInstructionAvailability,
          instructionId: this.state.reverseInstructionAvailability.instructionId ?? null,
          machineAddress: this.state.reverseInstructionAvailability.machineAddress ?? null,
          instructionKind: this.state.reverseInstructionAvailability.instructionKind ?? null
        },
        microcycleHistorySummary: {
          ...this.state.microcycleHistorySummary,
          floorEntryId: this.state.microcycleHistorySummary.floorEntryId ?? null
        }
      }
    };
  }

  async run(maxSteps: number) {
    const boundedSteps = Math.max(0, Math.floor(maxSteps));
    for (let index = 0; index < boundedSteps; index += 1) {
      if (this.state.runState === "Finished" || this.state.runState === "WaitingInput" || this.state.runState === "Error") break;
      this.state = mockCaslCore.step(this.state);
    }
    return toCometStateDto(this.state);
  }

  async runMicrocycles(maxMicrosteps: number) {
    const boundedSteps = Math.max(0, Math.floor(maxMicrosteps));
    for (let index = 0; index < boundedSteps; index += 1) {
      if (this.state.runState === "Finished" || this.state.runState === "WaitingInput" || this.state.runState === "Error") break;
      this.state = mockCaslCore.microStep(this.state);
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
    const previous = this.state;
    this.state = {
      ...mockCaslCore.fullClear(),
      historyEpoch: previous.historyEpoch + 1,
      timelineRevision: previous.timelineRevision + 1,
      reverseAvailability: { available: false, reason: "runtime-not-loaded" },
      reverseInstructionAvailability: {
        available: false,
        reason: "runtime-not-loaded",
        reversibleMicrosteps: 0,
        complete: false
      }
    };
    return toCometStateDto(this.state);
  }
}
