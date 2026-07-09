import type { CppToCaslMap, CppToCaslMapKind } from "../transpiler/cppAst";
import { cppLineForCaslLine, mappingKindsForCaslLine } from "../transpiler/cppMapping";
import type { CometState, InstructionKind } from "./types";
import { formatWord } from "./types";
import { selectGeneratedCaslRows, type GeneratedCaslRow } from "./generatedCaslRows";
import type { MachineCodeRow } from "./machineCodeRows";

export type ControlFlowEdgeKind =
  | "unconditional-jump"
  | "conditional-true"
  | "conditional-false"
  | "fallthrough"
  | "loop-back"
  | "break"
  | "continue";

export type ControlFlowLabelKind = "if-label" | "loop-label" | "for-label" | "continue-label" | "end-label" | "user-label";

export type ControlFlowEdge = {
  id: string;
  fromCaslLine: number;
  toCaslLine: number | null;
  fromAddress?: number;
  toAddress?: number;
  kind: ControlFlowEdgeKind;
  sourceText: string;
  targetLabel?: string;
  relatedCppLine?: number;
  isTaken?: boolean;
  isCurrent?: boolean;
};

export type ControlFlowLabel = {
  label: string;
  caslLine: number;
  address?: number;
  kind: ControlFlowLabelKind;
  relatedCppLine?: number;
};

export type ControlFlowGraph = {
  labels: ControlFlowLabel[];
  edges: ControlFlowEdge[];
};

const JUMP_INSTRUCTIONS = new Set<InstructionKind>(["JUMP", "JZE", "JNZ", "JPL", "JMI", "JOV"]);

export function selectControlFlowGraph(
  generatedCaslSource: string,
  mapping: CppToCaslMap[] = [],
  machineRows: MachineCodeRow[] = [],
  state?: CometState
): ControlFlowGraph {
  const generatedRows = selectGeneratedCaslRows(generatedCaslSource, mapping);
  const labels = selectControlFlowLabels(generatedRows, mapping, machineRows);
  const labelByName = new Map(labels.map((label) => [label.label, label]));
  const machineByCaslLine = firstInstructionAddressByCaslLine(machineRows);
  const edges: ControlFlowEdge[] = [];

  for (const row of generatedRows) {
    if (!isJumpOpcode(row.opcode)) continue;
    const mappingKinds = new Set<CppToCaslMapKind>(row.mappingKinds);
    const fromAddress = machineByCaslLine.get(row.lineNumber);
    const targetLabel = jumpTargetLabel(row);
    const target = targetLabel ? labelByName.get(targetLabel) : undefined;
    const baseEdge = makeEdge({
      row,
      mapping,
      state,
      fromAddress,
      target,
      targetLabel,
      kind: jumpEdgeKind(row, mappingKinds, targetLabel)
    });
    edges.push(baseEdge);

    if (row.opcode !== "JUMP") {
      const falseTarget = nextExecutableRow(generatedRows, row.lineNumber, machineByCaslLine);
      edges.push(makeEdge({
        row,
        mapping,
        state,
        fromAddress,
        target: falseTarget
          ? {
              caslLine: falseTarget.lineNumber,
              address: machineByCaslLine.get(falseTarget.lineNumber)
            }
          : undefined,
        targetLabel: undefined,
        kind: "conditional-false",
        suffix: "false"
      }));
    }
  }

  return { labels, edges };
}

export function selectControlFlowForMachineRow(row: MachineCodeRow, graph: ControlFlowGraph): ControlFlowEdge | undefined {
  if (row.kind !== "instruction") return undefined;
  return graph.edges.find((edge) => edge.fromAddress === row.address && edge.kind !== "conditional-false") ?? graph.edges.find((edge) => edge.fromCaslLine === row.relatedCaslLine);
}

export function selectCurrentControlFlowEdge(state: CometState, graph: ControlFlowGraph): ControlFlowEdge | undefined {
  const executedAddress = state.lastStep?.executedAddress ?? state.currentAddress ?? state.pr;
  return graph.edges.find((edge) => edge.fromAddress === executedAddress && edge.isCurrent) ?? graph.edges.find((edge) => edge.fromAddress === executedAddress);
}

export function controlFlowLabelBadge(label?: ControlFlowLabel): string {
  if (!label) return "";
  if (label.kind === "if-label") return "IF";
  if (label.kind === "loop-label") return "LOOP";
  if (label.kind === "for-label") return "FOR";
  if (label.kind === "continue-label") return "CONTINUE";
  if (label.kind === "end-label") return "END";
  return "USER";
}

export function controlFlowEdgeLabel(edge?: ControlFlowEdge): string {
  if (!edge) return "";
  const target = edge.targetLabel ?? (edge.toAddress !== undefined ? formatWord(edge.toAddress) : "next");
  if (edge.kind === "break") return `break -> ${target}`;
  if (edge.kind === "continue") return `continue -> ${target}`;
  if (edge.kind === "loop-back") return `loop back -> ${target}`;
  if (edge.kind === "conditional-true") return `true -> ${target}`;
  if (edge.kind === "conditional-false") return `false -> ${edge.toAddress !== undefined ? formatWord(edge.toAddress) : "next"}`;
  return `jump -> ${target}`;
}

