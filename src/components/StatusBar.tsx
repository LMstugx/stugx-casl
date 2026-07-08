import type { CoreBackendInfo } from "../core/coreBridge";
import { CometState, formatWord } from "../core/types";

export default function StatusBar({ state, backendInfo }: { state: CometState; backendInfo: CoreBackendInfo }) {
  return (
    <footer className="status-bar">
      <span data-testid="run-state">{state.runState}</span>
      <span>PR {formatWord(state.pr)}</span>
      <span>{state.currentInstruction ?? "No active instruction"}</span>
      <span data-testid="backend-label" title={backendInfo.errorMessage ?? backendInfo.label}>{backendInfo.label}</span>
      <span>COMET II Simulator</span>
    </footer>
  );
}
