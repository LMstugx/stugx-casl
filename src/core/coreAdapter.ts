import type { AssembleResultDto, CometStateDto, StepResultDto } from "./coreDto";

export interface CoreAdapter {
  assemble(sourceText: string): Promise<AssembleResultDto>;
  reset(): Promise<CometStateDto>;
  step(): Promise<StepResultDto>;
  run(maxSteps: number): Promise<CometStateDto>;
  getState(): Promise<CometStateDto>;
}