export function controlFlowTargetText(edge?: ControlFlowEdge): string {
  if (!edge) return "";
  if (!edge.targetLabel && edge.toAddress === undefined && edge.toCaslLine === null) return "unresolved";
  const parts = [];
  if (edge.targetLabel) parts.push(edge.targetLabel);
  if (edge.toCaslLine !== null) parts.push(`line ${edge.toCaslLine}`);
  if (edge.toAddress !== undefined) parts.push(`addr ${formatWord(edge.toAddress)}`);
  return parts.join(" / ") || "next instruction";
}

export function controlFlowMeaning(edge?: ControlFlowEdge): string {
  if (!edge) return "Sequential execution.";
  const target = controlFlowTargetText(edge);
  if (edge.kind === "break") return `Break statement jumps to loop exit: ${target}.`;
  if (edge.kind === "continue") return `Continue statement jumps to the loop continue target: ${target}.`;
  if (edge.kind === "loop-back") return `Loop back jump returns control to ${target}.`;
  if (edge.kind === "conditional-true") return `Conditional jump target: ${target}.`;
  if (edge.kind === "conditional-false") return `Condition not met; execution falls through to ${target}.`;
  return `Unconditional jump target: ${target}.`;
}

function selectControlFlowLabels(generatedRows: GeneratedCaslRow[], mapping: CppToCaslMap[], machineRows: MachineCodeRow[]): ControlFlowLabel[] {
  const machineByCaslLine = firstInstructionAddressByCaslLine(machineRows);
  return generatedRows
    .filter((row) => row.label)
    .map((row) => ({
      label: row.label,
      caslLine: row.lineNumber,
      address: machineByCaslLine.get(row.lineNumber),
      kind: labelKind(row.label),
      relatedCppLine: cppLineForCaslLine(mapping, row.lineNumber)
    }));
}

function labelKind(label: string): ControlFlowLabelKind {
  if (/^IF_END_/i.test(label) || /^LOOP_END_/i.test(label) || /^FOR_END_/i.test(label)) return "end-label";
  if (/^IF_/i.test(label)) return "if-label";
  if (/^LOOP_/i.test(label)) return "loop-label";
  if (/^FOR_CONTINUE_/i.test(label)) return "continue-label";
  if (/^FOR_/i.test(label)) return "for-label";
  return "user-label";
}

function firstInstructionAddressByCaslLine(machineRows: MachineCodeRow[]): Map<number, number> {
  const result = new Map<number, number>();
  for (const row of machineRows) {
    if (row.relatedCaslLine === undefined || row.kind !== "instruction") continue;
    if (!result.has(row.relatedCaslLine)) result.set(row.relatedCaslLine, row.address);
  }
  return result;
}

function isJumpOpcode(opcode: string): opcode is "JUMP" | "JZE" | "JNZ" | "JPL" | "JMI" | "JOV" {
  return JUMP_INSTRUCTIONS.has(opcode as InstructionKind);
}

function jumpTargetLabel(row: GeneratedCaslRow): string | undefined {
  return row.operand.split(/[,\s]+/).find(Boolean)?.toUpperCase();
}

function jumpEdgeKind(row: GeneratedCaslRow, mappingKinds: Set<CppToCaslMapKind>, targetLabel?: string): ControlFlowEdgeKind {
  if (mappingKinds.has("break-statement")) return "break";
  if (mappingKinds.has("continue-statement")) return "continue";
  if (row.opcode !== "JUMP") return "conditional-true";
  if (targetLabel && /^(LOOP_BEGIN|FOR_BEGIN)_/i.test(targetLabel)) return "loop-back";
  return "unconditional-jump";
}

function makeEdge({
  row,
  mapping,
  state,
  fromAddress,
  target,
  targetLabel,
  kind,
  suffix = kind
}: {
  row: GeneratedCaslRow;
  mapping: CppToCaslMap[];
  state?: CometState;
  fromAddress?: number;
  target?: Pick<ControlFlowLabel, "caslLine" | "address">;
  targetLabel?: string;
  kind: ControlFlowEdgeKind;
  suffix?: string;
}): ControlFlowEdge {
  const isCurrent = fromAddress !== undefined && state?.lastStep?.executedAddress === fromAddress;
  const isTaken = isCurrent ? state?.pr === target?.address : undefined;
  return {
    id: `${row.lineNumber}-${suffix}-${targetLabel ?? target?.caslLine ?? "unresolved"}`,
    fromCaslLine: row.lineNumber,
    toCaslLine: target?.caslLine ?? null,
    fromAddress,
    toAddress: target?.address,
    kind,
    sourceText: row.raw.trim(),
    targetLabel,
    relatedCppLine: cppLineForCaslLine(mapping, row.lineNumber),
    isTaken,
    isCurrent
  };
}

function nextExecutableRow(generatedRows: GeneratedCaslRow[], currentLine: number, machineByCaslLine: Map<number, number>): GeneratedCaslRow | undefined {
  return generatedRows.find((row) => row.lineNumber > currentLine && machineByCaslLine.has(row.lineNumber));
}
