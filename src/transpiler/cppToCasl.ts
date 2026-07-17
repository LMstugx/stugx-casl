import { word } from "../core/types";
import type {
  CppCondition,
  CppExpression,
  CppProgram,
  CppStatement,
  CppStorageObject,
  CppToCaslMap,
  CppToCaslMapKind,
  CppVariableSymbol
} from "./cppAst";
import { getScalarStorageLayout } from "./cppScalarTypes";
import { functionLabel, hasExplicitReturn, variableLabelMap } from "./cppSemantic";

export interface GenerateCaslResult {
  caslSource: string;
  mapping: CppToCaslMap[];
  storageObjects: CppStorageObject[];
}

type MappingInput = {
  cppLine: number;
  reason: string;
  kind: CppToCaslMapKind;
  objectId?: string;
  wordIndex?: number;
  operationId?: string;
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

type LoopContext = {
  breakTarget: string;
  continueTarget: string;
  kind: "while" | "for";
};

const ARGUMENT_REGISTERS = ["GR1", "GR2", "GR3"] as const;
type ArgumentRegister = (typeof ARGUMENT_REGISTERS)[number];

type GeneratorContext = {
  labels: Map<string, string>;
  constants: Map<number, ConstantEntry>;
  usedLabels: Set<string>;
  lines: GeneratedLine[];
  pendingLabels: PendingLabel[];
  loopStack: LoopContext[];
  currentFunction: string;
  variables: Map<string, CppVariableSymbol>;
  nextIfId: number;
  nextLoopId: number;
};

export function generateCaslFromCpp(program: CppProgram, variables: CppVariableSymbol[]): GenerateCaslResult {
  const context: GeneratorContext = {
    labels: variableLabelMap(variables),
    constants: new Map(),
    usedLabels: new Set([program.main.name, ...program.functions.map((fn) => functionLabel(fn.name)), ...variables.flatMap((variable) => variable.wordLabels)]),
    lines: [{
      text: "MAIN START",
      mappings: [
        { cppLine: program.main.line, reason: "main function declaration", kind: "function-declaration" },
        { cppLine: program.main.line, reason: "main entry label", kind: "function-label" }
      ]
    }],
    pendingLabels: [],
    loopStack: [],
    currentFunction: "main",
    variables: new Map(variables.map((variable) => [`${variable.functionName}:${variable.name}`, variable])),
    nextIfId: 0,
    nextLoopId: 0
  };

  emitFunctionBody(context, program.main);

  for (const fn of program.functions) {
    if (fn.name === "main") continue;
    context.currentFunction = fn.name;
    emitLabel(context, functionLabel(fn.name), fn.line, `${fn.name} function label`, "function-label");
    emitFunctionBody(context, fn);
  }

  for (const variable of variables) {
    if (variable.scalarType === "double") {
      variable.wordLabels.forEach((label, wordIndex) => {
        emit(context, `${label} DS    1`, {
          cppLine: variable.declarationLine,
          reason: `reserve ${variable.name}.word${wordIndex}`,
          kind: "double-storage",
          objectId: storageObjectId(variable),
          wordIndex
        });
      });
      continue;
    }
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
    mapping: buildMapping(context.lines),
    storageObjects: variables.map(storageObjectFromVariable)
  };
}

type StatementMappingKind = "if-then" | "if-else" | "while-body" | "for-body";

function emitStatements(context: GeneratorContext, statements: CppStatement[], branchKind?: StatementMappingKind): void {
  for (const statement of statements) {
    emitStatement(context, statement, branchKind);
  }
}

function emitFunctionBody(context: GeneratorContext, fn: CppProgram["main"]): void {
  context.currentFunction = fn.name;
  for (const [index, parameter] of fn.parameters.entries()) {
    const register = ARGUMENT_REGISTERS[index];
    if (!register) continue;
    emit(context, `     ST    ${register},${labelForVariable(context, parameter.name)}`, {
      cppLine: parameter.line,
      reason: `save ${parameter.name} parameter from ${register}`,
      kind: "function-declaration"
    });
  }
  emitStatements(context, fn.body);
  if (!hasExplicitReturn(fn.body)) {
    emit(context, "     LAD   GR0,0", { cppLine: fn.line, reason: "implicit return 0", kind: "function-return" });
    emit(context, "     RET", { cppLine: fn.line, reason: `return from ${fn.name}`, kind: "function-return" });
  }
}

function emitStatement(context: GeneratorContext, statement: CppStatement, branchKind?: StatementMappingKind): void {
  if (statement.kind === "VarDecl") {
    if (statement.scalarType === "double" && statement.initializer?.kind === "DoubleLiteral") {
      emitDoubleLiteralStores(context, statement.name, statement.initializer.representation.words, statement.line, "double-initializer");
    }
    return;
  }

  if (statement.kind === "Assignment") {
    emitAssignment(context, statement, branchKind ?? statement.loweredFrom ?? "assignment");
    return;
  }

  if (statement.kind === "Return") {
    if (statement.expression.kind === "CallExpression") {
      emitCall(context, statement.expression, statement.line, "function-call");
      emit(context, "     RET", { cppLine: statement.line, reason: `return from ${context.currentFunction}`, kind: "function-return" });
      return;
    }
    const kind = branchKind ?? "return";
    emitExpression(context, statement.expression, "GR0", statement.line, kind);
    emit(context, "     RET", { cppLine: statement.line, reason: `return from ${context.currentFunction}`, kind });
    return;
  }

  if (statement.kind === "IfStatement") {
    emitIf(context, statement);
    return;
  }

  if (statement.kind === "WhileStatement") {
    emitWhile(context, statement);
    return;
  }

  if (statement.kind === "ForStatement") {
    emitFor(context, statement);
    return;
  }

  if (statement.kind === "BreakStatement") {
    emitBreak(context, statement);
    return;
  }

  if (statement.kind === "ContinueStatement") {
    emitContinue(context, statement);
  }
}

function emitAssignment(context: GeneratorContext, statement: Extract<CppStatement, { kind: "Assignment" }>, kind: CppToCaslMapKind): void {
  const target = symbolForVariable(context, statement.target);
  if (target?.scalarType === "double") {
    if (statement.expression.kind === "DoubleLiteral") {
      emitDoubleLiteralStores(context, statement.target, statement.expression.representation.words, statement.line, "double-literal-assignment");
      return;
    }
    if (statement.expression.kind === "Identifier") {
      emitDoubleCopy(context, statement.expression.name, statement.target, statement.line);
      return;
    }
    throw new Error("Unsupported double assignment reached lowering.");
  }
  if (statement.expression.kind === "CallExpression") {
    emitCall(context, statement.expression, statement.line, "function-call");
    emit(context, `     ST    GR0,${labelForVariable(context, statement.target)}`, {
      cppLine: statement.line,
      reason: `store ${statement.target} from function return`,
      kind: "function-call"
    });
    return;
  }
  emitExpression(context, statement.expression, "GR1", statement.line, kind);
  emit(context, `     ST    GR1,${labelForVariable(context, statement.target)}`, {
    cppLine: statement.line,
    reason: `store ${statement.target}`,
    kind
  });
}

function emitVarInitializer(context: GeneratorContext, statement: Extract<CppStatement, { kind: "VarDecl" }>, kind: CppToCaslMapKind): void {
  if (!statement.initializer) return;
  emitExpression(context, statement.initializer, "GR1", statement.line, kind);
  emit(context, `     ST    GR1,${labelForVariable(context, statement.name)}`, {
    cppLine: statement.line,
    reason: `initialize ${statement.name}`,
    kind
  });
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
  context.loopStack.push({ kind: "while", breakTarget: endLabel, continueTarget: beginLabel });
  emitStatements(context, statement.body, "while-body");
  context.loopStack.pop();
  emit(context, `     JUMP  ${beginLabel}`, { cppLine: statement.line, reason: "repeat while loop", kind: "loop-back-jump" });
  emitLabel(context, endLabel, statement.line, "loop end label", "loop-label");
}

function emitFor(context: GeneratorContext, statement: Extract<CppStatement, { kind: "ForStatement" }>): void {
  const id = context.nextLoopId;
  context.nextLoopId += 1;
  const beginLabel = uniqueLabel(context, `FOR_BEGIN_${id}`);
  const bodyLabel = uniqueLabel(context, `FOR_BODY_${id}`);
  const continueLabel = uniqueLabel(context, `FOR_CONTINUE_${id}`);
  const endLabel = uniqueLabel(context, `FOR_END_${id}`);

  if (statement.initializer?.kind === "VarDecl") {
    emitVarInitializer(context, statement.initializer, "for-initializer");
  } else if (statement.initializer?.kind === "Assignment") {
    emitAssignment(context, statement.initializer, "for-initializer");
  }

  emitLabel(context, beginLabel, statement.line, "for begin label", "for-label");
  if (!statement.condition) throw new Error("for without condition is not supported yet");
  emitConditionJump(context, statement.condition, bodyLabel, endLabel, "for-condition", "for condition");
  emitLabel(context, bodyLabel, statement.line, "for body label", "for-label");
  context.loopStack.push({ kind: "for", breakTarget: endLabel, continueTarget: continueLabel });
  emitStatements(context, statement.body, "for-body");
  context.loopStack.pop();
  emitLabel(context, continueLabel, statement.line, "for continue label", "loop-continue-label");
  if (statement.increment) emitAssignment(context, statement.increment, "for-increment");
  emit(context, `     JUMP  ${beginLabel}`, { cppLine: statement.line, reason: "repeat for loop", kind: "for-back-jump" });
  emitLabel(context, endLabel, statement.line, "for end label", "for-label");
}

function emitBreak(context: GeneratorContext, statement: Extract<CppStatement, { kind: "BreakStatement" }>): void {
  const loop = context.loopStack[context.loopStack.length - 1];
  if (!loop) throw new Error("break is only supported inside a loop");
  emit(context, `     JUMP  ${loop.breakTarget}`, { cppLine: statement.line, reason: `break ${loop.kind} loop`, kind: "break-statement" });
}

function emitContinue(context: GeneratorContext, statement: Extract<CppStatement, { kind: "ContinueStatement" }>): void {
  const loop = context.loopStack[context.loopStack.length - 1];
  if (!loop) throw new Error("continue is only supported inside a loop");
  emit(context, `     JUMP  ${loop.continueTarget}`, { cppLine: statement.line, reason: `continue ${loop.kind} loop`, kind: "continue-statement" });
}

function emitConditionJump(
  context: GeneratorContext,
  condition: CppCondition,
  trueLabel: string,
  falseLabel: string,
  kind: "if-condition" | "while-condition" | "for-condition",
  reasonPrefix: "if condition" | "while condition" | "for condition"
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

  if (expression.kind === "DoubleLiteral") {
    throw new Error("Double values require multi-word lowering.");
  }

  if (expression.kind === "Identifier") {
    emit(context, `     LD    ${targetRegister},${labelForVariable(context, expression.name)}`, {
      cppLine,
      reason: `load ${expression.name}`,
      kind
    });
    return;
  }

  if (expression.kind === "CallExpression") {
    if (targetRegister !== "GR0") throw new Error("Function calls can only be evaluated into GR0 in the current C++ subset.");
    emitCall(context, expression, cppLine, "function-call");
    return;
  }

  emitExpression(context, expression.left, targetRegister, cppLine, kind);
  const rightOperand = operandForExpression(context, expression.right, cppLine);
  if (expression.operator !== "+" && expression.operator !== "-") {
    throw new Error(`Unsupported arithmetic operator ${expression.operator} reached lowering.`);
  }
  const op = expression.operator === "+" ? "ADDA" : "SUBA";
  emit(context, `     ${op.padEnd(5, " ")} ${targetRegister},${rightOperand}`, {
    cppLine,
    reason: expression.operator === "+" ? "add expression" : "subtract expression",
    kind
  });
}

function operandForExpression(context: GeneratorContext, expression: CppExpression, cppLine: number): string {
  if (expression.kind === "Identifier") return labelForVariable(context, expression.name);
  if (expression.kind === "IntegerLiteral") return constantLabel(context, expression.value, cppLine);
  throw new Error("Nested binary right-hand expressions are not supported by the C++ subset generator.");
}

function emitDoubleLiteralStores(
  context: GeneratorContext,
  targetName: string,
  words: readonly [number, number, number, number],
  cppLine: number,
  kind: "double-initializer" | "double-literal-assignment"
): void {
  const target = symbolForVariable(context, targetName);
  if (!target || target.scalarType !== "double") throw new Error(`Missing double storage metadata for ${targetName}.`);
  const operationId = `${kind}:${target.functionName}:${target.name}:${cppLine}`;
  words.forEach((value, wordIndex) => {
    const mapping = {
      cppLine,
      objectId: storageObjectId(target),
      wordIndex,
      operationId
    };
    emit(context, `     LAD   GR1,#${value.toString(16).toUpperCase().padStart(4, "0")}`, {
      ...mapping,
      reason: `${kind} load ${target.name}.word${wordIndex}`,
      kind
    });
    emit(context, `     ST    GR1,${target.wordLabels[wordIndex]}`, {
      ...mapping,
      reason: `${kind} write ${target.name}.word${wordIndex}`,
      kind
    });
  });
}

function emitDoubleCopy(context: GeneratorContext, sourceName: string, targetName: string, cppLine: number): void {
  const source = symbolForVariable(context, sourceName);
  const target = symbolForVariable(context, targetName);
  if (!source || !target || source.scalarType !== "double" || target.scalarType !== "double") {
    throw new Error("Missing double copy storage metadata.");
  }
  const operationId = `double-copy:${target.functionName}:${target.name}:${source.name}:${cppLine}`;
  for (let wordIndex = 0; wordIndex < 4; wordIndex += 1) {
    emit(context, `     LD    GR1,${source.wordLabels[wordIndex]}`, {
      cppLine,
      reason: `double assignment read ${source.name}.word${wordIndex}`,
      kind: "double-copy-read",
      objectId: storageObjectId(source),
      wordIndex,
      operationId
    });
    emit(context, `     ST    GR1,${target.wordLabels[wordIndex]}`, {
      cppLine,
      reason: `double assignment write ${target.name}.word${wordIndex}`,
      kind: "double-copy-write",
      objectId: storageObjectId(target),
      wordIndex,
      operationId
    });
  }
}

function emitCall(context: GeneratorContext, expression: Extract<CppExpression, { kind: "CallExpression" }>, cppLine: number, kind: CppToCaslMapKind): void {
  const callee = expression.callee;
  for (const [index, argument] of expression.arguments.entries()) {
    const register = ARGUMENT_REGISTERS[index];
    if (!register) throw new Error("only up to three function parameters are supported yet");
    emitArgumentToRegister(context, argument, register, index, callee, cppLine, kind);
  }
  emit(context, `     CALL  ${functionLabel(callee)}`, {
    cppLine,
    reason: `call ${callee}`,
    kind
  });
}

function emitArgumentToRegister(
  context: GeneratorContext,
  argument: CppExpression,
  register: ArgumentRegister,
  argumentIndex: number,
  callee: string,
  cppLine: number,
  kind: CppToCaslMapKind
): void {
  const reason = `load argument ${argumentIndex + 1} for ${callee}`;
  if (argument.kind === "IntegerLiteral") {
    emit(context, `     LAD   ${register},${formatCaslLiteral(argument.value)}`, {
      cppLine,
      reason,
      kind
    });
    return;
  }

  if (argument.kind === "Identifier") {
    emit(context, `     LD    ${register},${labelForVariable(context, argument.name)}`, {
      cppLine,
      reason,
      kind
    });
    return;
  }

  throw new Error("complex function call arguments are not supported yet");
}

function labelForVariable(context: GeneratorContext, name: string): string {
  return context.labels.get(`${context.currentFunction}:${name}`) ?? context.labels.get(`main:${name}`) ?? name.toUpperCase();
}

function symbolForVariable(context: GeneratorContext, name: string): CppVariableSymbol | undefined {
  return context.variables.get(`${context.currentFunction}:${name}`) ?? context.variables.get(`main:${name}`);
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
      const key = `${mapping.cppLine}:${mapping.kind}:${mapping.reason}:${mapping.objectId ?? ""}:${mapping.wordIndex ?? ""}:${mapping.operationId ?? ""}`;
      const existing = map.get(key);
      if (existing) {
        existing.caslLines.push(index + 1);
        continue;
      }
      map.set(key, {
        cppLine: mapping.cppLine,
        caslLines: [index + 1],
        reason: mapping.reason,
        kind: mapping.kind,
        ...(mapping.objectId ? { objectId: mapping.objectId } : {}),
        ...(mapping.wordIndex !== undefined ? { wordIndex: mapping.wordIndex } : {}),
        ...(mapping.operationId ? { operationId: mapping.operationId } : {})
      });
    }
  });
  return [...map.values()];
}

function storageObjectId(variable: CppVariableSymbol): string {
  return `cpp-storage:${variable.functionName}:${variable.name}`;
}

function storageObjectFromVariable(variable: CppVariableSymbol): CppStorageObject {
  const bitRanges = getScalarStorageLayout(variable.scalarType).wordBitRanges;
  return {
    objectId: storageObjectId(variable),
    symbolName: variable.name,
    functionName: variable.functionName,
    type: variable.scalarType,
    baseLabel: variable.label,
    wordCount: variable.storageWordCount,
    words: variable.wordLabels.map((label, index) => ({ index, label, bitRange: bitRanges[index] })),
    declarationRange: variable.declarationRange,
    currentLoweringMode: "static-label"
  };
}
