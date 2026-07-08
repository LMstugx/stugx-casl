import type { Diagnostic } from "../core/types";

export type CppExpression = CppIdentifier | CppIntegerLiteral | CppBinaryExpression;

export type CppStatement = CppVarDecl | CppAssignment | CppReturn;

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
}

export interface CppReturn {
  kind: "Return";
  line: number;
  expression: CppExpression;
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
}

export interface TranspileResult {
  ok: boolean;
  caslSource: string;
  diagnostics: Diagnostic[];
  mapping: CppToCaslMap[];
}
