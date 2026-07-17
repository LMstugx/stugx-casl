import type { Diagnostic, SourceRange } from "../core/types";
import type { SourceUnitId } from "../documents/types";
import type { Binary64Representation, Binary64Words } from "./doubleRepresentation";
import type { CppScalarType } from "./cppScalarTypes";

export type CppExpression = CppIdentifier | CppIntegerLiteral | CppDoubleLiteral | CppBinaryExpression | CppCallExpression;

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
  | "loop-continue-label"
  | "function-declaration"
  | "function-label"
  | "function-call"
  | "function-return"
  | "double-initializer"
  | "double-literal-assignment"
  | "double-copy-read"
  | "double-copy-write"
  | "double-storage";

export interface CppProgram {
  kind: "Program";
  functions: CppFunction[];
  main: CppFunction;
}

export interface CppFunction {
  kind: "Function";
  name: string;
  returnType: CppScalarType;
  line: number;
  sourceRange?: SourceRange;
  parameters: CppParameter[];
  body: CppStatement[];
}

export interface CppParameter {
  name: string;
  type: CppScalarType;
  line: number;
  sourceRange?: SourceRange;
}

export interface CppVarDecl {
  kind: "VarDecl";
  line: number;
  name: string;
  scalarType: CppScalarType;
  declarationRange?: SourceRange;
  isArray?: boolean;
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
  sourceRange?: SourceRange;
}

export interface CppIdentifier {
  kind: "Identifier";
  line: number;
  name: string;
  sourceRange?: SourceRange;
}

export interface CppIntegerLiteral {
  kind: "IntegerLiteral";
  line: number;
  value: number;
  raw: string;
  sourceRange?: SourceRange;
}

export interface CppDoubleLiteral {
  kind: "DoubleLiteral";
  line: number;
  value: number;
  raw: string;
  representation: Binary64Representation;
  literalIssue?: "invalid" | "out-of-range" | "unsupported-suffix";
  suffix?: string;
  sourceRange?: SourceRange;
}

export interface CppBinaryExpression {
  kind: "BinaryExpression";
  line: number;
  operator: "+" | "-" | "*" | "/";
  left: CppExpression;
  right: CppExpression;
  sourceRange?: SourceRange;
}

export interface CppCallExpression {
  kind: "CallExpression";
  line: number;
  callee: string;
  arguments: CppExpression[];
  sourceRange?: SourceRange;
}

export interface CppVariableSymbol {
  name: string;
  functionName: string;
  label: string;
  declarationLine: number;
  declarationRange?: SourceRange;
  scalarType: CppScalarType;
  storageWordCount: 1 | 4;
  wordLabels: readonly string[];
  initializer?: number;
  doubleInitializer?: Binary64Words;
  isParameter?: boolean;
}

export interface CppStorageWord {
  index: number;
  label: string;
  bitRange?: string;
  address?: number;
}

export interface CppStorageObject {
  objectId: string;
  symbolName: string;
  sourceUnitId?: SourceUnitId;
  functionName: string;
  type: CppScalarType;
  baseLabel: string;
  baseAddress?: number;
  wordCount: 1 | 4;
  words: readonly CppStorageWord[];
  declarationRange?: SourceRange;
  currentLoweringMode: "static-label";
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
  objectId?: string;
  wordIndex?: number;
  operationId?: string;
}

export interface TranspileResult {
  ok: boolean;
  caslSource: string;
  diagnostics: Diagnostic[];
  mapping: CppToCaslMap[];
  storageObjects: CppStorageObject[];
}
