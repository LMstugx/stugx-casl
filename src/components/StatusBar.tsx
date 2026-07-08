import { CometState, formatWord } from "../core/types";

export default function StatusBar({ state }: { state: CometState }) {
  return (
    <footer className="status-bar">
      <span>{state.runState}</span>
      <span>PR {formatWord(state.pr)}</span>
      <span>{state.currentInstruction ?? "No active instruction"}</span>
      <span>COMET II Simulator</span>
    </footer>
  );
}
