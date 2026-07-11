export type DiagnosticSeverity = "error" | "warning" | "info";

export const diagnosticCodes = [
  "assembler.missingStart", "assembler.missingEnd", "assembler.unknownOpcode", "assembler.unknownSymbol",
  "assembler.duplicateLabel", "assembler.invalidRegister", "assembler.invalidIndexRegister",
  "assembler.malformedOperandList", "assembler.invalidOperandCount", "assembler.addressOutOfRange",
  "assembler.literalOutOfRange", "semantic.mainFunctionMissing", "semantic.duplicateFunction",
  "semantic.unknownFunction", "semantic.unknownVariable", "semantic.argumentCountMismatch",
  "semantic.recursionUnsupported", "semantic.breakOutsideLoop", "semantic.continueOutsideLoop",
  "semantic.parameterLocalConflict", "transpiler.tooManyRegisterArguments",
  "transpiler.unsupportedCallArgument", "vm.notLoaded", "vm.stepLimitReached",
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
  "semantic.mainFunctionMissing": NoParams;
  "semantic.duplicateFunction": { function: string; firstLine?: number; duplicateLine?: number };
  "semantic.unknownFunction": { function: string };
  "semantic.unknownVariable": { variable: string; function?: string };
  "semantic.argumentCountMismatch": { function: string; expectedCount: number; actualCount: number };
  "semantic.recursionUnsupported": { function: string };
  "semantic.breakOutsideLoop": NoParams;
  "semantic.continueOutsideLoop": NoParams;
  "semantic.parameterLocalConflict": { variable: string; function?: string; parameterLine?: number; localLine?: number };
  /** actualCount is retained for details; the compact localized template only requires the supported maximum. */
  "transpiler.tooManyRegisterArguments": { function: string; maximum: number; actualCount?: number };
  "transpiler.unsupportedCallArgument": { argumentCount: number; function?: string };
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
