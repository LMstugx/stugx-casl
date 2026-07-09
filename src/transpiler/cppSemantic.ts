import type { Diagnostic } from "../core/types";
import type {
  CppAssignment,
  CppCondition,
  CppExpression,
  CppFunction,
  CppProgram,
  CppStatement,
  CppVarDecl,
  CppVariableSymbol,
  SemanticResult
} from "./cppAst";

const INT16_MIN = -32768;
const INT16_MAX = 32767;
const reservedLabels = new Set([
  "MAIN",
  "START",
  "END",
  "DC",
  "DS",
  "NOP",
  "LD",
  "LAD",
  "ADDA",
  "SUBA",
  "ADDL",
  "SUBL",
  "AND",
  "OR",
  "XOR",
  "CPA",
  "CPL",
  "SLA",
  "SRA",
  "SLL",
  "SRL",
  "PUSH",
  "POP",
  "CALL",
  "ST",
  "JUMP",
  "JZE",
  "JNZ",
  "JPL",
  "JMI",
  "JOV",
  "RET"
]);

type ValidationContext = {
  functionName: string;
  functionIndex: number;
  variables: Map<string, CppVariableSymbol>;
  allVariables: CppVariableSymbol[];
  usedLabels: Set<string>;
  diagnostics: Diagnostic[];
  functionNames: Map<string, CppFunction>;
  functionOrder: Map<string, number>;
  useScopedLabels: boolean;
  loopDepth: number;
};

export function checkCppSemantics(program: CppProgram | null, parseDiagnostics: Diagnostic[] = []): SemanticResult {
  const diagnostics = [...parseDiagnostics];
  const variables: CppVariableSymbol[] = [];
  const usedLabels = new Set<string>();

  if (!program) {
    return { ok: false, diagnostics, variables: [] };
  }

  const functionNames = new Map<string, CppFunction>();
  const functionOrder = new Map<string, number>();
  for (const [index, fn] of program.functions.entries()) {
    if (functionNames.has(fn.name)) {
      diagnostics.push({ line: fn.line, message: `Duplicate function declaration: ${fn.name}`, severity: "error" });
      continue;
    }
    functionNames.set(fn.name, fn);
    functionOrder.set(fn.name, index);
  }

  if (!functionNames.has("main")) {
    diagnostics.push({ line: program.functions[0]?.line ?? 0, message: "C++ subset program must define int main().", severity: "error" });
  }

  for (const fn of program.functions) {
    const label = functionLabel(fn.name);
    if (usedLabels.has(label)) {
      diagnostics.push({ line: fn.line, message: `Function label '${label}' conflicts with another generated label.`, severity: "error" });
    }
    usedLabels.add(label);
  }

  const useScopedLabels = program.functions.length > 1;
  for (const fn of program.functions) {
    const functionVariables = new Map<string, CppVariableSymbol>();
    validateStatements(fn.body, {
      functionName: fn.name,
      functionIndex: functionOrder.get(fn.name) ?? 0,
      variables: functionVariables,
      allVariables: variables,
      usedLabels,
      diagnostics,
      functionNames,
      functionOrder,
      useScopedLabels,
      loopDepth: 0
    });
  }

  return { ok: diagnostics.every((diagnostic) => diagnostic.severity !== "error"), diagnostics, variables };
}

function validateStatements(statements: CppStatement[], context: ValidationContext): void {
  for (const statement of statements) {
    if (statement.kind === "VarDecl") {
      validateVarDecl(statement, context, true);
      continue;
    }

    if (statement.kind === "Assignment") {
      validateAssignment(statement, context);
      continue;
    }

    if (statement.kind === "Return") {
      validateTopLevelExpression(statement.expression, context, "return");
      continue;
    }

    if (statement.kind === "IfStatement") {
      validateCondition(statement.condition, context);
      validateStatements(statement.thenBody, { ...context });
      if (statement.elseBody) validateStatements(statement.elseBody, { ...context });
      continue;
    }

    if (statement.kind === "WhileStatement") {
      validateCondition(statement.condition, context);
      validateStatements(statement.body, { ...context, loopDepth: context.loopDepth + 1 });
      continue;
    }

    if (statement.kind === "ForStatement") {
      if (statement.initializer?.kind === "VarDecl") {
        validateVarDecl(statement.initializer, context, false);
      } else if (statement.initializer?.kind === "Assignment") {
        validateAssignment(statement.initializer, context);
      }

      if (!statement.condition) {
        context.diagnostics.push({ line: statement.line, message: "for without condition is not supported yet", severity: "error" });
      } else {
        validateCondition(statement.condition, context);
      }

      if (statement.increment) {
        validateAssignment(statement.increment, context);
        validateForIncrement(statement.increment, context);
      }
      validateStatements(statement.body, { ...context, loopDepth: context.loopDepth + 1 });
      continue;
    }

    if (statement.kind === "BreakStatement") {
      if (context.loopDepth === 0) context.diagnostics.push({ line: statement.line, message: "break is only supported inside a loop", severity: "error" });
      continue;
    }

    if (statement.kind === "ContinueStatement" && context.loopDepth === 0) {
      context.diagnostics.push({ line: statement.line, message: "continue is only supported inside a loop", severity: "error" });
    }
  }
}

