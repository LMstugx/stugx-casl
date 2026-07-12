import {
  APPLICATION_PREFERENCES_VERSION,
  INSPECTOR_ACTIVE_TABS,
  MAX_APPLICATION_PREFERENCES_BYTES,
  OBSERVATION_MODES,
  OUTPUT_DOCK_ACTIVE_TABS,
  type ApplicationPreferencesV1,
  type ResolvedApplicationPreferencesV1
} from "./types";

const unsafeKeys = new Set(["__proto__", "constructor", "prototype"]);

function ownDataValue(record: object, key: string): unknown {
  if (unsafeKeys.has(key)) return undefined;
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  return descriptor && "value" in descriptor ? descriptor.value : undefined;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  try {
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  } catch {
    return false;
  }
}

function isOneOf<T extends string>(value: unknown, values: readonly T[]): value is T {
  return typeof value === "string" && values.includes(value as T);
}

export function sanitizeApplicationPreferences(raw: unknown): ApplicationPreferencesV1 | null {
  if (!isPlainRecord(raw)) return null;
  try {
    if (ownDataValue(raw, "version") !== APPLICATION_PREFERENCES_VERSION) return null;
    const observationMode = ownDataValue(raw, "observationMode");
    const circuitFocusEnabled = ownDataValue(raw, "circuitFocusEnabled");
    const inspectorActiveTab = ownDataValue(raw, "inspectorActiveTab");
    const outputDockActiveTab = ownDataValue(raw, "outputDockActiveTab");
    return {
      version: APPLICATION_PREFERENCES_VERSION,
      ...(isOneOf(observationMode, OBSERVATION_MODES) ? { observationMode } : {}),
      ...(typeof circuitFocusEnabled === "boolean" ? { circuitFocusEnabled } : {}),
      ...(isOneOf(inspectorActiveTab, INSPECTOR_ACTIVE_TABS) ? { inspectorActiveTab } : {}),
      ...(isOneOf(outputDockActiveTab, OUTPUT_DOCK_ACTIVE_TABS) ? { outputDockActiveTab } : {})
    };
  } catch {
    return null;
  }
}

export function parseApplicationPreferences(raw: unknown): ApplicationPreferencesV1 | null {
  if (typeof raw !== "string" || utf8ByteLength(raw) > MAX_APPLICATION_PREFERENCES_BYTES) return null;
  try {
    return sanitizeApplicationPreferences(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function resolveApplicationPreferences(preferences: ApplicationPreferencesV1 | null | undefined): ResolvedApplicationPreferencesV1 {
  return {
    version: APPLICATION_PREFERENCES_VERSION,
    observationMode: preferences?.observationMode ?? "cpu-flow",
    circuitFocusEnabled: preferences?.circuitFocusEnabled ?? false,
    inspectorActiveTab: preferences?.inspectorActiveTab ?? "registers",
    outputDockActiveTab: preferences?.outputDockActiveTab ?? "output"
  };
}

export function serializeApplicationPreferences(preferences: ApplicationPreferencesV1): string {
  const sanitized = sanitizeApplicationPreferences(preferences) ?? { version: APPLICATION_PREFERENCES_VERSION };
  return JSON.stringify({
    version: APPLICATION_PREFERENCES_VERSION,
    ...(sanitized.observationMode ? { observationMode: sanitized.observationMode } : {}),
    ...(typeof sanitized.circuitFocusEnabled === "boolean" ? { circuitFocusEnabled: sanitized.circuitFocusEnabled } : {}),
    ...(sanitized.inspectorActiveTab ? { inspectorActiveTab: sanitized.inspectorActiveTab } : {}),
    ...(sanitized.outputDockActiveTab ? { outputDockActiveTab: sanitized.outputDockActiveTab } : {})
  });
}

function utf8ByteLength(value: string): number {
  if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(value).byteLength;
  return value.length * 3;
}
