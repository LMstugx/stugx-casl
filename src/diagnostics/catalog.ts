import type { Diagnostic } from "../core/types";
import { eofInsertionRange, firstMeaningfulInsertionRange, rangeForTextOnLine, sourceRangeFromOffsets } from "./sourceRange";
import type { DiagnosticCode, DiagnosticParams, DiagnosticParamValue, DiagnosticRelatedLocation } from "./types";
import { validateDiagnosticPayload } from "./validation";

export function createStructuredDiagnostic<C extends DiagnosticCode>(
  line: number,
  message: string,
  code: C,
  params: DiagnosticParams<C>,
  severity: Diagnostic["severity"] = "error",
  metadata: Pick<Diagnostic<C>, "sourceRange" | "relatedLocations" | "fileName" | "rawContext"> = {}
): Diagnostic<C> {
  return { line, message, fallbackMessage: message, severity, code, params, ...metadata };
}

export function normalizeDiagnostic(input: unknown): Diagnostic {
  const validated = validateDiagnosticPayload(input);
  if (validated.kind === "structured") return validated.diagnostic;
  if (!input || typeof input !== "object" || "code" in input) return validated.diagnostic;
  const legacy = validated.diagnostic;
  const structured = classifyLegacyMessage(legacy.message);
  if (!structured) return legacy;
  const retried = validateDiagnosticPayload({
    ...legacy,
    code: structured.code,
    params: structured.params,
    fallbackMessage: legacy.fallbackMessage ?? legacy.message
  });
  return retried.kind === "structured" ? retried.diagnostic : legacy;
}

export function normalizeDiagnostics(diagnostics: readonly unknown[]): Diagnostic[] {
  return diagnostics.map(normalizeDiagnostic);
}

export function normalizeAssemblerDiagnostics(diagnostics: readonly unknown[], source: string): Diagnostic[] {
  const normalized = normalizeDiagnostics(diagnostics);
  const seenLabels = new Map<string, { line: number; range?: ReturnType<typeof rangeForTextOnLine> }>();
  return normalized.map((diagnostic) => {
    if (!diagnostic.code) return diagnostic;
    let sourceRange = diagnostic.sourceRange;
    const params = diagnostic.params ? { ...(diagnostic.params as Readonly<Record<string, DiagnosticParamValue>>) } : undefined;
    if (diagnostic.code === "assembler.missingStart") sourceRange ??= firstMeaningfulInsertionRange(source);
    else if (diagnostic.code === "assembler.missingEnd") sourceRange ??= eofInsertionRange(source);
    else if (diagnostic.code === "assembler.malformedOperandList") sourceRange ??= malformedCommaRange(source, diagnostic.line);
    else {
      const token = tokenForDiagnostic(diagnostic.code, params);
      if (token) sourceRange ??= rangeForTextOnLine(source, diagnostic.line, token);
    }

    let relatedLocations = diagnostic.relatedLocations;
    if (diagnostic.code === "assembler.duplicateLabel" && typeof params?.label === "string") {
      const key = params.label.toUpperCase();
      const first = findFirstLabel(source, params.label, diagnostic.line) ?? seenLabels.get(key);
      if (first?.range) {
        relatedLocations = [{ label: "diagnostic.firstDeclaredHere", sourceRange: first.range }];
        Object.assign(params, { firstLine: first.line, duplicateLine: diagnostic.line });
      }
    }
    if (diagnostic.code === "assembler.duplicateLabel" && typeof params?.label === "string" && sourceRange) {
      seenLabels.set(params.label.toUpperCase(), { line: diagnostic.line, range: sourceRange });
    }
    return { ...diagnostic, ...(params ? { params: params as never } : {}), ...(sourceRange ? { sourceRange } : {}), ...(relatedLocations ? { relatedLocations } : {}) };
  });
}

function classifyLegacyMessage(message: string): { code: DiagnosticCode; params: Record<string, DiagnosticParamValue> } | null {
  if (message === "CASL source must contain START directive") return match("assembler.missingStart");
  if (message === "CASL source must contain END directive") return match("assembler.missingEnd");
  if (message === "Malformed operand list near comma") return match("assembler.malformedOperandList");
  if (message === "GR0 cannot be used as an index register") return match("assembler.invalidIndexRegister", { indexRegister: "GR0" });
  if (message === "C++ subset program must define int main().") return match("semantic.mainFunctionMissing");
  if (message === "break is only supported inside a loop") return match("semantic.breakOutsideLoop");
  if (message === "continue is only supported inside a loop") return match("semantic.continueOutsideLoop");
  if (message === "No program loaded") return match("vm.notLoaded");
  if (message === "Illegal opcode" || message === "No instruction at PR") return match("vm.invalidInstruction");

  const patterns: Array<[RegExp, DiagnosticCode, string]> = [
    [/^Unknown opcode:\s*(.+)$/i, "assembler.unknownOpcode", "opcode"],
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
    const value = captured.slice(1).find(Boolean);
    return match(code, value === undefined ? {} : { [paramName]: value });
  }
  const operandCount = /^([A-Z]+) (?:requires .+ operands?|has too many operands|does not support index operands)$/i.exec(message);
  if (operandCount) return match("assembler.invalidOperandCount", { mnemonic: operandCount[1].toUpperCase() });
  return null;
}

function match(code: DiagnosticCode, params: Record<string, DiagnosticParamValue> = {}) {
  return { code, params };
}

function tokenForDiagnostic(code: DiagnosticCode, params?: Readonly<Record<string, DiagnosticParamValue>>): string | undefined {
  const names: Partial<Record<DiagnosticCode, string>> = {
    "assembler.unknownOpcode": "opcode", "assembler.unknownSymbol": "symbol", "assembler.duplicateLabel": "label",
    "assembler.invalidRegister": "register", "assembler.invalidIndexRegister": "indexRegister",
    "assembler.invalidOperandCount": "mnemonic", "assembler.addressOutOfRange": "value", "assembler.literalOutOfRange": "value"
  };
  const value = names[code] ? params?.[names[code]!] : undefined;
  return value === undefined ? undefined : String(value);
}

function malformedCommaRange(source: string, line: number) {
  const lineInfo = sourceLine(source, line);
  if (!lineInfo) return undefined;
  const comma = lineInfo.text.search(/,\s*(?:,|$)/);
  return comma < 0 ? undefined : sourceRangeFromOffsets(source, lineInfo.offset + comma, lineInfo.offset + comma + 1);
}

function findFirstLabel(source: string, label: string, beforeLine: number): { line: number; range?: ReturnType<typeof rangeForTextOnLine> } | undefined {
  for (let line = 1; line < beforeLine; line += 1) {
    const info = sourceLine(source, line);
    if (info && new RegExp(`^\\s*${escapeRegex(label)}(?:\\s|$)`, "i").test(info.text)) return { line, range: rangeForTextOnLine(source, line, label) };
  }
  return undefined;
}

function sourceLine(source: string, line: number): { text: string; offset: number } | undefined {
  let offset = 0;
  const lines = source.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index];
    if (index + 1 === line) return { text: raw.endsWith("\r") ? raw.slice(0, -1) : raw, offset };
    offset += raw.length + 1;
  }
  return undefined;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
