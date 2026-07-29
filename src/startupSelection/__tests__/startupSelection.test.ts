import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { editDocument } from "../../documents/documentModel";
import { createSequentialDocumentIdFactory } from "../../documents/idFactory";
import { DEFAULT_DEMO_PROGRAM_ID, demoPrograms, getDefaultDemoProgram, getDemoProgram } from "../../examples/demoPrograms";
import { DEFAULT_APPLICATION_PREFERENCES } from "../../preferences/types";
import { createInitialAppState } from "../../store/useAppStore";
import {
  STARTUP_SELECTION_BOOTSTRAP_POLICY,
  STARTUP_SELECTION_CLEAR_POLICY,
  STARTUP_SELECTION_DEFERRED_SESSION_RESTORE,
  STARTUP_SELECTION_FALLBACK_POLICY,
  STARTUP_SELECTION_INDEPENDENT_STORAGE_KEYS,
  STARTUP_SELECTION_PROHIBITED_FIELDS,
  STARTUP_SELECTION_SECURITY_POLICY,
  STARTUP_SELECTION_VALID_SOURCE,
  STARTUP_SELECTION_VALUE_SEMANTICS,
  STARTUP_SELECTION_WRITE_POLICY
} from "../contract";
import { StartupSelectionController } from "../controller";
import { resolveStartupExampleId } from "../resolution";
import { WebLocalStorageStartupSelectionStorage, type StartupSelectionStorage } from "../storage";
import {
  STARTUP_SELECTION_MAX_BYTES,
  STARTUP_SELECTION_PERSISTED_FIELDS,
  STARTUP_SELECTION_STORAGE_KEY,
  STARTUP_SELECTION_VERSION,
  type StartupSelectionV1
} from "../types";
import { parseStartupSelection, sanitizeStartupSelection, serializeStartupSelection } from "../validation";

const baselineRaw = readFileSync("docs/startup-selection-baseline-v1.json", "utf8");
const baseline = JSON.parse(baselineRaw) as Record<string, unknown>;

describe("Phase 16B model and baseline", () => {
  it("startup_selection_baseline_is_deterministic_and_matches_runtime", () => {
    expect(baselineRaw).toBe(`${JSON.stringify(baseline, null, 2)}\n`);
    expect(baseline.baselineVersion).toBe(STARTUP_SELECTION_VERSION);
    expect(baseline.storageKey).toBe(STARTUP_SELECTION_STORAGE_KEY);
    expect(baseline.maxPayloadBytes).toBe(STARTUP_SELECTION_MAX_BYTES);
    expect(baseline.persistedFields).toEqual(STARTUP_SELECTION_PERSISTED_FIELDS);
    expect(baseline.valueSemantics).toBe(STARTUP_SELECTION_VALUE_SEMANTICS);
    expect(baseline.validSource).toBe(STARTUP_SELECTION_VALID_SOURCE);
    expect(baseline.fallbackPolicy).toEqual(STARTUP_SELECTION_FALLBACK_POLICY);
    expect(baseline.prohibitedFields).toEqual(STARTUP_SELECTION_PROHIBITED_FIELDS);
    expect(baseline.independentStorageKeys).toEqual(STARTUP_SELECTION_INDEPENDENT_STORAGE_KEYS);
    expect(baseline.bootstrapPolicy).toEqual(STARTUP_SELECTION_BOOTSTRAP_POLICY);
    expect(baseline.writePolicy).toEqual(STARTUP_SELECTION_WRITE_POLICY);
    expect(baseline.clearPolicy).toEqual(STARTUP_SELECTION_CLEAR_POLICY);
    expect(baseline.securityPolicy).toEqual(STARTUP_SELECTION_SECURITY_POLICY);
    expect(baseline.deferredSessionRestore).toEqual(STARTUP_SELECTION_DEFERRED_SESSION_RESTORE);
  });

  it("startup_selection_baseline_is_not_runtime_source", () => {
    for (const path of ["src/App.tsx", "src/store/useAppStore.tsx", "src/startupSelection/controller.ts", "src/startupSelection/resolution.ts"]) {
      expect(readFileSync(path, "utf8")).not.toContain("startup-selection-baseline-v1.json");
    }
  });

  it("frozen_phase14_phase15_and_phase16a_baselines_are_unchanged", () => {
    const diagnostics = JSON.parse(readFileSync("docs/diagnostic-localization-baseline-v1.json", "utf8")) as { structuredDiagnostics: unknown[] };
    const fileLifecycle = JSON.parse(readFileSync("docs/file-lifecycle-baseline-v1.json", "utf8")) as { baselineVersion: number };
    const preferences = JSON.parse(readFileSync("docs/application-preferences-baseline-v1.json", "utf8")) as { persistedFields: string[] };
    expect(diagnostics.structuredDiagnostics).toHaveLength(76);
    expect(fileLifecycle.baselineVersion).toBe(1);
    expect(preferences.persistedFields).toEqual(["observationMode", "circuitFocusEnabled", "inspectorActiveTab", "outputDockActiveTab"]);
  });
});

