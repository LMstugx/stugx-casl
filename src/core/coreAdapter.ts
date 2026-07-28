import type { AssembleResultDto, CometStateDto, StepResultDto } from "./coreDto";

export type ReloadInitializationMode = "assembled" | "zero" | "ffff";

export interface CoreAdapter {
  assemble(sourceText: string): Promise<AssembleResultDto>;
  reset(): Promise<CometStateDto>;
  reload?(mode: ReloadInitializationMode): Promise<CometStateDto>;
  step(): Promise<StepResultDto>;
  run(maxSteps: number): Promise<CometStateDto>;
  getState(): Promise<CometStateDto>;
  enqueueInput?(text: string, endOfFile?: boolean): Promise<CometStateDto>;
}