function validateVarDecl(statement: CppVarDecl, context: ValidationContext, storeLiteralInitializer: boolean): void {
  if (context.variables.has(statement.name)) {
    context.diagnostics.push({ line: statement.line, message: `Duplicate variable declaration: ${statement.name}`, severity: "error" });
    return;
  }
  const initializer = statement.initializer;
  if (initializer && initializer.kind !== "IntegerLiteral") {
    context.diagnostics.push({
      line: statement.line,
      message: "Variable initializers in the current C++ subset must be integer literals.",
      severity: "error"
    });
    validateTopLevelExpression(initializer, context, "general");
  }
  if (initializer?.kind === "IntegerLiteral") validateIntegerLiteral(initializer.value, initializer.line, context.diagnostics);
  const symbol = {
    name: statement.name,
    functionName: context.functionName,
    label: makeSafeLabel(context.useScopedLabels ? `${context.functionName}_${statement.name}` : statement.name, context.usedLabels),
    declarationLine: statement.line,
    initializer: storeLiteralInitializer && initializer?.kind === "IntegerLiteral" ? initializer.value : undefined
  };
  context.variables.set(statement.name, symbol);
  context.allVariables.push(symbol);
}

function validateAssignment(statement: CppAssignment, context: ValidationContext): void {
  if (!context.variables.has(statement.target)) {
    context.diagnostics.push({ line: statement.line, message: `Assignment target '${statement.target}' is not declared.`, severity: "error" });
  }
  validateTopLevelExpression(statement.expression, context, "assignment");
  if (statement.loweredFrom === "compound-assignment") validateCompoundAssignment(statement, context.diagnostics);
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

function validateForIncrement(statement: CppAssignment, context: ValidationContext): void {
  const expression = statement.expression;
  if (expression.kind !== "BinaryExpression" || expression.left.kind !== "Identifier" || expression.left.name !== statement.target) {
    context.diagnostics.push({
      line: statement.line,
      message: "Current C++ subset supports for increment only as i = i + step or i = i - step.",
      severity: "error"
    });
    return;
  }
  if (expression.right.kind !== "Identifier" && expression.right.kind !== "IntegerLiteral") {
    context.diagnostics.push({
      line: statement.line,
      message: "Current C++ subset supports for increment step only as integer literal or declared variable.",
      severity: "error"
    });
    return;
  }
  if (expression.right.kind === "Identifier" && !context.variables.has(expression.right.name)) {
    context.diagnostics.push({ line: expression.right.line, message: `Variable '${expression.right.name}' is used before declaration.`, severity: "error" });
  }
}

function validateTopLevelExpression(expression: CppExpression, context: ValidationContext, owner: "assignment" | "return" | "general"): void {
  if (expression.kind === "CallExpression") {
    validateCallExpression(expression, context);
    if (owner === "general") {
      context.diagnostics.push({ line: expression.line, message: "Function calls are supported only as assignment RHS or return expression.", severity: "error" });
    }
    return;
  }

  if (expression.kind === "BinaryExpression" && containsCallExpression(expression)) {
    context.diagnostics.push({ line: expression.line, message: "Function calls inside binary expressions are not supported yet.", severity: "error" });
  }
  validateExpression(expression, context);
}

function validateExpression(expression: CppExpression, context: ValidationContext): void {
  if (expression.kind === "Identifier") {
    if (!context.variables.has(expression.name)) {
      context.diagnostics.push({ line: expression.line, message: `Variable '${expression.name}' is used before declaration.`, severity: "error" });
    }
    return;
  }

  if (expression.kind === "IntegerLiteral") {
    validateIntegerLiteral(expression.value, expression.line, context.diagnostics);
    return;
  }

  if (expression.kind === "CallExpression") {
    validateCallExpression(expression, context);
    return;
  }

  validateExpression(expression.left, context);
  validateExpression(expression.right, context);
}

function validateCondition(condition: CppCondition, context: ValidationContext): void {
  if (condition.left.kind === "BinaryExpression" || condition.right.kind === "BinaryExpression") {
    context.diagnostics.push({ line: condition.line, message: "Current C++ subset if conditions support only identifiers and integer literals.", severity: "error" });
    return;
  }

  validateTopLevelExpression(condition.left, context, "general");
  validateTopLevelExpression(condition.right, context, "general");
}

function validateCallExpression(expression: Extract<CppExpression, { kind: "CallExpression" }>, context: ValidationContext): void {
  if (expression.arguments.length > 0) {
    context.diagnostics.push({ line: expression.line, message: "Function arguments are not supported yet.", severity: "error" });
    for (const arg of expression.arguments) validateExpression(arg, context);
  }
  if (!context.functionNames.has(expression.callee)) {
    context.diagnostics.push({ line: expression.line, message: `Function '${expression.callee}' is not defined.`, severity: "error" });
    return;
  }
  if (expression.callee === context.functionName) {
    context.diagnostics.push({ line: expression.line, message: "recursive function calls are not supported yet", severity: "error" });
  }
  const calleeIndex = context.functionOrder.get(expression.callee) ?? -1;
  if (calleeIndex > context.functionIndex) {
    context.diagnostics.push({
      line: expression.line,
      message: `Function '${expression.callee}' is used before its definition. Forward declarations are not supported yet.`,
      severity: "error"
    });
  }
}

function containsCallExpression(expression: CppExpression): boolean {
  if (expression.kind === "CallExpression") return true;
  if (expression.kind !== "BinaryExpression") return false;
  return containsCallExpression(expression.left) || containsCallExpression(expression.right);
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
  return new Map(variables.map((variable) => [`${variable.functionName}:${variable.name}`, variable.label]));
}

export function hasExplicitReturn(statements: CppStatement[]): boolean {
  return statements.some((statement) => statement.kind === "Return");
}

export function functionLabel(name: string): string {
  if (name === "main") return "MAIN";
  return `FUNC_${name.toUpperCase().replace(/[^A-Z0-9_]/g, "_")}`;
}
