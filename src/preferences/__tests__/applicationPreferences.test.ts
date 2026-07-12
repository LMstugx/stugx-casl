import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ApplicationPreferenceController } from "../controller";
import {
  INDEPENDENTLY_PERSISTED_PREFERENCE_FIELDS,
  PHASE_16B_DEFERRED_FIELDS,
  PREFERENCE_HYDRATION_POLICY,
  PREFERENCE_RESET_POLICY,
  PREFERENCE_SECURITY_POLICY,
  PREFERENCE_WRITE_POLICY,
  PROHIBITED_APPLICATION_PREFERENCE_FIELDS
} from "../contract";
import { WebLocalStorageApplicationPreferenceStorage, type ApplicationPreferenceStorage } from "../storage";
import {
  APPLICATION_PREFERENCE_FIELDS,
  APPLICATION_PREFERENCES_STORAGE_KEY,
  APPLICATION_PREFERENCES_VERSION,
  DEFAULT_APPLICATION_PREFERENCES,
  INSPECTOR_ACTIVE_TABS,
  MAX_APPLICATION_PREFERENCES_BYTES,
  OBSERVATION_MODES,
  OUTPUT_DOCK_ACTIVE_TABS,
  type ApplicationPreferencesV1
} from "../types";
import { parseApplicationPreferences, sanitizeApplicationPreferences, serializeApplicationPreferences } from "../validation";

const baselineRaw = readFileSync("docs/application-preferences-baseline-v1.json", "utf8");
const baseline = JSON.parse(baselineRaw) as Record<string, unknown>;
const inventory = readFileSync("docs/application-preference-inventory.md", "utf8");
const diagnosticBaseline = JSON.parse(readFileSync("docs/diagnostic-localization-baseline-v1.json", "utf8")) as { structuredDiagnostics: unknown[] };
const fileLifecycleBaseline = JSON.parse(readFileSync("docs/file-lifecycle-baseline-v1.json", "utf8")) as { baselineVersion: number };
const fileLifecycleMatrix = JSON.parse(readFileSync("docs/file-lifecycle-operation-matrix-v1.json", "utf8")) as { coverage: { totalCombinations: number } };

describe("Phase 16A inventory and baseline", () => {
  it("baseline_manifest_is_deterministic_and_matches_runtime", () => {
    expect(baselineRaw).toBe(`${JSON.stringify(baseline, null, 2)}\n`);
    expect(baseline.baselineVersion).toBe(APPLICATION_PREFERENCES_VERSION);
    expect(baseline.storageKey).toBe(APPLICATION_PREFERENCES_STORAGE_KEY);
    expect(baseline.maxPayloadBytes).toBe(MAX_APPLICATION_PREFERENCES_BYTES);
    expect(baseline.persistedFields).toEqual(APPLICATION_PREFERENCE_FIELDS);
    expect((baseline.fieldEnums as Record<string, unknown>).observationMode).toEqual(OBSERVATION_MODES);
    expect((baseline.fieldEnums as Record<string, unknown>).inspectorActiveTab).toEqual(INSPECTOR_ACTIVE_TABS);
    expect((baseline.fieldEnums as Record<string, unknown>).outputDockActiveTab).toEqual(OUTPUT_DOCK_ACTIVE_TABS);
    expect(baseline.defaults).toEqual(DEFAULT_APPLICATION_PREFERENCES);
    expect(baseline.independentlyPersistedFields).toEqual(INDEPENDENTLY_PERSISTED_PREFERENCE_FIELDS);
    expect(baseline.prohibitedFields).toEqual(PROHIBITED_APPLICATION_PREFERENCE_FIELDS);
    expect(baseline.hydrationPolicy).toEqual(PREFERENCE_HYDRATION_POLICY);
    expect(baseline.writePolicy).toEqual(PREFERENCE_WRITE_POLICY);
    expect(baseline.resetPolicy).toEqual(PREFERENCE_RESET_POLICY);
    expect(baseline.securityPolicy).toEqual(PREFERENCE_SECURITY_POLICY);
    expect(baseline.phase16BDeferredFields).toEqual(PHASE_16B_DEFERRED_FIELDS);
  });

  it("baseline_is_not_a_runtime_source", () => {
    for (const path of ["src/App.tsx", "src/store/useAppStore.tsx", "src/preferences/controller.ts", "src/preferences/storage.ts"]) {
      expect(readFileSync(path, "utf8")).not.toContain("application-preferences-baseline-v1.json");
    }
  });

  it("phase14_and_phase15_frozen_baselines_remain_intact", () => {
    expect(diagnosticBaseline.structuredDiagnostics).toHaveLength(55);
    expect(fileLifecycleBaseline.baselineVersion).toBe(1);
    expect(fileLifecycleMatrix.coverage.totalCombinations).toBe(112);
  });

  it("inventory_classifies_every_required_candidate", () => {
    for (const candidate of [
      "locale", "theme / appearance", "Observation Mode", "Circuit Focus enabled", "Inspector active tab", "Output Dock active tab",
      "Source panel mode", "selected built-in example", "lesson progress", "panel details expanded", "Memory start address", "Memory row count",
      "selected diagnostic", "selected FrameSlot", "selected Machine Code row", "editor cursor/selection", "source content/document state", "file lifecycle/pending replacement"
    ]) expect(inventory, candidate).toContain(`| ${candidate} |`);
    for (const decision of ["persist-now", "remain-memory-only", "independently-persisted", "source-owned", "runtime-owned", "transient-operation", "prohibited-sensitive", "deferred-source-affecting"]) {
      expect(inventory).toContain(decision);
    }
    expect(inventory).toContain("`lastExampleId` is explicitly deferred to Phase 16B");
  });
});

