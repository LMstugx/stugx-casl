import { CometState, formatWord } from "../core/types";
import type { SourceMode } from "../store/useAppStore";
import type { CppToCaslMap } from "../transpiler/cppAst";
import { cppLineForCaslLine } from "../transpiler/cppMapping";

type LearningFlowPanelProps = {
  state: CometState;
  sourceMode: SourceMode;
  sourceText: string;
  generatedCaslSource: string;
  cppToCaslMapping: CppToCaslMap[];
};

function sourceLineText(sourceText: string, line?: number): string {
  if (!line) return "No active source line";
  return sourceText.split(/\r?\n/)[line - 1]?.trim() || "No active source line";
}

function generatedCaslLine(generatedCaslSource: string, line?: number): string {
  if (!line) return "No generated CASL line";
  return generatedCaslSource.split(/\r?\n/)[line - 1]?.trim() || "No generated CASL line";
}

function currentMachineWords(state: CometState): string {
  const entry = state.sourceMap.find((row) => row.line === state.currentLine || row.address === state.currentAddress);
  if (!entry) return "---- : ----";
  return `${formatWord(entry.address)} : ${entry.machineWords.map((word) => formatWord(word)).join(" ")}`;
}

export default function LearningFlowPanel({
  state,
  sourceMode,
  sourceText,
  generatedCaslSource,
  cppToCaslMapping,
}: LearningFlowPanelProps) {
  const cppLine = sourceMode === "cpp" ? cppLineForCaslLine(cppToCaslMapping, state.currentLine) : state.currentLine;
  const codeText = sourceMode === "cpp" ? sourceLineText(sourceText, cppLine) : sourceLineText(sourceText, state.currentLine);
  const caslText = sourceMode === "cpp" ? generatedCaslLine(generatedCaslSource, state.currentLine) : state.currentInstruction ?? codeText;

  return (
    <section className="learning-flow" aria-label="Code Machine Execution">
      <article className="flow-card">
        <span>Code</span>
        <strong>{sourceMode === "cpp" ? "C++ subset" : "CASL II"}</strong>
        <code>{codeText}</code>
      </article>
      <div className="flow-arrow" aria-hidden="true">
        &rarr;
      </div>
      <article className="flow-card">
        <span>CASL II Assembly</span>
        <strong>{sourceMode === "cpp" ? "Generated" : "Source"}</strong>
        <code>{caslText}</code>
      </article>
      <div className="flow-arrow" aria-hidden="true">
        &rarr;
      </div>
      <article className="flow-card">
        <span>COMET II Machine Code</span>
        <strong>Address / Word</strong>
        <code>{currentMachineWords(state)}</code>
      </article>
      <div className="flow-arrow" aria-hidden="true">
        &rarr;
      </div>
      <article className="flow-card now-card">
        <span>Now Executing</span>
        <strong>PC {formatWord(state.pr)}</strong>
        <code>{state.currentInstruction ?? state.runState}</code>
      </article>
    </section>
  );
}
