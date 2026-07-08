import { word } from "../core/types";
import type {
  CppCondition,
  CppExpression,
  CppProgram,
  CppStatement,
  CppToCaslMap,
  CppToCaslMapKind,
  CppVariableSymbol
} from "./cppAst";
import { hasExplicitReturn, variableLabelMap } from "./cppSemantic";

export interface GenerateCaslResult {
  caslSource: string;
  mapping: CppToCaslMap[];
}

type MappingInput = {
  cppLine: number;
  reason: string;
  kind: CppToCaslMapKind;
};

type PendingLabel = {
  label: string;
  cppLine: number;
  reason: string;
  kind: CppToCaslMapKind;
};

type GeneratedLine = {
  text: string;
  mappings: MappingInput[];
};

type ConstantEntry = {
  label: string;
  value: number;
  cppLine: number;
};

type GeneratorContext = {
  labels: Map<string, string>;
  constants: Map<number, ConstantEntry>;
  usedLabels: Set<string>;
  lines: GeneratedLine[];
  pendingLabels: PendingLabel[];
  nextIfId: number;
  nextLoopId: number;
};

export function generateCaslFromCpp(program: CppProgram, variables: CppVariableSymbol[]): GenerateCaslResult {
  const context: GeneratorContext = {
    labels: variableLabelMap(variables),
    constants: new Map(),
    usedLabels: new Set(["MAIN", ...variables.map((variable) => variable.label)]),
    lines: [{ text: "MAIN START", mappings: [] }],
    pendingLabels: [],
    nextIfId: 0,
    nextLoopId: 0
  };

  emitStatements(context, program.main.body);

  if (!hasExplicitReturn(program.main.body)) {
    emit(context, "     LAD   GR0,0", { cppLine: program.main.line, reason: "implicit return 0", kind: "return" });
    emit(context, "     RET", { cppLine: program.main.line, reason: "return from main", kind: "return" });
  }

  for (const variable of variables) {
    const value = variable.initializer;
    emit(
      context,
      value === undefined ? `${variable.label} DS    1` : `${variable.label} DC    ${formatCaslLiteral(value)}`,
      {
        cppLine: variable.declarationLine,
        reason: value === undefined ? `reserve ${variable.name}` : `initialize ${variable.name}`,
        kind: "declaration"
      }
    );
  }

  for (const constant of context.constants.values()) {
    emit(context, `${constant.label} DC    ${formatCaslLiteral(constant.value)}`, {
      cppLine: constant.cppLine,
      reason: `constant ${constant.value}`,
      kind: "constant"
    });
  }

  emitRaw(context, "     END");

  return {
    caslSource: context.lines.map((line) => line.text).join("\n"),
    mapping: buildMapping(context.lines)
  };
}

function emitStatements(context: GeneratorContext, statements: CppStatement[], branchKind?: "if-then" | "if-else" | "while-body"): void {
  for (const statement of statements) {
    emitStatement(context, statement, branchKind);
  }
}

function emitStatement(context: GeneratorContext, statement: CppStatement, branchKind?: "if-then" | "if-else" | "while-body"): void {
  if (statement.kind === "Assignment") {
    const kind = branchKind ?? "assignment";
    emitExpression(context, statement.expression, "GR1", statement.line, kind);
    emit(context, `     ST    GR1,${context.labels.get(statement.target) ?? statement.target.toUpperCase()}`, {
      cppLine: statement.line,
      reason: `store ${statement.target}`,
      kind
    });
    return;
  }

  if (statement.kind === "Return") {
    const kind = branchKind ?? "return";
    emitExpression(context, statement.expression, "GR0", statement.line, kind);
    emit(context, "     RET", { cppLine: statement.line, reason: "return from main", kind });
    return;
  }

  if (statement.kind === "IfStatement") {
    emitIf(context, statement);
    return;
  }

  if (statement.kind === "WhileStatement") {
    emitWhile(context, statement);
  }
}

function emitIf(context: GeneratorContext, statement: Extract<CppStatement, { kind: "IfStatement" }>): void {
  const id = context.nextIfId;
  context.nextIfId += 1;
  const trueLabel = uniqueLabel(context, `IF_TRUE_${id}`);
  const endLabel = uniqueLabel(context, `IF_END_${id}`);

  if (statement.elseBody) {
    const falseLabel = uniqueLabel(context, `IF_FALSE_${id}`);
    emitConditionJump(context, statement.condition, trueLabel, falseLabel, "if-condition", "if condition");
    emitLabel(context, falseLabel, statement.line, "if false label");
    emitStatements(context, statement.elseBody, "if-else");
    emit(context, `     JUMP  ${endLabel}`, { cppLine: statement.line, reason: "skip then branch", kind: "if-else" });
    emitLabel(context, trueLabel, statement.line, "if true label");
    emitStatements(context, statement.thenBody, "if-then");
    emitLabel(context, endLabel, statement.line, "if end label");
    return;
  }

  emitConditionJump(context, statement.condition, trueLabel, endLabel, "if-condition", "if condition");
  emitLabel(context, trueLabel, statement.line, "if true label");
  emitStatements(context, statement.thenBody, "if-then");
  emitLabel(context, endLabel, statement.line, "if end label");
}

function emitWhile(context: GeneratorContext, statement: Extract<CppStatement, { kind: "WhileStatement" }>): void {
  const id = context.nextLoopId;
  context.nextLoopId += 1;
  const beginLabel = uniqueLabel(context, `LOOP_BEGIN_${id}`);
  const bodyLabel = uniqueLabel(context, `LOOP_BODY_${id}`);
  const endLabel = uniqueLabel(context, `LOOP_END_${id}`);

  emitLabel(context, beginLabel, statement.line, "loop begin label", "loop-label");
  emitConditionJump(context, statement.condition, bodyLabel, endLabel, "while-condition", "while condition");
  emitLabel(context, bodyLabel, statement.line, "loop body label", "loop-label");
  emitStatements(context, statement.body, "while-body");
  emit(context, `     JUMP  ${beginLabel}`, { cppLine: statement.line, reason: "repeat while loop", kind: "loop-back-jump" });
  emitLabel(context, endLabel, statement.line, "loop end label", "loop-label");
}

