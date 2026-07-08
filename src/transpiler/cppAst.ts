import type { Diagnostic } from "../core/types";

export type CppExpression = CppIdentifier | CppIntegerLiteral | CppBinaryExpression;

export type CppStatement =
  | CppVarDecl
  | CppAssignment
  | CppReturn
  | CppIfStatement
  | CppWhileStatement
  | CppForStatement
  | CppBreakStatement
  | CppContinueStatement;
export type CppConditionOperator = "==" | "!=" | "<" | "<=" | ">" | ">=";
export type CppToCaslMapKind =
  | "declaration"
  | "assignment"
  | "return"
  | "if-condition"
  | "if-then"
  | "if-else"
  | "generated-label"
  | "constant"
  | "while-condition"
  | "while-body"
  | "loop-label"
  | "loop-back-jump"
  | "for-initializer"
  | "for-condition"
  | "for-body"
  | "for-increment"
  | "for-label"
  | "for-back-jump"
  | "update-expression"
  | "compound-assignment"
  | "break-statement"
  | "continue-statement"
  | "loop-continue-label";

export interface CppProgram {
  kind: "Program";
  main: CppFunction;
}

export interface CppFunction {
  kind: "Function";
  name: "main";
  returnType: "int";
  line: number;
  body: CppStatement[];
}

export interface CppVarDecl {
  kind: "VarDecl";
  line: number;
  name: string;
  initializer?: CppExpression;
}

export interface CppAssignment {
  kind: "Assignment";
  line: number;
  target: string;
  expression: CppExpression;
  loweredFrom?: "update-expression" | "compound-assignment";
}

export interface CppReturn {
  kind: "Return";
  line: number;
  expression: CppExpression;
}

export interface CppIfStatement {
  kind: "IfStatement";
  line: number;
  condition: CppCondition;
  thenBody: CppStatement[];
  elseBody?: CppStatement[];
}

export interface CppWhileStatement {
  kind: "WhileStatement";
  line: number;
  condition: CppCondition;
  body: CppStatement[];
}

export interface CppForStatement {
  kind: "ForStatement";
  line: number;
  initializer: CppVarDecl | CppAssignment | null;
  condition: CppCondition | null;
  increment: CppAssignment | null;
  body: CppStatement[];
}

export interface CppBreakStatement {
  kind: "BreakStatement";
  line: number;
}

export interface CppContinueStatement {
  kind: "ContinueStatement";
  line: number;
}

export interface CppCondition {
  kind: "Condition";
  line: number;
  left: CppExpression;
  operator: CppConditionOperator;
  right: CppExpression;
}

export interface CppIdentifier {
  kind: "Identifier";
  line: number;
  name: string;
}

export interface CppIntegerLiteral {
  kind: "IntegerLiteral";
  line: number;
  value: number;
  raw: string;
}

export interface CppBinaryExpression {
  kind: "BinaryExpression";
  line: number;
  operator: "+" | "-";
  left: CppExpression;
  right: CppExpression;
}

export interface CppVariableSymbol {
  name: string;
  label: string;
  declarationLine: number;
  initializer?: number;
}

export interface SemanticResult {
  ok: boolean;
  diagnostics: Diagnostic[];
  variables: CppVariableSymbol[];
}

export interface CppToCaslMap {
  cppLine: number;
  caslLines: number[];
  reason: string;
  kind: CppToCaslMapKind;
}

export interface TranspileResult {
  ok: boolean;
  caslSource: string;
  diagnostics: Diagnostic[];
  mapping: CppToCaslMap[];
}
