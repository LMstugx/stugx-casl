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

function compactControlFlowSummary(edge: ReturnType<typeof selectCurrentControlFlowEdge> | undefined): string {
  if (!edge) return "Flow: fallthrough";
  const target = edge.targetLabel ?? (edge.toAddress !== undefined ? formatWord(edge.toAddress) : "unresolved");
  if (edge.kind === "unconditional-jump") return `Flow: jump -> ${target}`;
  if (edge.kind === "break") return `Flow: break -> ${target}`;
  if (edge.kind === "continue") return `Flow: continue -> ${target}`;
  if (edge.kind === "loop-back") return `Flow: loop -> ${target}`;
  if (edge.kind === "call") return `Flow: call -> ${target}`;
  return `Flow: ${edge.kind} -> ${target}`;
}

function currentInstructionText(state: CometState): string {
  const latest = state.trace[0];
  if (latest?.instruction === "RET" && state.runState === "Finished") return "Flow: finish";
  return state.currentInstruction ?? state.runState;
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
  const controlFlowSummary = compactControlFlowSummary(currentEdge);
  const controlFlowDetail = currentEdge ? `${currentEdge.sourceText} / ${controlFlowTargetText(currentEdge)}` : "fallthrough";
  const controlFlowNote = currentEdge ? controlFlowMeaning(currentEdge) : "fallthrough";

  return (
    <section className="learning-flow" aria-label="Code Machine Execution">
      <article className="flow-card">
        <span>Code</span>
        <strong>{sourceMode === "cpp" ? "C++ subset" : "CASL II"}</strong>
        <code className="nowrap-symbol" title={codeText}>{codeText}</code>
      </article>
      <div className="flow-arrow" aria-hidden="true">
        &rarr;
      </div>
      <article className="flow-card">
        <span>CASL II Assembly</span>
        <strong>{sourceMode === "cpp" ? "Generated" : "Source"}</strong>
        <code className="nowrap-symbol" title={caslText}>{caslText}</code>
      </article>
      <div className="flow-arrow" aria-hidden="true">
        &rarr;
      </div>
      <article className="flow-card">
        <span>COMET II Machine Code</span>
        <strong>Address / Word</strong>
        <code className="nowrap-symbol" title={currentMachineWords(state, cppToCaslMapping)}>{currentMachineWords(state, cppToCaslMapping)}</code>
      </article>
      <div className="flow-arrow" aria-hidden="true">
        &rarr;
      </div>
      <article className="flow-card control-flow-card" data-testid="learning-flow-control-flow">
        <span>Control Flow</span>
        <strong>{currentEdge ? currentEdge.kind : "fallthrough"}</strong>
        <code className="nowrap-symbol" title={controlFlowDetail}>{controlFlowSummary}</code>
        <small className="secondary-note" title={controlFlowNote}>{controlFlowNote}</small>
      </article>
      <div className="flow-arrow" aria-hidden="true">
        &rarr;
      </div>
      <article className="flow-card now-card">
        <span>Now Executing</span>
        <strong>PC {formatWord(state.pr)}</strong>
        <code className="nowrap-symbol" title={currentInstructionText(state)}>{currentInstructionText(state)}</code>
      </article>
    </section>
  );
}
