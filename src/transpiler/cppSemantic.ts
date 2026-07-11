import type { Diagnostic } from "../core/types";
import { createStructuredDiagnostic } from "../diagnostics/catalog";
import { eofInsertionRange, rangeForLastTextOnLine, rangeForTextOnLine } from "../diagnostics/sourceRange";
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
  source: string;
};

export function checkCppSemantics(program: CppProgram | null, parseDiagnostics: Diagnostic[] = [], source = ""): SemanticResult {
  const diagnostics = [...parseDiagnostics];
  const variables: CppVariableSymbol[] = [];
  const usedLabels = new Set<string>();

  if (!program) {
    if (diagnostics.length === 0) {
      diagnostics.push(createStructuredDiagnostic(0, "C++ subset program must define int main().", "semantic.mainFunctionMissing", {}, "error", {
        sourceRange: eofInsertionRange(source)
      }));
    }
    return { ok: false, diagnostics, variables: [] };
  }

  const functionNames = new Map<string, CppFunction>();
  const functionOrder = new Map<string, number>();
  for (const [index, fn] of program.functions.entries()) {
    if (functionNames.has(fn.name)) {
      const first = functionNames.get(fn.name)!;
      const sourceRange = functionNameRange(source, program.functions, index);
      const firstRange = functionNameRange(source, program.functions, program.functions.indexOf(first));
      diagnostics.push(createStructuredDiagnostic(fn.line, `Duplicate function declaration: ${fn.name}`, "semantic.duplicateFunction", {
        function: fn.name,
        firstLine: first.line,
        duplicateLine: fn.line
      }, "error", {
        ...(sourceRange ? { sourceRange } : {}),
        ...(firstRange ? { relatedLocations: [{ label: "diagnostic.firstDeclaredHere", sourceRange: firstRange }] } : {})
      }));
      continue;
    }
    functionNames.set(fn.name, fn);
    functionOrder.set(fn.name, index);
  }

  if (!functionNames.has("main")) {
    diagnostics.push(createStructuredDiagnostic(program.functions[0]?.line ?? 0, "C++ subset program must define int main().", "semantic.mainFunctionMissing", {}, "error", {
      sourceRange: eofInsertionRange(source)
    }));
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
    const context: ValidationContext = {
      functionName: fn.name,
      functionIndex: functionOrder.get(fn.name) ?? 0,
      variables: functionVariables,
      allVariables: variables,
      usedLabels,
      diagnostics,
      functionNames,
      functionOrder,
      useScopedLabels,
      loopDepth: 0,
      source
    };
    validateFunctionParameters(fn, context);
    validateStatements(fn.body, context);
  }

  return { ok: diagnostics.every((diagnostic) => diagnostic.severity !== "error"), diagnostics, variables };
}

function validateFunctionParameters(fn: CppFunction, context: ValidationContext): void {
  if (fn.name === "main" && fn.parameters.length > 0) {
    context.diagnostics.push({ line: fn.parameters[0].line, message: "main parameters are not supported yet", severity: "error" });
  }

  if (fn.parameters.length > 3) {
    context.diagnostics.push(createStructuredDiagnostic(fn.parameters[3].line, "only up to three function parameters are supported yet", "transpiler.tooManyRegisterArguments", {
      function: fn.name,
      maximum: 3,
      actualCount: fn.parameters.length
    }, "error", metadataForText(context.source, fn.parameters[3].line, fn.parameters[3].name)));
  }

  for (const parameter of fn.parameters) {
    if (context.variables.has(parameter.name)) {
      context.diagnostics.push({ line: parameter.line, message: "duplicate parameter name", severity: "error" });
      continue;
    }

    const symbol = {
      name: parameter.name,
      functionName: context.functionName,
      label: makeSafeLabel(`${functionLabel(context.functionName)}_${parameter.name}`, context.usedLabels),
      declarationLine: parameter.line,
      isParameter: true
    };
    context.variables.set(parameter.name, symbol);
    context.allVariables.push(symbol);
  }
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
      if (context.loopDepth === 0) context.diagnostics.push(createStructuredDiagnostic(statement.line, "break is only supported inside a loop", "semantic.breakOutsideLoop", {}, "error", metadataForText(context.source, statement.line, "break")));
      continue;
    }

    if (statement.kind === "ContinueStatement" && context.loopDepth === 0) {
      context.diagnostics.push(createStructuredDiagnostic(statement.line, "continue is only supported inside a loop", "semantic.continueOutsideLoop", {}, "error", metadataForText(context.source, statement.line, "continue")));
    }
  }
}

