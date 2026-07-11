export type DiagnosticSeverity = "error" | "warning" | "info";

export const diagnosticCodes = [
  "assembler.missingStart",
  "assembler.missingEnd",
  "assembler.unknownOpcode",
  "assembler.unknownSymbol",
  "assembler.duplicateLabel",
  "assembler.invalidRegister",
  "assembler.invalidIndexRegister",
  "assembler.malformedOperandList",
  "assembler.invalidOperandCount",
  "assembler.addressOutOfRange",
  "assembler.literalOutOfRange",
  "semantic.mainFunctionMissing",
  "semantic.duplicateFunction",
  "semantic.unknownFunction",
  "semantic.unknownVariable",
  "semantic.argumentCountMismatch",
  "semantic.recursionUnsupported",
  "semantic.breakOutsideLoop",
  "semantic.continueOutsideLoop",
  "semantic.parameterLocalConflict",
  "transpiler.tooManyRegisterArguments",
  "transpiler.unsupportedCallArgument",
  "vm.notLoaded",
  "vm.stepLimitReached",
  "vm.invalidInstruction",
  "vm.invalidMemoryAccess",
  "vm.stackUnderflow",
  "vm.stackOverflow"
] as const;

export type DiagnosticCode = (typeof diagnosticCodes)[number];
export type DiagnosticParamValue = string | number | boolean;
export type DiagnosticParams = Readonly<Record<string, DiagnosticParamValue>>;

export interface SourcePosition {
  line: number;
  column: number;
}

export interface SourceRange {
  start: SourcePosition;
  end: SourcePosition;
}

export interface StructuredDiagnostic {
  code: DiagnosticCode;
  severity: DiagnosticSeverity;
  params: DiagnosticParams;
  sourceRange?: SourceRange;
  fileName?: string;
  rawContext?: string;
  fallbackMessage?: string;
}

export interface RenderedDiagnostic extends StructuredDiagnostic {
  message: string;
}

export function isDiagnosticCode(value: unknown): value is DiagnosticCode {
  return typeof value === "string" && (diagnosticCodes as readonly string[]).includes(value);
}
