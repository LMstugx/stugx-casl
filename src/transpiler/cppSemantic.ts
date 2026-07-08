import type { Diagnostic } from "../core/types";
import type { CppAssignment, CppCondition, CppExpression, CppProgram, CppStatement, CppVarDecl, CppVariableSymbol, SemanticResult } from "./cppAst";

const INT16_MIN = -32768;
const INT16_MAX = 32767;
const reservedLabels = new Set([
  "MAIN",
  "START",
  "END",
  "DC",
  "DS",
  "LD",
  "LAD",
  "ADDA",
  "SUBA",
  "CPA",
  "ST",
  "JUMP",
  "JZE",
  "JNZ",
  "JPL",
  "JMI",
  "RET"
]);

export function checkCppSemantics(program: CppProgram | null, parseDiagnostics: Diagnostic[] = []): SemanticResult {
  const diagnostics = [...parseDiagnostics];
  const variables = new Map<string, CppVariableSymbol>();
  const usedLabels = new Set<string>(["MAIN"]);

  if (!program) {
    return { ok: false, diagnostics, variables: [] };
  }

  validateStatements(program.main.body, variables, usedLabels, diagnostics);

  return { ok: diagnostics.every((diagnostic) => diagnostic.severity !== "error"), diagnostics, variables: [...variables.values()] };
}

function validateStatements(statements: CppStatement[], variables: Map<string, CppVariableSymbol>, usedLabels: Set<string>, diagnostics: Diagnostic[], loopDepth = 0): void {
  for (const statement of statements) {
    if (statement.kind === "VarDecl") {
      validateVarDecl(statement, variables, usedLabels, diagnostics, true);
      continue;
    }

    if (statement.kind === "Assignment") {
      validateAssignment(statement, variables, diagnostics);
      continue;
    }

    if (statement.kind === "Return") {
      validateExpression(statement.expression, variables, diagnostics);
      continue;
    }

    if (statement.kind === "IfStatement") {
      validateCondition(statement.condition, variables, diagnostics);
      validateStatements(statement.thenBody, variables, usedLabels, diagnostics, loopDepth);
      if (statement.elseBody) validateStatements(statement.elseBody, variables, usedLabels, diagnostics, loopDepth);
      continue;
    }

    if (statement.kind === "WhileStatement") {
      validateCondition(statement.condition, variables, diagnostics);
      validateStatements(statement.body, variables, usedLabels, diagnostics, loopDepth + 1);
      continue;
    }

    if (statement.kind === "ForStatement") {
      if (statement.initializer?.kind === "VarDecl") {
        validateVarDecl(statement.initializer, variables, usedLabels, diagnostics, false);
      } else if (statement.initializer?.kind === "Assignment") {
        validateAssignment(statement.initializer, variables, diagnostics);
      }

      if (!statement.condition) {
        diagnostics.push({ line: statement.line, message: "for without condition is not supported yet", severity: "error" });
      } else {
        validateCondition(statement.condition, variables, diagnostics);
      }

      if (statement.increment) {
        validateAssignment(statement.increment, variables, diagnostics);
        validateForIncrement(statement.increment, variables, diagnostics);
      }
      validateStatements(statement.body, variables, usedLabels, diagnostics, loopDepth + 1);
      continue;
    }

    if (statement.kind === "BreakStatement") {
      if (loopDepth === 0) diagnostics.push({ line: statement.line, message: "break is only supported inside a loop", severity: "error" });
      continue;
    }

    if (statement.kind === "ContinueStatement") {
      if (loopDepth === 0) diagnostics.push({ line: statement.line, message: "continue is only supported inside a loop", severity: "error" });
    }
  }
}

function validateVarDecl(
  statement: CppVarDecl,
  variables: Map<string, CppVariableSymbol>,
  usedLabels: Set<string>,
  diagnostics: Diagnostic[],
  storeLiteralInitializer: boolean
): void {
  if (variables.has(statement.name)) {
    diagnostics.push({ line: statement.line, message: `Duplicate variable declaration: ${statement.name}`, severity: "error" });
    return;
  }
  const initializer = statement.initializer;
  if (initializer && initializer.kind !== "IntegerLiteral") {
    diagnostics.push({
      line: statement.line,
      message: "Variable initializers in the current C++ subset must be integer literals.",
      severity: "error"
    });
  }
  if (initializer?.kind === "IntegerLiteral") validateIntegerLiteral(initializer.value, initializer.line, diagnostics);
  variables.set(statement.name, {
    name: statement.name,
    label: makeSafeLabel(statement.name, usedLabels),
    declarationLine: statement.line,
    initializer: storeLiteralInitializer && initializer?.kind === "IntegerLiteral" ? initializer.value : undefined
  });
}

