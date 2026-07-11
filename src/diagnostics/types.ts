export type DiagnosticSeverity = "error" | "warning" | "info";

export const diagnosticProducers = [
  "casl-parser", "assembler", "cpp-lexer", "cpp-parser", "semantic", "transpiler", "vm", "wasm-adapter"
] as const;
export type DiagnosticProducer = (typeof diagnosticProducers)[number];

export const diagnosticCodes = [
  "assembler.missingStart", "assembler.missingEnd", "assembler.unknownOpcode", "assembler.unknownSymbol",
  "assembler.duplicateLabel", "assembler.invalidRegister", "assembler.invalidIndexRegister",
  "assembler.malformedOperandList", "assembler.invalidOperandCount", "assembler.addressOutOfRange",
  "assembler.literalOutOfRange", "assembler.missingOpcode", "assembler.invalidLiteral",
  "assembler.missingOperand", "assembler.unexpectedTrailingOperand",
  "cppParser.unexpectedToken", "cppParser.expectedToken", "cppParser.unterminatedBlock",
  "cppParser.missingSemicolon", "cppParser.invalidFunctionDeclaration", "cppParser.invalidParameterList",
  "cppParser.invalidVariableDeclaration", "cppParser.invalidAssignment", "cppParser.invalidIfStatement",
  "cppParser.invalidForStatement", "cppParser.invalidCallExpression", "cppParser.unsupportedExpression",
  "cppParser.unsupportedOperator", "semantic.mainFunctionMissing", "semantic.duplicateFunction",
  "semantic.unknownFunction", "semantic.unknownVariable", "semantic.argumentCountMismatch",
  "semantic.recursionUnsupported", "semantic.breakOutsideLoop", "semantic.continueOutsideLoop",
  "semantic.parameterLocalConflict", "semantic.unsupportedMainParameters", "semantic.duplicateParameter",
  "semantic.duplicateVariable", "semantic.unsupportedInitializer", "semantic.invalidCondition",
  "semantic.integerLiteralOutOfRange", "semantic.forwardDeclarationUnsupported",
  "transpiler.tooManyRegisterArguments", "transpiler.unsupportedCallArgument",
  "transpiler.unsupportedExpression", "transpiler.internalLoweringFailure",
  "vm.notLoaded", "vm.stepLimitReached",
  "vm.invalidInstruction", "vm.invalidMemoryAccess", "vm.stackUnderflow", "vm.stackOverflow"
] as const;

export type DiagnosticCode = (typeof diagnosticCodes)[number];
export type DiagnosticParamValue = string | number | boolean;
type NoParams = { readonly [name: string]: never };

