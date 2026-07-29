import type { AssembleResultDto, CometStateDto, StepResultDto } from "./coreDto";
import type { CoreDebuggerMutationResult, DebuggerMutationRequest } from "../debugger/debuggerMutation";
import type { ReverseMicrostepResultDto } from "./reverseMicrocycle";
import type { ReverseInstructionResultDto } from "./reverseInstruction";
import type {
  LinkProjectResultDto,
  ModuleAssemblyResult,
  ProjectLinkModuleInput,
  ProjectLinkRequest
} from "../linker/types";

export type ReloadInitializationMode = "assembled" | "zero" | "ffff";

export interface CoreAdapter {
  assemble(sourceText: string): Promise<AssembleResultDto>;
  assembleModule?(input: ProjectLinkModuleInput): Promise<ModuleAssemblyResult>;
  linkProject?(request: ProjectLinkRequest): Promise<LinkProjectResultDto>;
  reset(): Promise<CometStateDto>;
  reload?(mode: ReloadInitializationMode): Promise<CometStateDto>;
  step(): Promise<StepResultDto>;
  microStep?(): Promise<StepResultDto>;
  reverseMicrostep?(historyEpoch: number, timelineRevision: number): Promise<ReverseMicrostepResultDto>;
  reverseInstruction?(historyEpoch: number, timelineRevision: number): Promise<ReverseInstructionResultDto>;
  run(maxSteps: number): Promise<CometStateDto>;
  runMicrocycles?(maxMicrosteps: number): Promise<CometStateDto>;
  getState(): Promise<CometStateDto>;
  enqueueInput?(text: string, endOfFile?: boolean): Promise<CometStateDto>;
  mutateDebuggerState?(request: DebuggerMutationRequest): Promise<CoreDebuggerMutationResult>;
  fullClear?(): Promise<CometStateDto>;
}
