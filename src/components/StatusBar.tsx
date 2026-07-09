import type { CoreBackendInfo } from "../core/coreBridge";
import { CometState, formatWord } from "../core/types";

function compactInstructionText(text?: string): string | undefined {
  return text?.replace(/\s+/g, " ").trim();
}

export default function StatusBar({ state, backendInfo }: { state: CometState; backendInfo: CoreBackendInfo }) {
  const currentInstruction = compactInstructionText(state.lastStep?.executedInstruction ?? state.currentInstruction) ?? "No active instruction";
  const nextInstruction =
    state.lastStep && state.currentInstruction && compactInstructionText(state.currentInstruction) !== currentInstruction
      ? compactInstructionText(state.currentInstruction)
      : undefined;

  return (
    <footer className="status-bar">
      <span>Machine: <span data-testid="run-state">{state.runState}</span></span>
      <span>Current: {currentInstruction}</span>
      <span>Next PR: {formatWord(state.pr)}</span>
      <span>{nextInstruction ? `Next Instruction: ${nextInstruction}` : "Next Instruction: -"}</span>
      <span data-testid="backend-label" title={backendInfo.errorMessage ?? backendInfo.label}>{backendInfo.label}</span>
      <span>COMET II Simulator</span>
    </footer>
  );
}
