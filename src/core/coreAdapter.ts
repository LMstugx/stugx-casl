import type { AssembleResultDto, CometStateDto, StepResultDto } from "./coreDto";
import type { CoreDebuggerMutationResult, DebuggerMutationRequest } from "../debugger/debuggerMutation";

export type ReloadInitializationMode = "assembled" | "zero" | "ffff";

export interface CoreAdapter {
  assemble(sourceText: string): Promise<AssembleResultDto>;
  reset(): Promise<CometStateDto>;
  reload?(mode: ReloadInitializationMode): Promise<CometStateDto>;
  step(): Promise<StepResultDto>;
  run(maxSteps: number): Promise<CometStateDto>;
  getState(): Promise<CometStateDto>;
  enqueueInput?(text: string, endOfFile?: boolean): Promise<CometStateDto>;
  mutateDebuggerState?(request: DebuggerMutationRequest): Promise<CoreDebuggerMutationResult>;
  fullClear?(): Promise<CometStateDto>;
}
