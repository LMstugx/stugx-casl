import {
  STARTUP_SELECTION_MAX_BYTES,
  STARTUP_SELECTION_MAX_ID_LENGTH,
  STARTUP_SELECTION_VERSION,
  type StartupSelectionV1
} from "./types";

const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  try {
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  } catch {
    return false;
  }
}

function ownDataValue(object: Record<string, unknown>, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(object, key);
  return descriptor && "value" in descriptor ? descriptor.value : undefined;
}

function utf8ByteLength(value: string): number {
  if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(value).byteLength;
  return unescape(encodeURIComponent(value)).length;
}

function sanitizeExampleId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed !== value || value.length > STARTUP_SELECTION_MAX_ID_LENGTH || CONTROL_CHARACTER_PATTERN.test(value)) return null;
  return value;
}

export function sanitizeStartupSelection(raw: unknown): StartupSelectionV1 | null {
  try {
    if (!isPlainObject(raw)) return null;
    if (ownDataValue(raw, "version") !== STARTUP_SELECTION_VERSION) return null;
    const lastExampleId = sanitizeExampleId(ownDataValue(raw, "lastExampleId"));
    if (!lastExampleId) return null;
    return { version: STARTUP_SELECTION_VERSION, lastExampleId };
  } catch {
    return null;
  }
}

export function parseStartupSelection(raw: string | null): StartupSelectionV1 | null {
  if (raw === null || utf8ByteLength(raw) > STARTUP_SELECTION_MAX_BYTES) return null;
  try {
    return sanitizeStartupSelection(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function serializeStartupSelection(value: StartupSelectionV1): string {
  const sanitized = sanitizeStartupSelection(value);
  if (!sanitized) throw new TypeError("Invalid startup selection.");
  return JSON.stringify({ version: STARTUP_SELECTION_VERSION, lastExampleId: sanitized.lastExampleId });
}
