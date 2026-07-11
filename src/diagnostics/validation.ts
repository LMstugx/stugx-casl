import type { Diagnostic } from "../core/types";
import { isValidSourceRange } from "./sourceRange";
import { diagnosticSchemas, matchesParamType } from "./schema";
import type { DiagnosticCode, DiagnosticParamValue, DiagnosticRelatedLocation, DiagnosticSeverity } from "./types";
import { isDiagnosticCode } from "./types";

export type DiagnosticValidationResult =
  | { kind: "structured"; diagnostic: Diagnostic; issues: readonly string[] }
  | { kind: "legacy"; diagnostic: Diagnostic; issues: readonly string[] }
  | { kind: "invalid"; diagnostic: Diagnostic; issues: readonly string[] };

const unsafeKeys = new Set(["__proto__", "constructor", "prototype"]);

export function validateDiagnosticPayload(payload: unknown): DiagnosticValidationResult {
  const issues: string[] = [];
  if (!isPlainRecord(payload)) return invalidLegacy("Invalid diagnostic payload", issues.concat("payload must be an object"));
  const line = validLine(payload.line) ? payload.line : 0;
  const message = typeof payload.message === "string" ? payload.message : String(payload.message ?? "Invalid diagnostic payload");
  const severity = isSeverity(payload.severity) ? payload.severity : "error";
  const legacy = legacyDiagnostic(line, message, severity, payload);
  if (payload.code === undefined) return { kind: "legacy", diagnostic: legacy, issues };
  if (!isDiagnosticCode(payload.code)) return { kind: "invalid", diagnostic: legacy, issues: ["unknown diagnostic code"] };
  if (!isPlainRecord(payload.params) || hasUnsafeKeys(payload.params)) {
    return { kind: "invalid", diagnostic: legacy, issues: ["params must be a safe plain object"] };
  }

  const schema = diagnosticSchemas[payload.code];
  const params: Record<string, DiagnosticParamValue> = {};
  for (const [name, type] of Object.entries(schema.required)) {
    const value = payload.params[name];
    if (!isParamValue(value) || !matchesParamType(value, type)) issues.push(`missing or invalid required param: ${name}`);
    else params[name] = value;
  }
  for (const [name, value] of Object.entries(payload.params)) {
    if (unsafeKeys.has(name)) issues.push(`unsafe param: ${name}`);
    else if (name in schema.required) continue;
    else if (name in schema.optional) {
      if (isParamValue(value) && matchesParamType(value, schema.optional[name as keyof typeof schema.optional])) params[name] = value;
      else issues.push(`invalid optional param: ${name}`);
    } else issues.push(`unknown extra param: ${name}`);
  }
  if (issues.some((issue) => issue.startsWith("missing") || issue.startsWith("unsafe") || issue.startsWith("invalid optional"))) {
    return { kind: "invalid", diagnostic: legacy, issues };
  }

  const sourceRange = isValidSourceRange(payload.sourceRange) ? payload.sourceRange : undefined;
  if (payload.sourceRange !== undefined && !sourceRange) issues.push("invalid sourceRange removed");
  const relatedLocations = validateRelatedLocations(payload.relatedLocations, issues);
  return {
    kind: "structured",
    diagnostic: {
      ...legacy,
      code: payload.code,
      params: params as never,
      ...(sourceRange ? { sourceRange } : {}),
      ...(relatedLocations.length ? { relatedLocations } : {})
    },
    issues
  };
}

function legacyDiagnostic(line: number, message: string, severity: DiagnosticSeverity, payload: Record<string, unknown>): Diagnostic {
  const sourceRange = isValidSourceRange(payload.sourceRange) ? payload.sourceRange : undefined;
  const relatedIssues: string[] = [];
  const relatedLocations = validateRelatedLocations(payload.relatedLocations, relatedIssues);
  return {
    line,
    message,
    severity,
    ...(typeof payload.fileName === "string" ? { fileName: payload.fileName } : {}),
    ...(typeof payload.rawContext === "string" ? { rawContext: payload.rawContext } : {}),
    ...(typeof payload.fallbackMessage === "string" ? { fallbackMessage: payload.fallbackMessage } : {}),
    ...(sourceRange ? { sourceRange } : {}),
    ...(relatedLocations.length ? { relatedLocations } : {})
  };
}

function validateRelatedLocations(value: unknown, issues: string[]): DiagnosticRelatedLocation[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    issues.push("invalid relatedLocations removed");
    return [];
  }
  return value.flatMap((entry) => {
    if (!isPlainRecord(entry) || !isValidSourceRange(entry.sourceRange)) {
      issues.push("invalid related location removed");
      return [];
    }
    return [{ sourceRange: entry.sourceRange, ...(typeof entry.label === "string" ? { label: entry.label } : {}), ...(typeof entry.fileName === "string" ? { fileName: entry.fileName } : {}) }];
  });
}

function invalidLegacy(message: string, issues: string[]): DiagnosticValidationResult {
  return { kind: "invalid", diagnostic: { line: 0, message, severity: "error" }, issues };
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasUnsafeKeys(value: Record<string, unknown>): boolean {
  return Object.keys(value).some((key) => unsafeKeys.has(key));
}

function validLine(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isSeverity(value: unknown): value is DiagnosticSeverity {
  return value === "error" || value === "warning" || value === "info";
}

function isParamValue(value: unknown): value is DiagnosticParamValue {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}