describe("Phase 16B parsing and security", () => {
  it("parses_valid_allowlisted_payload", () => {
    expect(parseStartupSelection('{"version":1,"lastExampleId":"cpp-addition","source":"ignored"}')).toEqual({
      version: 1,
      lastExampleId: "cpp-addition"
    });
  });

  it.each(["{", "null", "[]", "3", '{"version":2,"lastExampleId":"cpp-addition"}', '{"version":1,"lastExampleId":""}', '{"version":1,"lastExampleId":" cpp-addition "}', '{"version":1,"lastExampleId":"bad\\u0000id"}'])
    ("rejects malformed primitive unknown-version or unsafe payload %s", (raw) => {
      expect(parseStartupSelection(raw)).toBeNull();
    });

  it("rejects_oversized_payload", () => {
    expect(parseStartupSelection(`{"version":1,"lastExampleId":"${"x".repeat(STARTUP_SELECTION_MAX_BYTES)}"}`)).toBeNull();
  });

  it("does_not_execute_getters_or_merge_prototype_keys", () => {
    const raw = Object.create(null) as Record<string, unknown>;
    Object.defineProperty(raw, "version", { value: 1, enumerable: true });
    Object.defineProperty(raw, "lastExampleId", { get: () => { throw new Error("getter executed"); }, enumerable: true });
    Object.defineProperty(raw, "__proto__", { value: { polluted: true }, enumerable: true });
    expect(sanitizeStartupSelection(raw)).toBeNull();
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
  });

  it("serializer_outputs_allowlist_only_in_stable_order", () => {
    const serialized = serializeStartupSelection({
      version: 1,
      lastExampleId: "cpp-addition",
      locale: "ja" as never,
      sourceContent: "secret" as never,
      applicationPreferences: {} as never
    } as StartupSelectionV1);
    expect(serialized).toBe('{"version":1,"lastExampleId":"cpp-addition"}');
    expect(serialized).not.toMatch(/locale|source|preference|path|handle/i);
  });
});