function validateAssignment(statement: CppAssignment, variables: Map<string, CppVariableSymbol>, diagnostics: Diagnostic[]): void {
  if (!variables.has(statement.target)) {
    diagnostics.push({ line: statement.line, message: `Assignment target '${statement.target}' is not declared.`, severity: "error" });
  }
  validateExpression(statement.expression, variables, diagnostics);
  if (statement.loweredFrom === "compound-assignment") validateCompoundAssignment(statement, diagnostics);
}

function validateCompoundAssignment(statement: CppAssignment, diagnostics: Diagnostic[]): void {
  const expression = statement.expression;
  if (expression.kind !== "BinaryExpression" || expression.left.kind !== "Identifier" || expression.left.name !== statement.target) {
    diagnostics.push({
      line: statement.line,
      message: "Current C++ subset supports compound assignment only as i += step or i -= step.",
      severity: "error"
    });
    return;
  }
  if (expression.right.kind !== "Identifier" && expression.right.kind !== "IntegerLiteral") {
    diagnostics.push({
      line: statement.line,
      message: "Current C++ subset supports compound assignment step only as integer literal or declared variable.",
      severity: "error"
    });
  }
}

function validateForIncrement(statement: CppAssignment, variables: Map<string, CppVariableSymbol>, diagnostics: Diagnostic[]): void {
  const expression = statement.expression;
  if (expression.kind !== "BinaryExpression" || expression.left.kind !== "Identifier" || expression.left.name !== statement.target) {
    diagnostics.push({
      line: statement.line,
      message: "Current C++ subset supports for increment only as i = i + step or i = i - step.",
      severity: "error"
    });
    return;
  }
  if (expression.right.kind !== "Identifier" && expression.right.kind !== "IntegerLiteral") {
    diagnostics.push({
      line: statement.line,
      message: "Current C++ subset supports for increment step only as integer literal or declared variable.",
      severity: "error"
    });
    return;
  }
  if (expression.right.kind === "Identifier" && !variables.has(expression.right.name)) {
    diagnostics.push({ line: expression.right.line, message: `Variable '${expression.right.name}' is used before declaration.`, severity: "error" });
  }
}

function validateExpression(expression: CppExpression, variables: Map<string, CppVariableSymbol>, diagnostics: Diagnostic[]): void {
  if (expression.kind === "Identifier") {
    if (!variables.has(expression.name)) {
      diagnostics.push({ line: expression.line, message: `Variable '${expression.name}' is used before declaration.`, severity: "error" });
    }
    return;
  }

  if (expression.kind === "IntegerLiteral") {
    validateIntegerLiteral(expression.value, expression.line, diagnostics);
    return;
  }

  validateExpression(expression.left, variables, diagnostics);
  validateExpression(expression.right, variables, diagnostics);
}

function validateCondition(condition: CppCondition, variables: Map<string, CppVariableSymbol>, diagnostics: Diagnostic[]): void {
  if (condition.left.kind === "BinaryExpression" || condition.right.kind === "BinaryExpression") {
    diagnostics.push({ line: condition.line, message: "Current C++ subset if conditions support only identifiers and integer literals.", severity: "error" });
    return;
  }

  validateExpression(condition.left, variables, diagnostics);
  validateExpression(condition.right, variables, diagnostics);
}

function validateIntegerLiteral(value: number, line: number, diagnostics: Diagnostic[]): void {
  if (!Number.isInteger(value) || value < INT16_MIN || value > INT16_MAX) {
    diagnostics.push({ line, message: `Integer literal ${value} is outside the supported signed 16-bit range.`, severity: "error" });
  }
}

function makeSafeLabel(name: string, usedLabels: Set<string>): string {
  let base = name.toUpperCase().replace(/[^A-Z0-9_]/g, "_");
  if (!/^[A-Z]/.test(base)) base = `VAR_${base}`;
  if (reservedLabels.has(base)) base = `VAR_${base}`;
  let label = base;
  let suffix = 2;
  while (usedLabels.has(label)) {
    label = `${base}_${suffix}`;
    suffix += 1;
  }
  usedLabels.add(label);
  return label;
}

export function variableLabelMap(variables: CppVariableSymbol[]): Map<string, string> {
  return new Map(variables.map((variable) => [variable.name, variable.label]));
}

export function hasExplicitReturn(statements: CppStatement[]): boolean {
  return statements.some((statement) => statement.kind === "Return");
}
