import type { CppToCaslMap, CppToCaslMapKind } from "../transpiler/cppAst";
import { cppLineForCaslLine, mappingKindsForCaslLine } from "../transpiler/cppMapping";

export type GeneratedCaslRow = {
  lineNumber: number;
  raw: string;
  label: string;
  opcode: string;
  operand: string;
  mappingKinds: CppToCaslMapKind[];
  relatedCppLine?: number;
  isCurrent: boolean;
  isRelated: boolean;
  isGeneratedMeta: boolean;
};

export function selectGeneratedCaslRows(source: string, mapping: CppToCaslMap[] = [], currentCaslLine?: number, currentCppLine?: number): GeneratedCaslRow[] {
  const relatedCaslLines = new Set(mapping.filter((entry) => currentCppLine !== undefined && entry.cppLine === currentCppLine).flatMap((entry) => entry.caslLines));
  return source.split(/\r?\n/).map((raw, index) => {
    const lineNumber = index + 1;
    const parsed = parseCaslLine(raw);
    const mappingKinds = Array.from(mappingKindsForCaslLine(mapping, lineNumber));
    const isGeneratedMeta =
      mappingKinds.includes("generated-label") ||
      mappingKinds.includes("loop-label") ||
      mappingKinds.includes("loop-back-jump") ||
      mappingKinds.includes("loop-continue-label") ||
      mappingKinds.includes("for-label") ||
      mappingKinds.includes("for-back-jump") ||
      mappingKinds.includes("function-label") ||
      mappingKinds.includes("constant");
    return {
      lineNumber,
      raw,
      ...parsed,
      mappingKinds,
      relatedCppLine: cppLineForCaslLine(mapping, lineNumber),
      isCurrent: currentCaslLine === lineNumber,
      isRelated: relatedCaslLines.has(lineNumber),
      isGeneratedMeta
    };
  });
}

function parseCaslLine(raw: string): Pick<GeneratedCaslRow, "label" | "opcode" | "operand"> {
  const line = raw.trim();
  if (!line) return { label: "", opcode: "", operand: "" };

  const match = /^(\S+)?\s*(START|END|DC|DS|NOP|LD|LAD|ADDA|SUBA|ADDL|SUBL|AND|OR|XOR|CPA|CPL|SLA|SRA|SLL|SRL|PUSH|POP|CALL|ST|JUMP|JZE|JNZ|JPL|JMI|JOV|RET)\b\s*(.*)$/i.exec(line);
  if (!match) return { label: "", opcode: "", operand: line };

  const maybeLabel = match[1] ?? "";
  const opcode = (match[2] ?? "").toUpperCase();
  const operand = (match[3] ?? "").trim();
  const lineStartsWithOpcode = line.toUpperCase().startsWith(opcode);
  return {
    label: lineStartsWithOpcode ? "" : maybeLabel,
    opcode,
    operand
  };
}
