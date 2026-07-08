import { CometState, formatWord } from "../core/types";
import { explainMachineCodeRow, selectMachineCodeRows } from "../core/machineCodeRows";
import { controlFlowMeaning, controlFlowTargetText, selectControlFlowForMachineRow, selectControlFlowGraph, selectCurrentControlFlowEdge } from "../core/controlFlowGraph";
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

function currentMachineWords(state: CometState, mapping: CppToCaslMap[]): string {
  const rows = selectMachineCodeRows(state, mapping);
  const current = rows.find((row) => row.isCurrentPr) ?? rows.find((row) => row.isCurrentIr) ?? rows.find((row) => row.address === state.currentAddress);
  if (!current) return "---- : ----";
  const explanation = explainMachineCodeRow(current);
  const register = explanation.register !== undefined ? ` / GR${explanation.register}` : "";
  const operand = explanation.operandAddress !== undefined ? " / operand next word" : "";
  const mnemonic = explanation.mnemonic ?? explanation.wordRole;
  return `${formatWord(current.address)} : ${formatWord(current.word)} | ${mnemonic}${register}${operand}`;
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
  const machineRows = selectMachineCodeRows(state, cppToCaslMapping);
  const controlFlowGraph = selectControlFlowGraph(generatedCaslSource, cppToCaslMapping, machineRows, state);
  const currentMachineRow = machineRows.find((row) => row.isCurrentPr) ?? machineRows.find((row) => row.isCurrentIr) ?? machineRows.find((row) => row.address === state.currentAddress);
  const currentMachineEdge = currentMachineRow ? selectControlFlowForMachineRow(currentMachineRow, controlFlowGraph) : undefined;
  const currentEdge = currentMachineEdge ?? selectCurrentControlFlowEdge(state, controlFlowGraph);
  const controlFlowSummary = currentEdge ? `${currentEdge.sourceText} | ${controlFlowTargetText(currentEdge)}` : "Sequential execution";

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
        <code>{currentMachineWords(state, cppToCaslMapping)}</code>
      </article>
      <div className="flow-arrow" aria-hidden="true">
        &rarr;
      </div>
      <article className="flow-card control-flow-card" data-testid="learning-flow-control-flow">
        <span>Control Flow</span>
        <strong>{currentEdge ? currentEdge.kind : "fallthrough"}</strong>
        <code>{controlFlowSummary}</code>
        <small>{controlFlowMeaning(currentEdge)}</small>
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
