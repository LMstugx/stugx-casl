import { word } from "../core/types";
import type { CppExpression, CppProgram, CppStatement, CppToCaslMap, CppVariableSymbol } from "./cppAst";
import { hasExplicitReturn, variableLabelMap } from "./cppSemantic";

export interface GenerateCaslResult {
  caslSource: string;
  mapping: CppToCaslMap[];
}

type GeneratedLine = {
  text: string;
  cppLine?: number;
  reason?: string;
};

export function generateCaslFromCpp(program: CppProgram, variables: CppVariableSymbol[]): GenerateCaslResult {
  const labels = variableLabelMap(variables);
  const constants = new Map<number, string>();
  const lines: GeneratedLine[] = [{ text: "MAIN START" }];

  for (const statement of program.main.body) {
    if (statement.kind === "Assignment") {
      emitExpression(lines, statement.expression, "GR1", labels, constants, statement.line);
      emit(lines, `     ST    GR1,${labels.get(statement.target) ?? statement.target.toUpperCase()}`, statement.line, `store ${statement.target}`);
      continue;
    }

    if (statement.kind === "Return") {
      emitExpression(lines, statement.expression, "GR0", labels, constants, statement.line);
      emit(lines, "     RET", statement.line, "return from main");
    }
  }

  if (!hasExplicitReturn(program.main.body)) {
    emit(lines, "     LAD   GR0,0", program.main.line, "implicit return 0");
    emit(lines, "     RET", program.main.line, "return from main");
  }

  for (const variable of variables) {
    const value = variable.initializer;
    emit(
      lines,
      value === undefined ? `${variable.label} DS    1` : `${variable.label} DC    ${formatCaslLiteral(value)}`,
      variable.declarationLine,
      value === undefined ? `reserve ${variable.name}` : `initialize ${variable.name}`
    );
  }

  for (const [value, label] of constants) {
    lines.push({ text: `${label} DC    ${formatCaslLiteral(value)}` });
  }

  lines.push({ text: "     END" });

  return {
    caslSource: lines.map((line) => line.text).join("\n"),
    mapping: buildMapping(lines)
  };
}

function emit(lines: GeneratedLine[], text: string, cppLine: number, reason: string): void {
  lines.push({ text, cppLine, reason });
}

function emitExpression(
  lines: GeneratedLine[],
  expression: CppExpression,
  targetRegister: "GR0" | "GR1",
  labels: Map<string, string>,
  constants: Map<number, string>,
  cppLine: number
): void {
  if (expression.kind === "IntegerLiteral") {
    emit(lines, `     LAD   ${targetRegister},${formatCaslLiteral(expression.value)}`, cppLine, "load integer literal");
    return;
  }

  if (expression.kind === "Identifier") {
    emit(lines, `     LD    ${targetRegister},${labels.get(expression.name) ?? expression.name.toUpperCase()}`, cppLine, `load ${expression.name}`);
    return;
  }

  emitExpression(lines, expression.left, targetRegister, labels, constants, cppLine);
  const rightOperand = operandForExpression(expression.right, labels, constants);
  const op = expression.operator === "+" ? "ADDA" : "SUBA";
  emit(lines, `     ${op.padEnd(5, " ")} ${targetRegister},${rightOperand}`, cppLine, expression.operator === "+" ? "add expression" : "subtract expression");
}

function operandForExpression(expression: CppExpression, labels: Map<string, string>, constants: Map<number, string>): string {
  if (expression.kind === "Identifier") return labels.get(expression.name) ?? expression.name.toUpperCase();
  if (expression.kind === "IntegerLiteral") return constantLabel(expression.value, constants);
  throw new Error("Nested binary right-hand expressions are not supported by the C++ subset generator.");
}

function constantLabel(value: number, constants: Map<number, string>): string {
  const existing = constants.get(value);
  if (existing) return existing;
  const base = value < 0 ? `CONST_M${Math.abs(value)}` : `CONST_${value}`;
  let label = base;
  let suffix = 2;
  while ([...constants.values()].includes(label)) {
    label = `${base}_${suffix}`;
    suffix += 1;
  }
  constants.set(value, label);
  return label;
}

function formatCaslLiteral(value: number): string {
  if (value < 0) return `#${word(value).toString(16).toUpperCase().padStart(4, "0")}`;
  return String(value);
}

function buildMapping(lines: GeneratedLine[]): CppToCaslMap[] {
  const map = new Map<string, CppToCaslMap>();
  lines.forEach((line, index) => {
    if (line.cppLine === undefined || line.reason === undefined) return;
    const key = `${line.cppLine}:${line.reason}`;
    const existing = map.get(key);
    if (existing) {
      existing.caslLines.push(index + 1);
      return;
    }
    map.set(key, { cppLine: line.cppLine, caslLines: [index + 1], reason: line.reason });
  });
  return [...map.values()];
}