function validateVarDecl(statement: CppVarDecl, context: ValidationContext, storeLiteralInitializer: boolean): void {
  const existing = context.variables.get(statement.name);
  if (existing) {
    if (existing.isParameter) {
      context.diagnostics.push(createStructuredDiagnostic(statement.line, "parameter name conflicts with local variable", "semantic.parameterLocalConflict", {
        function: context.functionName,
        variable: statement.name,
        parameterLine: existing.declarationLine,
        localLine: statement.line
      }, "error", metadataForText(context.source, statement.line, statement.name, existing.declarationLine)));
      return;
    }
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
    context.diagnostics.push(createStructuredDiagnostic(statement.line, `Assignment target '${statement.target}' is not declared.`, "semantic.unknownVariable", {
      function: context.functionName,
      variable: statement.target
    }, "error", metadataForText(context.source, statement.line, statement.target)));
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
    context.diagnostics.push(createStructuredDiagnostic(expression.right.line, `Variable '${expression.right.name}' is used before declaration.`, "semantic.unknownVariable", {
      function: context.functionName,
      variable: expression.right.name
    }, "error", metadataForText(context.source, expression.right.line, expression.right.name)));
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
      context.diagnostics.push(createStructuredDiagnostic(expression.line, `Variable '${expression.name}' is used before declaration.`, "semantic.unknownVariable", {
        function: context.functionName,
        variable: expression.name
      }, "error", metadataForText(context.source, expression.line, expression.name)));
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
  for (const arg of expression.arguments) {
    validateFunctionCallArgument(arg, context);
  }
  const callee = context.functionNames.get(expression.callee);
  if (!callee) {
    context.diagnostics.push(createStructuredDiagnostic(expression.line, `Function '${expression.callee}' is not defined.`, "semantic.unknownFunction", {
      function: expression.callee
    }, "error", metadataForLastText(context.source, expression.line, expression.callee)));
    return;
  }
  if (expression.arguments.length !== callee.parameters.length) {
    context.diagnostics.push(createStructuredDiagnostic(expression.line, "function call argument count mismatch", "semantic.argumentCountMismatch", {
      function: expression.callee,
      expectedCount: callee.parameters.length,
      actualCount: expression.arguments.length
    }, "error", metadataForLastText(context.source, expression.line, expression.callee)));
  }
  if (expression.callee === context.functionName) {
    context.diagnostics.push(createStructuredDiagnostic(expression.line, "recursive function calls are not supported yet", "semantic.recursionUnsupported", {
      function: expression.callee
    }, "error", metadataForLastText(context.source, expression.line, expression.callee)));
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

function validateFunctionCallArgument(argument: CppExpression, context: ValidationContext): void {
  if (argument.kind !== "Identifier" && argument.kind !== "IntegerLiteral") {
    context.diagnostics.push(createStructuredDiagnostic(argument.line, "complex function call arguments are not supported yet", "transpiler.unsupportedCallArgument", {
      function: context.functionName,
      argumentCount: 1
    }, "error", metadataForText(context.source, argument.line, expressionText(argument))));
  }
  validateExpression(argument, context);
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

function metadataForText(source: string, line: number, text: string, relatedLine?: number): Pick<Diagnostic, "sourceRange" | "relatedLocations"> {
  const sourceRange = rangeForTextOnLine(source, line, text, relatedLine === line ? 1 : 0);
  const relatedRange = relatedLine === undefined ? undefined : rangeForTextOnLine(source, relatedLine, text);
  return {
    ...(sourceRange ? { sourceRange } : {}),
    ...(relatedRange ? { relatedLocations: [{ label: "diagnostic.firstDeclaredHere", sourceRange: relatedRange }] } : {})
  };
}

function metadataForLastText(source: string, line: number, text: string): Pick<Diagnostic, "sourceRange"> {
  const sourceRange = rangeForLastTextOnLine(source, line, text);
  return sourceRange ? { sourceRange } : {};
}

function functionNameRange(source: string, functions: readonly CppFunction[], targetIndex: number) {
  const fn = functions[targetIndex];
  if (!fn) return undefined;
  const occurrence = functions.slice(0, targetIndex).filter((candidate) => candidate.line === fn.line && candidate.name === fn.name).length;
  return rangeForTextOnLine(source, fn.line, fn.name, occurrence);
}

function expressionText(expression: CppExpression): string {
  if (expression.kind === "Identifier") return expression.name;
  if (expression.kind === "IntegerLiteral") return expression.raw;
  if (expression.kind === "CallExpression") return expression.callee;
  return expressionText(expression.left);
}