describe("Phase 16A parsing and security", () => {
  it("parses_valid_v1_preferences", () => {
    expect(parseApplicationPreferences(JSON.stringify({ version: 1, observationMode: "register-stack", circuitFocusEnabled: true, inspectorActiveTab: "memory", outputDockActiveTab: "messages" }))).toEqual({
      version: 1, observationMode: "register-stack", circuitFocusEnabled: true, inspectorActiveTab: "memory", outputDockActiveTab: "messages"
    });
  });

  it.each(["{", "null", "[]", "7", JSON.stringify({ version: 2, observationMode: "cpu-flow" })])("rejects malformed primitive array or unknown version payload %s", (raw) => {
    expect(parseApplicationPreferences(raw)).toBeNull();
  });

  it("keeps_valid_fields_while_ignoring_unknown_and_invalid_fields", () => {
    expect(sanitizeApplicationPreferences({ version: 1, observationMode: "code-machine", circuitFocusEnabled: "yes", inspectorActiveTab: "bad", outputDockActiveTab: "console", sourceContent: "secret" })).toEqual({
      version: 1, observationMode: "code-machine", outputDockActiveTab: "console"
    });
  });

  it("rejects_oversized_payload", () => {
    const raw = JSON.stringify({ version: 1, ignored: "x".repeat(MAX_APPLICATION_PREFERENCES_BYTES) });
    expect(parseApplicationPreferences(raw)).toBeNull();
  });

  it("does_not_execute_getters_or_merge_prototype_keys", () => {
    const raw = Object.create(null) as Record<string, unknown>;
    Object.defineProperty(raw, "version", { value: 1, enumerable: true });
    Object.defineProperty(raw, "observationMode", { get: () => { throw new Error("getter executed"); }, enumerable: true });
    Object.defineProperty(raw, "__proto__", { value: { polluted: true }, enumerable: true });
    expect(sanitizeApplicationPreferences(raw)).toEqual({ version: 1 });
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
  });

  it("serializer_outputs_allowlist_only_in_stable_order", () => {
    const raw = serializeApplicationPreferences({
      version: 1,
      observationMode: "cpu-flow",
      circuitFocusEnabled: false,
      inspectorActiveTab: "trace",
      outputDockActiveTab: "machine-code",
      sourceContent: "MAIN START" as never,
      locale: "ja" as never,
      absolutePath: "C:\\secret" as never
    } as ApplicationPreferencesV1);
    expect(raw).toBe('{"version":1,"observationMode":"cpu-flow","circuitFocusEnabled":false,"inspectorActiveTab":"trace","outputDockActiveTab":"machine-code"}');
    expect(raw).not.toMatch(/source|locale|path|handle/i);
  });
});