describe("Phase 16B example resolution", () => {
  it("resolves_only_exact_canonical_registry_ids", () => {
    expect(resolveStartupExampleId("cpp-addition", demoPrograms, DEFAULT_DEMO_PROGRAM_ID)).toEqual({ status: "resolved", exampleId: "cpp-addition", source: "stored" });
    for (const unsafe of ["external", "custom", "untitled", "C++: Addition", "constructor", "../cpp-addition", "cpp-addition "]) {
      expect(resolveStartupExampleId(unsafe, demoPrograms, DEFAULT_DEMO_PROGRAM_ID)).toEqual({ status: "resolved", exampleId: DEFAULT_DEMO_PROGRAM_ID, source: "default" });
    }
  });

  it("invalid_or_deleted_id_uses_default", () => {
    expect(resolveStartupExampleId("deleted-example", demoPrograms, DEFAULT_DEMO_PROGRAM_ID)).toEqual({ status: "resolved", exampleId: DEFAULT_DEMO_PROGRAM_ID, source: "default" });
  });

  it("missing_default_uses_first_registry_entry_and_empty_registry_is_safe", () => {
    expect(resolveStartupExampleId("missing", [{ id: "first" }, { id: "second" }], "deleted")).toEqual({ status: "resolved", exampleId: "first", source: "registry-fallback" });
    expect(resolveStartupExampleId("missing", [], "deleted")).toEqual({ status: "unavailable" });
  });

  it("does_not_match_title_or_source_content", () => {
    const program = demoPrograms[1];
    expect(resolveStartupExampleId(program.name, demoPrograms, DEFAULT_DEMO_PROGRAM_ID)).toEqual({ status: "resolved", exampleId: DEFAULT_DEMO_PROGRAM_ID, source: "default" });
    expect(resolveStartupExampleId(program.source, demoPrograms, DEFAULT_DEMO_PROGRAM_ID)).toEqual({ status: "resolved", exampleId: DEFAULT_DEMO_PROGRAM_ID, source: "default" });
  });
});

describe("Phase 16B storage and controller", () => {
  it("storage_reads_writes_and_clears_only_startup_selection", () => {
    const values = new Map<string, string>([
      ["stugx.casl.locale", "ja"],
      ["stugx.casl.preferences.v1", '{"version":1}']
    ]);
    const storage = new WebLocalStorageStartupSelectionStorage(() => mapStorage(values));
    expect(storage.read()).toBeNull();
    storage.write({ version: 1, lastExampleId: "cpp-addition" });
    expect(values.get(STARTUP_SELECTION_STORAGE_KEY)).toBe('{"version":1,"lastExampleId":"cpp-addition"}');
    storage.clear();
    expect(values.has(STARTUP_SELECTION_STORAGE_KEY)).toBe(false);
    expect(values.get("stugx.casl.locale")).toBe("ja");
    expect(values.has("stugx.casl.preferences.v1")).toBe(true);
  });

  it("storage_failures_and_missing_window_are_safe", () => {
    const throwing = new WebLocalStorageStartupSelectionStorage(() => { throw new Error("denied"); });
    expect(throwing.read()).toBeNull();
    expect(() => throwing.write({ version: 1, lastExampleId: "cpp-addition" })).not.toThrow();
    expect(() => throwing.clear()).not.toThrow();
    expect(new WebLocalStorageStartupSelectionStorage(() => null).read()).toBeNull();
  });

  it("bootstrap_hydrates_once_without_rewriting_valid_or_invalid_storage", () => {
    const valid = new FakeStartupStorage({ version: 1, lastExampleId: "cpp-addition" });
    const controller = new StartupSelectionController(valid);
    expect(controller.resolveBootstrap(demoPrograms, DEFAULT_DEMO_PROGRAM_ID)).toEqual({ status: "resolved", exampleId: "cpp-addition", source: "stored" });
    expect(controller.resolveBootstrap(demoPrograms, DEFAULT_DEMO_PROGRAM_ID)).toEqual({ status: "resolved", exampleId: "cpp-addition", source: "stored" });
    expect(valid.reads).toBe(1);
    expect(valid.writes).toBe(0);

    const invalid = new FakeStartupStorage({ version: 1, lastExampleId: "deleted" });
    expect(new StartupSelectionController(invalid).resolveBootstrap(demoPrograms, DEFAULT_DEMO_PROGRAM_ID)).toEqual({ status: "resolved", exampleId: DEFAULT_DEMO_PROGRAM_ID, source: "default" });
    expect(invalid.writes).toBe(0);
  });

  it("persists_only_successful_valid_example_and_suppresses_same_id", () => {
    const storage = new FakeStartupStorage(null);
    const controller = new StartupSelectionController(storage);
    controller.hydrate();
    expect(controller.persistSuccessfulExample("cpp-addition", demoPrograms)).toBe(true);
    expect(storage.value).toEqual({ version: 1, lastExampleId: "cpp-addition" });
    expect(controller.persistSuccessfulExample("cpp-addition", demoPrograms)).toBe(false);
    expect(controller.persistSuccessfulExample("external", demoPrograms)).toBe(false);
    expect(storage.writes).toBe(1);
  });

  it("write_and_clear_failures_do_not_throw_or_touch_other_storage", () => {
    const controller = new StartupSelectionController({
      read: () => null,
      write: () => { throw new Error("quota"); },
      clear: () => { throw new Error("denied"); }
    });
    expect(() => controller.persistSuccessfulExample("cpp-addition", demoPrograms)).not.toThrow();
    expect(() => controller.clear()).not.toThrow();
  });

  it("controller_revalidates_custom_adapter_payloads", () => {
    const storage = {
      read: () => ({ version: 1, lastExampleId: "cpp-addition", sourceContent: "ignored" }),
      write: () => undefined,
      clear: () => undefined
    } as unknown as StartupSelectionStorage;
    expect(new StartupSelectionController(storage).hydrate()).toEqual({ version: 1, lastExampleId: "cpp-addition" });
  });
});

