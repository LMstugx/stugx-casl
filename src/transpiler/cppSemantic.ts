import type { Diagnostic } from "../core/types";
import type { CppExpression, CppProgram, CppStatement, CppVariableSymbol, SemanticResult } from "./cppAst";

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

  for (const statement of program.main.body) {
    if (statement.kind === "VarDecl") {
      if (variables.has(statement.name)) {
        diagnostics.push({ line: statement.line, message: `Duplicate variable declaration: ${statement.name}`, severity: "error" });
        continue;
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
        initializer: initializer?.kind === "IntegerLiteral" ? initializer.value : undefined
      });
      continue;
    }

    if (statement.kind === "Assignment") {
      if (!variables.has(statement.target)) {
        diagnostics.push({ line: statement.line, message: `Assignment target '${statement.target}' is not declared.`, severity: "error" });
      }
      validateExpression(statement.expression, variables, diagnostics);
      continue;
    }

    if (statement.kind === "Return") {
      validateExpression(statement.expression, variables, diagnostics);
    }
  }

  return { ok: diagnostics.every((diagnostic) => diagnostic.severity !== "error"), diagnostics, variables: [...variables.values()] };
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