describe("Phase 16A storage and controller", () => {
  it("web_storage_reads_writes_and_clears_only_the_preference_key", () => {
    const values = new Map<string, string>([["stugx.casl.locale", "ja"]]);
    const storage = mapStorage(values);
    const subject = new WebLocalStorageApplicationPreferenceStorage(() => storage);
    expect(subject.read()).toBeNull();
    subject.write({ version: 1, observationMode: "register-stack" });
    expect(values.get(APPLICATION_PREFERENCES_STORAGE_KEY)).toContain("register-stack");
    subject.clear();
    expect(values.has(APPLICATION_PREFERENCES_STORAGE_KEY)).toBe(false);
    expect(values.get("stugx.casl.locale")).toBe("ja");
  });

  it("storage_failures_and_missing_window_boundary_are_safe", () => {
    const throwing = new WebLocalStorageApplicationPreferenceStorage(() => { throw new Error("denied"); });
    expect(throwing.read()).toBeNull();
    expect(() => throwing.write(DEFAULT_APPLICATION_PREFERENCES)).not.toThrow();
    expect(() => throwing.clear()).not.toThrow();
    const missing = new WebLocalStorageApplicationPreferenceStorage(() => null);
    expect(missing.read()).toBeNull();
    expect(() => missing.write(DEFAULT_APPLICATION_PREFERENCES)).not.toThrow();
  });

  it("controller_hydrates_once_and_suppresses_unchanged_writes", () => {
    const storage = new FakePreferenceStorage({ version: 1, observationMode: "register-stack" });
    const controller = new ApplicationPreferenceController(storage);
    expect(controller.hydrate()).toEqual({ ...DEFAULT_APPLICATION_PREFERENCES, observationMode: "register-stack" });
    expect(controller.hydrate()).toEqual({ ...DEFAULT_APPLICATION_PREFERENCES, observationMode: "register-stack" });
    expect(storage.reads).toBe(1);
    expect(controller.persist({ ...DEFAULT_APPLICATION_PREFERENCES, observationMode: "register-stack" })).toBe(false);
    expect(storage.writes).toBe(0);
    expect(controller.persist({ ...DEFAULT_APPLICATION_PREFERENCES, observationMode: "code-machine" })).toBe(true);
    expect(storage.writes).toBe(1);
  });

  it("write_and_clear_failures_do_not_rollback_controller_state", () => {
    const storage: ApplicationPreferenceStorage = {
      read: () => null,
      write: () => { throw new Error("quota"); },
      clear: () => { throw new Error("denied"); }
    };
    const controller = new ApplicationPreferenceController(storage);
    controller.hydrate();
    expect(() => controller.persist({ ...DEFAULT_APPLICATION_PREFERENCES, circuitFocusEnabled: true })).not.toThrow();
    expect(controller.hydrate().circuitFocusEnabled).toBe(true);
    expect(controller.reset()).toEqual(DEFAULT_APPLICATION_PREFERENCES);
  });
});

class FakePreferenceStorage implements ApplicationPreferenceStorage {
  reads = 0;
  writes = 0;
  constructor(private value: ApplicationPreferencesV1 | null) {}
  read() { this.reads += 1; return this.value; }
  write(value: ApplicationPreferencesV1) { this.writes += 1; this.value = value; }
  clear() { this.value = null; }
}

function mapStorage(values: Map<string, string>): Storage {
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(key); },
    setItem: (key, value) => { values.set(key, value); }
  };
}
