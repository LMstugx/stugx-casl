import type { Diagnostic } from "../core/types";
import { translate } from "../i18n/resources";
import type { AnyTranslationKey, SupportedLocale } from "../i18n/types";
import { normalizeDiagnostic } from "./catalog";
import { formatDiagnosticParam } from "./formatDiagnosticParam";
import type { AnyDiagnosticParams, DiagnosticCode, RenderedDiagnostic } from "./types";

const diagnosticTranslationKeys = {
  "assembler.missingStart": "diagnostics.assembler.missingStart",
  "assembler.missingEnd": "diagnostics.assembler.missingEnd",
  "assembler.unknownOpcode": "diagnostics.assembler.unknownOpcode",
  "assembler.unknownSymbol": "diagnostics.assembler.unknownSymbol",
  "assembler.duplicateLabel": "diagnostics.assembler.duplicateLabel",
  "assembler.invalidRegister": "diagnostics.assembler.invalidRegister",
  "assembler.invalidIndexRegister": "diagnostics.assembler.invalidIndexRegister",
  "assembler.malformedOperandList": "diagnostics.assembler.malformedOperandList",
  "assembler.invalidOperandCount": "diagnostics.assembler.invalidOperandCount",
  "assembler.addressOutOfRange": "diagnostics.assembler.addressOutOfRange",
  "assembler.literalOutOfRange": "diagnostics.assembler.literalOutOfRange",
  "assembler.missingOpcode": "diagnostics.assembler.missingOpcode",
  "assembler.invalidLiteral": "diagnostics.assembler.invalidLiteral",
  "assembler.missingOperand": "diagnostics.assembler.missingOperand",
  "assembler.unexpectedTrailingOperand": "diagnostics.assembler.unexpectedTrailingOperand",
  "cppParser.unexpectedToken": "diagnostics.cppParser.unexpectedToken",
  "cppParser.expectedToken": "diagnostics.cppParser.expectedToken",
  "cppParser.unterminatedBlock": "diagnostics.cppParser.unterminatedBlock",
  "cppParser.missingSemicolon": "diagnostics.cppParser.missingSemicolon",
  "cppParser.invalidFunctionDeclaration": "diagnostics.cppParser.invalidFunctionDeclaration",
  "cppParser.invalidParameterList": "diagnostics.cppParser.invalidParameterList",
  "cppParser.invalidVariableDeclaration": "diagnostics.cppParser.invalidVariableDeclaration",
  "cppParser.invalidAssignment": "diagnostics.cppParser.invalidAssignment",
  "cppParser.invalidIfStatement": "diagnostics.cppParser.invalidIfStatement",
  "cppParser.invalidForStatement": "diagnostics.cppParser.invalidForStatement",
  "cppParser.invalidCallExpression": "diagnostics.cppParser.invalidCallExpression",
  "cppParser.unsupportedExpression": "diagnostics.cppParser.unsupportedExpression",
  "cppParser.unsupportedOperator": "diagnostics.cppParser.unsupportedOperator",
  "semantic.mainFunctionMissing": "diagnostics.semantic.mainFunctionMissing",
  "semantic.duplicateFunction": "diagnostics.semantic.duplicateFunction",
  "semantic.unknownFunction": "diagnostics.semantic.unknownFunction",
  "semantic.unknownVariable": "diagnostics.semantic.unknownVariable",
  "semantic.argumentCountMismatch": "diagnostics.semantic.argumentCountMismatch",
  "semantic.recursionUnsupported": "diagnostics.semantic.recursionUnsupported",
  "semantic.breakOutsideLoop": "diagnostics.semantic.breakOutsideLoop",
  "semantic.continueOutsideLoop": "diagnostics.semantic.continueOutsideLoop",
  "semantic.parameterLocalConflict": "diagnostics.semantic.parameterLocalConflict",
  "semantic.unsupportedMainParameters": "diagnostics.semantic.unsupportedMainParameters",
  "semantic.duplicateParameter": "diagnostics.semantic.duplicateParameter",
  "semantic.duplicateVariable": "diagnostics.semantic.duplicateVariable",
  "semantic.unsupportedInitializer": "diagnostics.semantic.unsupportedInitializer",
  "semantic.invalidCondition": "diagnostics.semantic.invalidCondition",
  "semantic.integerLiteralOutOfRange": "diagnostics.semantic.integerLiteralOutOfRange",
  "semantic.forwardDeclarationUnsupported": "diagnostics.semantic.forwardDeclarationUnsupported",
  "semantic.unsupportedDoubleArithmetic": "diagnostics.semantic.unsupportedDoubleArithmetic",
  "semantic.unsupportedDoubleComparison": "diagnostics.semantic.unsupportedDoubleComparison",
  "semantic.unsupportedDoubleParameter": "diagnostics.semantic.unsupportedDoubleParameter",
  "semantic.unsupportedDoubleReturn": "diagnostics.semantic.unsupportedDoubleReturn",
  "semantic.incompatibleScalarAssignment": "diagnostics.semantic.incompatibleScalarAssignment",
  "semantic.invalidFloatingLiteral": "diagnostics.semantic.invalidFloatingLiteral",
  "semantic.floatingLiteralOutOfRange": "diagnostics.semantic.floatingLiteralOutOfRange",
  "semantic.unsupportedFloatingSuffix": "diagnostics.semantic.unsupportedFloatingSuffix",
  "semantic.unsupportedDoubleArray": "diagnostics.semantic.unsupportedDoubleArray",
  "transpiler.tooManyRegisterArguments": "diagnostics.transpiler.tooManyRegisterArguments",
  "transpiler.unsupportedCallArgument": "diagnostics.transpiler.unsupportedCallArgument",
  "transpiler.unsupportedExpression": "diagnostics.transpiler.unsupportedExpression",
  "transpiler.generatedLabelConflict": "diagnostics.transpiler.generatedLabelConflict",
  "transpiler.internalLoweringFailure": "diagnostics.transpiler.internalLoweringFailure",
  "vm.notLoaded": "diagnostics.vm.notLoaded",
  "vm.stepLimitReached": "diagnostics.vm.stepLimitReached",
  "vm.invalidInstruction": "diagnostics.vm.invalidInstruction",
  "vm.invalidMemoryAccess": "diagnostics.vm.invalidMemoryAccess",
  "vm.stackUnderflow": "diagnostics.vm.stackUnderflow",
  "vm.stackOverflow": "diagnostics.vm.stackOverflow"
} as const satisfies Record<DiagnosticCode, AnyTranslationKey>;