function emitConditionJump(
  context: GeneratorContext,
  condition: CppCondition,
  trueLabel: string,
  falseLabel: string,
  kind: "if-condition" | "while-condition",
  reasonPrefix: "if condition" | "while condition"
): void {
  emitExpression(context, condition.left, "GR1", condition.line, kind);
  const rightOperand = operandForExpression(context, condition.right, condition.line);
  emit(context, `     CPA   GR1,${rightOperand}`, { cppLine: condition.line, reason: `compare ${reasonPrefix}`, kind });

  for (const jump of trueJumpsForCondition(condition.operator)) {
    emit(context, `     ${jump.padEnd(5, " ")} ${trueLabel}`, {
      cppLine: condition.line,
      reason: `branch if ${condition.operator}`,
      kind
    });
  }
  emit(context, `     JUMP  ${falseLabel}`, { cppLine: condition.line, reason: `branch if ${condition.operator} is false`, kind });
}

function trueJumpsForCondition(operator: CppCondition["operator"]): string[] {
  switch (operator) {
    case "==":
      return ["JZE"];
    case "!=":
      return ["JNZ"];
    case "<":
      return ["JMI"];
    case ">":
      return ["JPL"];
    case "<=":
      return ["JMI", "JZE"];
    case ">=":
      return ["JPL", "JZE"];
  }
}

function emitExpression(
  context: GeneratorContext,
  expression: CppExpression,
  targetRegister: "GR0" | "GR1",
  cppLine: number,
  kind: CppToCaslMapKind
): void {
  if (expression.kind === "IntegerLiteral") {
    emit(context, `     LAD   ${targetRegister},${formatCaslLiteral(expression.value)}`, { cppLine, reason: "load integer literal", kind });
    return;
  }

  if (expression.kind === "Identifier") {
    emit(context, `     LD    ${targetRegister},${context.labels.get(expression.name) ?? expression.name.toUpperCase()}`, {
      cppLine,
      reason: `load ${expression.name}`,
      kind
    });
    return;
  }

  emitExpression(context, expression.left, targetRegister, cppLine, kind);
  const rightOperand = operandForExpression(context, expression.right, cppLine);
  const op = expression.operator === "+" ? "ADDA" : "SUBA";
  emit(context, `     ${op.padEnd(5, " ")} ${targetRegister},${rightOperand}`, {
    cppLine,
    reason: expression.operator === "+" ? "add expression" : "subtract expression",
    kind
  });
}

function operandForExpression(context: GeneratorContext, expression: CppExpression, cppLine: number): string {
  if (expression.kind === "Identifier") return context.labels.get(expression.name) ?? expression.name.toUpperCase();
  if (expression.kind === "IntegerLiteral") return constantLabel(context, expression.value, cppLine);
  throw new Error("Nested binary right-hand expressions are not supported by the C++ subset generator.");
}

function constantLabel(context: GeneratorContext, value: number, cppLine: number): string {
  const existing = context.constants.get(value);
  if (existing) return existing.label;
  const base = value < 0 ? `CONST_M${Math.abs(value)}` : `CONST_${value}`;
  const label = uniqueLabel(context, base);
  context.constants.set(value, { label, value, cppLine });
  return label;
}

function uniqueLabel(context: GeneratorContext, base: string): string {
  let label = base;
  let suffix = 2;
  while (context.usedLabels.has(label)) {
    label = `${base}_${suffix}`;
    suffix += 1;
  }
  context.usedLabels.add(label);
  return label;
}

function emitLabel(context: GeneratorContext, label: string, cppLine: number, reason: string, kind: CppToCaslMapKind = "generated-label"): void {
  context.pendingLabels.push({ label, cppLine, reason, kind });
}

function emit(context: GeneratorContext, text: string, mapping: MappingInput): void {
  const mappings = [mapping];
  const finalText = applyPendingLabels(context, text, mappings);
  context.lines.push({ text: finalText, mappings });
}

function emitRaw(context: GeneratorContext, text: string): void {
  const mappings: MappingInput[] = [];
  const finalText = applyPendingLabels(context, text, mappings);
  context.lines.push({ text: finalText, mappings });
}

function applyPendingLabels(context: GeneratorContext, text: string, mappings: MappingInput[]): string {
  if (context.pendingLabels.length === 0) return text;
  const labels = context.pendingLabels.splice(0);
  for (const label of labels) {
    mappings.push({ cppLine: label.cppLine, reason: label.reason, kind: label.kind });
  }
  return `${labels.map((label) => label.label).join(" ")} ${text.trimStart()}`;
}

function formatCaslLiteral(value: number): string {
  if (value < 0) return `#${word(value).toString(16).toUpperCase().padStart(4, "0")}`;
  return String(value);
}

function buildMapping(lines: GeneratedLine[]): CppToCaslMap[] {
  const map = new Map<string, CppToCaslMap>();
  lines.forEach((line, index) => {
    for (const mapping of line.mappings) {
      const key = `${mapping.cppLine}:${mapping.kind}:${mapping.reason}`;
      const existing = map.get(key);
      if (existing) {
        existing.caslLines.push(index + 1);
        continue;
      }
      map.set(key, { cppLine: mapping.cppLine, caslLines: [index + 1], reason: mapping.reason, kind: mapping.kind });
    }
  });
  return [...map.values()];
}
