import type { Diagnostic } from "../core/types";
import { translate } from "../i18n/resources";
import type { AnyTranslationKey, SupportedLocale } from "../i18n/types";
import { normalizeDiagnostic } from "./catalog";
import type { DiagnosticCode, DiagnosticParams, RenderedDiagnostic } from "./types";

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
  "semantic.mainFunctionMissing": "diagnostics.semantic.mainFunctionMissing",
  "semantic.duplicateFunction": "diagnostics.semantic.duplicateFunction",
  "semantic.unknownFunction": "diagnostics.semantic.unknownFunction",
  "semantic.unknownVariable": "diagnostics.semantic.unknownVariable",
  "semantic.argumentCountMismatch": "diagnostics.semantic.argumentCountMismatch",
  "semantic.recursionUnsupported": "diagnostics.semantic.recursionUnsupported",
  "semantic.breakOutsideLoop": "diagnostics.semantic.breakOutsideLoop",
  "semantic.continueOutsideLoop": "diagnostics.semantic.continueOutsideLoop",
  "semantic.parameterLocalConflict": "diagnostics.semantic.parameterLocalConflict",
  "transpiler.tooManyRegisterArguments": "diagnostics.transpiler.tooManyRegisterArguments",
  "transpiler.unsupportedCallArgument": "diagnostics.transpiler.unsupportedCallArgument",
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
      code: normalized.code,
      severity: normalized.severity,
      params: normalized.params ?? {},
      sourceRange: normalized.sourceRange,
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
  return JSON.stringify([normalized.code ?? "legacy", normalized.severity, range, params, normalized.fileName ?? ""]);
}

function paramsForTranslation(params: DiagnosticParams | undefined): Record<string, string | number | boolean> {
  return { ...(params ?? {}) };
}