export function renderDiagnostic(diagnostic: Diagnostic, locale: SupportedLocale): RenderedDiagnostic | Diagnostic {
  const normalized = normalizeDiagnostic(diagnostic);
  if (!normalized.code) return normalized;
  const fallbackMessage = normalized.fallbackMessage ?? normalized.message ?? normalized.code;
  try {
    const localized = translate(locale, diagnosticTranslationKeys[normalized.code], paramsForTranslation(normalized.params));
    const message = /\{[a-zA-Z][a-zA-Z0-9_]*\}/.test(localized) ? fallbackMessage : localized;
    return {
      line: normalized.line,
      code: normalized.code,
      producer: normalized.producer!,
      severity: normalized.severity,
      params: normalized.params ?? {},
      sourceRange: normalized.sourceRange,
      relatedLocations: normalized.relatedLocations,
      fileName: normalized.fileName,
      rawContext: normalized.rawContext,
      fallbackMessage,
      message
    };
  } catch {
    return { ...normalized, message: fallbackMessage };
  }
}

export function diagnosticIdentity(diagnostic: Diagnostic): string {
  const normalized = normalizeDiagnostic(diagnostic);
  const params = Object.entries(normalized.params ?? {}).sort(([left], [right]) => left.localeCompare(right));
  const range = normalized.sourceRange
    ? `${normalized.sourceRange.start.line}:${normalized.sourceRange.start.column}-${normalized.sourceRange.end.line}:${normalized.sourceRange.end.column}`
    : `line:${normalized.line}`;
  const related = (normalized.relatedLocations ?? []).map((location) => [
    location.sourceRange.start.line,
    location.sourceRange.start.column,
    location.sourceRange.start.offset ?? null,
    location.sourceRange.end.line,
    location.sourceRange.end.column,
    location.sourceRange.end.offset ?? null,
    location.fileName ?? ""
  ]);
  return JSON.stringify([normalized.producer ?? "legacy", normalized.code ?? "legacy", normalized.severity, range, params, related, normalized.fileName ?? ""]);
}

function paramsForTranslation(params: AnyDiagnosticParams | undefined): Record<string, string | number | boolean> {
  return Object.fromEntries(Object.entries(params ?? {}).map(([name, value]) => [name, formatDiagnosticParam(name, value)]));
}