export interface DiagnosticParamSchemas {
  "assembler.missingStart": NoParams;
  "assembler.missingEnd": NoParams;
  "assembler.unknownOpcode": { opcode: string; line?: number };
  "assembler.unknownSymbol": { symbol: string; line?: number };
  "assembler.duplicateLabel": { label: string; firstLine?: number; duplicateLine?: number };
  "assembler.invalidRegister": { register: string };
  "assembler.invalidIndexRegister": { indexRegister: string };
  "assembler.malformedOperandList": NoParams;
  "assembler.invalidOperandCount": { mnemonic: string; expectedCount?: number; actualCount?: number };
  /** Some legacy producers report the boundary failure without exposing the rejected value. */
  "assembler.addressOutOfRange": { value?: string | number; minimum?: number; maximum?: number };
  /** Some legacy producers report an invalid literal category without retaining the token. */
  "assembler.literalOutOfRange": { value?: string | number; minimum?: number; maximum?: number };
  "assembler.missingOpcode": { label?: string };
  "assembler.invalidLiteral": { literal: string };
  "assembler.missingOperand": { mnemonic: string };
  "assembler.unexpectedTrailingOperand": { mnemonic: string; operand: string };
  "cppParser.unexpectedToken": { token: string; expected?: string };
  "cppParser.expectedToken": { expectedToken: string; actualToken?: string };
  "cppParser.unterminatedBlock": { construct?: string };
  "cppParser.missingSemicolon": NoParams;
  "cppParser.invalidFunctionDeclaration": { token?: string };
  "cppParser.invalidParameterList": { token?: string };
  "cppParser.invalidVariableDeclaration": { token?: string };
  "cppParser.invalidAssignment": { token?: string };
  "cppParser.invalidIfStatement": { token?: string };
  "cppParser.invalidForStatement": { token?: string };
  "cppParser.invalidCallExpression": { token?: string };
  "cppParser.unsupportedExpression": { token: string };
  "cppParser.unsupportedOperator": { operator: string; construct?: string };
  "semantic.mainFunctionMissing": NoParams;
  "semantic.duplicateFunction": { function: string; firstLine?: number; duplicateLine?: number };
  "semantic.unknownFunction": { function: string };
  "semantic.unknownVariable": { variable: string; function?: string };
  "semantic.argumentCountMismatch": { function: string; expectedCount: number; actualCount: number };
  "semantic.recursionUnsupported": { function: string };
  "semantic.breakOutsideLoop": NoParams;
  "semantic.continueOutsideLoop": NoParams;
  "semantic.parameterLocalConflict": { variable: string; function?: string; parameterLine?: number; localLine?: number };
  "semantic.unsupportedMainParameters": { actualCount: number };
  "semantic.duplicateParameter": { variable: string; function?: string };
  "semantic.duplicateVariable": { variable: string; function?: string };
  "semantic.unsupportedInitializer": { variable: string };
  "semantic.invalidCondition": { construct: string };
  "semantic.integerLiteralOutOfRange": { literal: string };
  "semantic.forwardDeclarationUnsupported": { function: string };
  /** actualCount is retained for details; the compact localized template only requires the supported maximum. */
  "transpiler.tooManyRegisterArguments": { function: string; maximum: number; actualCount?: number };
  "transpiler.unsupportedCallArgument": { argumentCount: number; function?: string };
  "transpiler.unsupportedExpression": { construct: string };
  "transpiler.internalLoweringFailure": NoParams;
  "vm.notLoaded": NoParams;
  "vm.stepLimitReached": { stepLimit: number };
  "vm.invalidInstruction": { address?: number };
  "vm.invalidMemoryAccess": { address: number };
  "vm.stackUnderflow": NoParams;
  "vm.stackOverflow": NoParams;
}

export type DiagnosticParams<C extends DiagnosticCode> = Readonly<DiagnosticParamSchemas[C]>;
export type AnyDiagnosticParams = DiagnosticParams<DiagnosticCode>;

export interface SourcePosition {
  /** 1-based UTF-16 code-unit line column. */
  line: number;
  column: number;
  /** 0-based UTF-16 code-unit offset. */
  offset?: number;
}

export interface SourceRange {
  /** Start inclusive, end exclusive. */
  start: SourcePosition;
  end: SourcePosition;
}

export interface DiagnosticRelatedLocation {
  label?: string;
  sourceRange: SourceRange;
  fileName?: string;
}

export interface StructuredDiagnostic<C extends DiagnosticCode = DiagnosticCode> {
  code: C;
  producer: DiagnosticProducer;
  severity: DiagnosticSeverity;
  params: DiagnosticParams<C>;
  sourceRange?: SourceRange;
  relatedLocations?: readonly DiagnosticRelatedLocation[];
  fileName?: string;
  rawContext?: string;
  fallbackMessage?: string;
}

export interface RenderedDiagnostic<C extends DiagnosticCode = DiagnosticCode> extends Omit<StructuredDiagnostic<C>, "params"> {
  line: number;
  params: DiagnosticParams<C>;
  message: string;
}

export function isDiagnosticCode(value: unknown): value is DiagnosticCode {
  return typeof value === "string" && (diagnosticCodes as readonly string[]).includes(value);
}

export function isDiagnosticProducer(value: unknown): value is DiagnosticProducer {
  return typeof value === "string" && (diagnosticProducers as readonly string[]).includes(value);
}

export function inferDiagnosticProducer(code: DiagnosticCode): DiagnosticProducer {
  if (code.startsWith("cppParser.")) return "cpp-parser";
  if (code.startsWith("semantic.")) return "semantic";
  if (code.startsWith("transpiler.")) return "transpiler";
  if (code.startsWith("vm.")) return "vm";
  if (code === "assembler.unknownOpcode" || code === "assembler.missingOpcode") return "casl-parser";
  return "assembler";
}