describe("Phase 16B restored working document", () => {
  it("creates_one_clean_example_document_without_runtime_derived_state", () => {
    const program = getDemoProgram("cpp-addition")!;
    const state = createInitialAppState(createSequentialDocumentIdFactory("startup"), DEFAULT_APPLICATION_PREFERENCES, program);
    expect(state.selectedDemoProgramId).toBe(program.id);
    expect(state.sourceText).toBe(program.source);
    expect(state.currentDocument.origin).toBe("example");
    expect(state.currentDocument.content).toBe(program.source);
    expect(state.currentDocument.revision).toBe(0);
    expect(state.currentDocument.savedRevision).toBe(0);
    expect(state.currentDocument.saveCapability).toBe("save-as-only");
    expect(state.isSourceDirty).toBe(false);
    expect(state.cometState.runState).toBe("Idle");
    expect(state.cometState.assembled).toBe(false);
    expect(state.diagnostics).toEqual([]);
    expect(state.generatedCaslSource).toBe("");
    expect(state.cppToCaslMapping).toEqual([]);
    expect(state.assembleResult).toBeNull();
    expect(state.currentWriteBinding).toBeNull();
  });

  it("creates_new_ids_and_keeps_registry_definition_immutable", () => {
    const program = getDemoProgram("cpp-addition")!;
    const first = createInitialAppState(createSequentialDocumentIdFactory("first"), DEFAULT_APPLICATION_PREFERENCES, program);
    const second = createInitialAppState(createSequentialDocumentIdFactory("second"), DEFAULT_APPLICATION_PREFERENCES, program);
    expect(first.currentDocument.documentId).not.toBe(second.currentDocument.documentId);
    expect(first.currentDocument.sourceUnitId).not.toBe(second.currentDocument.sourceUnitId);
    const source = program.source;
    const edited = editDocument(first.currentDocument, `${source}\n// local edit`);
    expect(edited.content).not.toBe(source);
    expect(program.source).toBe(source);
    expect(getDefaultDemoProgram().id).toBe(DEFAULT_DEMO_PROGRAM_ID);
  });

  it("empty_registry_bootstrap_can_use_safe_untitled_factory", () => {
    const state = createInitialAppState(createSequentialDocumentIdFactory("empty-registry"), DEFAULT_APPLICATION_PREFERENCES, null);
    expect(state.currentDocument.origin).toBe("untitled");
    expect(state.currentDocument.content).toBe("");
    expect(state.currentDocument.saveCapability).toBe("save-as-only");
    expect(state.selectedDemoProgramId).toBe("");
    expect(state.cometState.runState).toBe("Idle");
    expect(state.diagnostics).toEqual([]);
  });
});

class FakeStartupStorage implements StartupSelectionStorage {
  reads = 0;
  writes = 0;
  constructor(public value: StartupSelectionV1 | null) {}
  read() { this.reads += 1; return this.value; }
  write(value: StartupSelectionV1) { this.writes += 1; this.value = value; }
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
