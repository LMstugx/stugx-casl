import type { Diagnostic } from "../core/types";
import type { DiagnosticCode, DiagnosticParams } from "./types";
import { isDiagnosticCode } from "./types";

type DiagnosticInput = Pick<Diagnostic, "line" | "message" | "severity"> &
  Partial<Omit<Diagnostic, "line" | "message" | "severity" | "code">> & { code?: string };

export function createStructuredDiagnostic(
  line: number,
  message: string,
  code: DiagnosticCode,
  params: DiagnosticParams = {},
  severity: Diagnostic["severity"] = "error"
): Diagnostic {
  return { line, message, fallbackMessage: message, severity, code, params };
}

export function normalizeDiagnostic(input: DiagnosticInput): Diagnostic {
  const diagnostic: Diagnostic = {
    line: input.line,
    message: input.message,
    severity: input.severity,
    ...(input.code && isDiagnosticCode(input.code) ? { code: input.code } : {}),
    ...(input.params ? { params: { ...input.params } } : {}),
    ...(input.sourceRange ? { sourceRange: input.sourceRange } : {}),
    ...(input.fileName ? { fileName: input.fileName } : {}),
    ...(input.rawContext ? { rawContext: input.rawContext } : {}),
    ...(input.fallbackMessage ? { fallbackMessage: input.fallbackMessage } : {})
  };
  if (diagnostic.code) return diagnostic;

  const structured = classifyLegacyMessage(diagnostic.message);
  if (!structured) return diagnostic;
  return {
    ...diagnostic,
    code: structured.code,
    params: structured.params,
    fallbackMessage: diagnostic.fallbackMessage ?? diagnostic.message
  };
}

export function normalizeDiagnostics(diagnostics: readonly DiagnosticInput[]): Diagnostic[] {
  return diagnostics.map(normalizeDiagnostic);
}

function classifyLegacyMessage(message: string): { code: DiagnosticCode; params: DiagnosticParams } | null {
  if (message === "CASL source must contain START directive") return match("assembler.missingStart");
  if (message === "CASL source must contain END directive") return match("assembler.missingEnd");
  if (message === "Malformed operand list near comma") return match("assembler.malformedOperandList");
  if (message === "GR0 cannot be used as an index register") return match("assembler.invalidIndexRegister", { indexRegister: "GR0" });
  if (message === "C++ subset program must define int main().") return match("semantic.mainFunctionMissing");
  if (message === "break is only supported inside a loop") return match("semantic.breakOutsideLoop");
  if (message === "continue is only supported inside a loop") return match("semantic.continueOutsideLoop");
  if (message === "parameter name conflicts with local variable") return match("semantic.parameterLocalConflict");
  if (message === "only up to three function parameters are supported yet") {
    return match("transpiler.tooManyRegisterArguments", { maximum: 3 });
  }
  if (message === "complex function call arguments are not supported yet") return match("transpiler.unsupportedCallArgument");
  if (message === "recursive function calls are not supported yet") return match("semantic.recursionUnsupported");
  if (message === "function call argument count mismatch") return match("semantic.argumentCountMismatch");
  if (message === "No program loaded") return match("vm.notLoaded");
  if (message === "Max steps reached" || message === "Max steps reached before execution") return match("vm.stepLimitReached");
  if (message === "Illegal opcode" || message === "No instruction at PR") return match("vm.invalidInstruction");

  const patterns: Array<[RegExp, DiagnosticCode, string]> = [
    [/^Unknown opcode:\s*(.+)$/i, "assembler.unknownOpcode", "opcode"],
    [/^Unsupported or missing operation$/i, "assembler.unknownOpcode", "opcode"],
    [/^(?:Undefined label|Undefined symbol):\s*(.+)$/i, "assembler.unknownSymbol", "symbol"],
    [/^Duplicate label:\s*(.+)$/i, "assembler.duplicateLabel", "label"],
    [/^(?:Invalid register|Unsupported register)\s*:?\s*(.+)$/i, "assembler.invalidRegister", "register"],
    [/^Invalid index register:\s*(.+)$/i, "assembler.invalidIndexRegister", "indexRegister"],
    [/^(?:Address operand|DS address|DC address|Program memory).*out of (?:16-bit )?range(?::\s*(.+))?$/i, "assembler.addressOutOfRange", "value"],
    [/^(?:Numeric value|DC value|Integer literal).*out(?:side)? .*range(?::\s*(.+))?\.?$/i, "assembler.literalOutOfRange", "value"],
    [/^Invalid numeric (?:literal|value)(?: for (?:DC|DS))?:\s*(.*)$/i, "assembler.literalOutOfRange", "value"],
    [/^Duplicate function declaration:\s*(.+)$/i, "semantic.duplicateFunction", "function"],
    [/^Function '([^']+)' is not defined\.$/i, "semantic.unknownFunction", "function"],
    [/^(?:Variable '([^']+)' is used before declaration|Assignment target '([^']+)' is not declared)\.?$/i, "semantic.unknownVariable", "variable"]
  ];
  for (const [pattern, code, paramName] of patterns) {
    const captured = pattern.exec(message);
    if (!captured) continue;
    const value = captured.slice(1).find((part) => part !== undefined && part !== "");
    return match(code, value === undefined ? {} : { [paramName]: value });
  }

  const operandCount = /^([A-Z]+) (?:requires .+ operands?|has too many operands|does not support index operands)$/i.exec(message);
  if (operandCount) return match("assembler.invalidOperandCount", { mnemonic: operandCount[1].toUpperCase() });
  return null;
}

function match(code: DiagnosticCode, params: DiagnosticParams = {}): { code: DiagnosticCode; params: DiagnosticParams } {
  return { code, params };
}
