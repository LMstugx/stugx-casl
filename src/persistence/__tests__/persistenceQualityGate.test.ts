import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { demoPrograms } from "../../examples/demoPrograms";
import { learningLessons } from "../../examples/learningLessons";
import { clearStoredLocale, LOCALE_STORAGE_KEY, LOCALE_STORAGE_MAX_BYTES, WebLocalStorageLocaleStorage } from "../../i18n/localeStorage";
import { normalizeLocale } from "../../i18n/locale";
import { LessonProgressController } from "../../lessonProgress/controller";
import { WebLocalStorageLessonProgressStorage } from "../../lessonProgress/storage";
import { LESSON_PROGRESS_STORAGE_KEY } from "../../lessonProgress/types";
import { resolveLessonProgress } from "../../lessonProgress/model";
import { parseLessonProgress, sanitizeLessonProgress, serializeLessonProgress } from "../../lessonProgress/validation";
import { ApplicationPreferenceController } from "../../preferences/controller";
import { WebLocalStorageApplicationPreferenceStorage } from "../../preferences/storage";
import { APPLICATION_PREFERENCES_STORAGE_KEY } from "../../preferences/types";
import { parseApplicationPreferences, sanitizeApplicationPreferences, serializeApplicationPreferences } from "../../preferences/validation";
import { StartupSelectionController } from "../../startupSelection/controller";
import { WebLocalStorageStartupSelectionStorage } from "../../startupSelection/storage";
import { STARTUP_SELECTION_STORAGE_KEY } from "../../startupSelection/types";
import { parseStartupSelection, sanitizeStartupSelection, serializeStartupSelection } from "../../startupSelection/validation";
import {
  PERSISTENCE_BASELINE_VERSION,
  PERSISTENCE_BOOTSTRAP_ORDER,
  PERSISTENCE_DEFERRED_SESSION_RESTORE,
  PERSISTENCE_FAILURE_ISOLATION_POLICY,
  PERSISTENCE_MIGRATION_POLICY,
  PERSISTENCE_PAYLOAD_LIMITS,
  PERSISTENCE_PROHIBITED_DATA_CATEGORIES,
  PERSISTENCE_RESET_ISOLATION_POLICY,
  PERSISTENCE_SECURITY_POLICY,
  PERSISTENCE_SOURCE_OF_TRUTH_POLICY,
  PERSISTENCE_STORAGE_INVENTORY,
  PERSISTENCE_STORAGE_KEYS,
  PERSISTENCE_VERSION_POLICIES,
  PERSISTENCE_WRITE_TRIGGER_MATRIX
} from "../contract";

const baselineRaw = readFileSync("docs/persistence-baseline-v1.json", "utf8");
const baseline = JSON.parse(baselineRaw) as Record<string, unknown>;

describe("Phase 16D aggregate baseline", () => {
  it("is deterministic and matches all runtime contracts", () => {
    expect(baselineRaw).toBe(`${JSON.stringify(baseline, null, 2)}\n`);
    expect(baseline.baselineVersion).toBe(PERSISTENCE_BASELINE_VERSION);
    expect(baseline.storageKeys).toEqual(PERSISTENCE_STORAGE_KEYS);
    expect(baseline.bootstrapOrder).toEqual(PERSISTENCE_BOOTSTRAP_ORDER);
    expect(baseline.independentContracts).toEqual(PERSISTENCE_STORAGE_INVENTORY);
    expect(baseline.payloadLimits).toEqual(PERSISTENCE_PAYLOAD_LIMITS);
    expect(baseline.prohibitedDataCategories).toEqual(PERSISTENCE_PROHIBITED_DATA_CATEGORIES);
    expect(baseline.versionPolicies).toEqual(PERSISTENCE_VERSION_POLICIES);
    expect(baseline.failureIsolationPolicy).toEqual(PERSISTENCE_FAILURE_ISOLATION_POLICY);
    expect(baseline.resetIsolationPolicy).toEqual(PERSISTENCE_RESET_ISOLATION_POLICY);
    expect(baseline.writeTriggerMatrix).toEqual(PERSISTENCE_WRITE_TRIGGER_MATRIX);
    expect(baseline.securityPolicy).toEqual(PERSISTENCE_SECURITY_POLICY);
    expect(baseline.sourceOfTruthPolicy).toEqual(PERSISTENCE_SOURCE_OF_TRUTH_POLICY);
    expect(baseline.migrationPolicy).toEqual(PERSISTENCE_MIGRATION_POLICY);
    expect(baseline.deferredSessionRestore).toEqual(PERSISTENCE_DEFERRED_SESSION_RESTORE);
  });

  it("is validation-only and leaves every frozen baseline unchanged", () => {
    for (const path of ["src/App.tsx", "src/store/useAppStore.tsx", "src/i18n/localeStorage.ts", "src/preferences/controller.ts", "src/startupSelection/controller.ts", "src/lessonProgress/controller.ts"]) {
      expect(readFileSync(path, "utf8")).not.toContain("persistence-baseline-v1.json");
    }
    expect((JSON.parse(readFileSync("docs/diagnostic-localization-baseline-v1.json", "utf8")) as { structuredDiagnostics: unknown[] }).structuredDiagnostics).toHaveLength(76);
    expect((JSON.parse(readFileSync("docs/file-lifecycle-operation-matrix-v1.json", "utf8")) as { coverage: { totalCombinations: number } }).coverage.totalCombinations).toBe(112);
    expect((JSON.parse(readFileSync("docs/application-preferences-baseline-v1.json", "utf8")) as { persistedFields: string[] }).persistedFields).toEqual(["observationMode", "circuitFocusEnabled", "inspectorActiveTab", "outputDockActiveTab"]);
    expect((JSON.parse(readFileSync("docs/startup-selection-baseline-v1.json", "utf8")) as { persistedFields: string[] }).persistedFields).toEqual(["lastExampleId"]);
    expect((JSON.parse(readFileSync("docs/lesson-progress-baseline-v1.json", "utf8")) as { registrySnapshot: unknown[] }).registrySnapshot).toHaveLength(18);
  });

  it("freezes four independent keys and prohibits a merged session payload", () => {
    expect(new Set(Object.values(PERSISTENCE_STORAGE_KEYS)).size).toBe(4);
    expect(PERSISTENCE_STORAGE_INVENTORY).toHaveLength(4);
    expect(PERSISTENCE_PROHIBITED_DATA_CATEGORIES).toContain("combined-session-payload");
    expect(PERSISTENCE_DEFERRED_SESSION_RESTORE).toContain("source-or-dirty-document");
  });
});

describe("Phase 16D adapter and reset isolation", () => {
  it("each read failure leaves the other three keys readable", () => {
    const initial = validStoredValues();
    for (const failedKey of Object.values(PERSISTENCE_STORAGE_KEYS)) {
      const storage = mapStorage(new Map(initial), { failReadKey: failedKey });
      const values = readAll(storage);
      expect(values[keyName(failedKey)]).toBeNull();
      for (const [name, value] of Object.entries(values)) {
        if (name !== keyName(failedKey)) expect(value).not.toBeNull();
      }
    }
  });

  it("all unavailable storage uses safe defaults without throwing", () => {
    const unavailable = () => null;
    expect(new WebLocalStorageLocaleStorage(unavailable).read()).toBeNull();
    expect(new ApplicationPreferenceController(new WebLocalStorageApplicationPreferenceStorage(unavailable)).hydrate().observationMode).toBe("cpu-flow");
    expect(new StartupSelectionController(new WebLocalStorageStartupSelectionStorage(unavailable)).resolveBootstrap(demoPrograms, "casl-gr2-addition")).toMatchObject({ exampleId: "casl-gr2-addition" });
    expect(new LessonProgressController(new WebLocalStorageLessonProgressStorage(unavailable)).hydrate(learningLessons)).toEqual({});
  });

  it("write failures are isolated and never rewrite another key", () => {
    for (const failedKey of Object.values(PERSISTENCE_STORAGE_KEYS)) {
      const values = new Map(validStoredValues());
      const before = new Map(values);
      const storage = mapStorage(values, { failWriteKey: failedKey });
      expect(() => writeOne(failedKey, storage)).not.toThrow();
      expect(values).toEqual(before);
    }
  });

  it("clear and reset remove only their own key", () => {
    for (const clearedKey of Object.values(PERSISTENCE_STORAGE_KEYS)) {
      const values = new Map(validStoredValues());
      const storage = mapStorage(values);
      clearOne(clearedKey, storage);
      expect(values.has(clearedKey)).toBe(false);
      for (const key of Object.values(PERSISTENCE_STORAGE_KEYS)) {
        if (key !== clearedKey) expect(values.has(key)).toBe(true);
      }
    }
  });

  it("clear failures remain safe and retain in-memory controller results", () => {
    const storage = mapStorage(new Map(validStoredValues()), { failRemove: true });
    expect(() => clearStoredLocale(new WebLocalStorageLocaleStorage(() => storage))).not.toThrow();
    expect(() => new ApplicationPreferenceController(new WebLocalStorageApplicationPreferenceStorage(() => storage)).reset()).not.toThrow();
    expect(() => new StartupSelectionController(new WebLocalStorageStartupSelectionStorage(() => storage)).clear()).not.toThrow();
    expect(() => new LessonProgressController(new WebLocalStorageLessonProgressStorage(() => storage)).clear()).not.toThrow();
  });
});

describe("Phase 16D versions, privacy, and malicious input", () => {
  it("does not guess future versions or lesson compatibility", () => {
    expect(normalizeLocale("future-locale")).toBe("en");
    expect(parseApplicationPreferences('{"version":2,"observationMode":"register-stack"}')).toBeNull();
    expect(parseStartupSelection('{"version":2,"lastExampleId":"cpp-addition"}')).toBeNull();
    expect(parseLessonProgress('{"version":2,"entries":[]}')).toBeNull();
    const payload = parseLessonProgress(JSON.stringify({
      version: 1,
      entries: [
        { lessonId: "casl-gr2-addition", exampleId: "casl-gr2-addition", progressCompatibilityVersion: 2, completedStepIds: ["assemble"] },
        { lessonId: "cpp-addition", exampleId: "cpp-addition", progressCompatibilityVersion: 1, completedStepIds: ["assemble"] }
      ]
    }));
    expect(resolveLessonProgress(payload, learningLessons)).toEqual({ "cpp-addition": { assemble: true } });
    expect(PERSISTENCE_MIGRATION_POLICY.explicitPureFunctionRequired).toBe(true);
    expect(PERSISTENCE_MIGRATION_POLICY.shapeGuessing).toBe(false);
  });

  it("serializers contain allowlisted canonical values only", () => {
    const serialized = [
      "ja",
      serializeApplicationPreferences({ version: 1, observationMode: "code-machine", circuitFocusEnabled: true, inspectorActiveTab: "trace", outputDockActiveTab: "messages" }),
      serializeStartupSelection({ version: 1, lastExampleId: "cpp-addition" }),
      serializeLessonProgress({ version: 1, entries: [{ lessonId: "cpp-addition", exampleId: "cpp-addition", progressCompatibilityVersion: 1, completedStepIds: ["assemble"] }] })
    ].join("\n");
    for (const forbidden of ["sourceContent", "fileName", "absolutePath", "documentId", "sourceUnitId", "saveTargetId", "rawContext", "diagnostics", "generatedCasl", "machineCode", '"trace":', "vmState", "operationId", "timestamp"]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("oversized payloads and excessive arrays are bounded", () => {
    const localeValues = new Map([[LOCALE_STORAGE_KEY, "x".repeat(LOCALE_STORAGE_MAX_BYTES + 1)]]);
    expect(new WebLocalStorageLocaleStorage(() => mapStorage(localeValues)).read()).toBeNull();
    expect(parseApplicationPreferences("x".repeat(16 * 1024 + 1))).toBeNull();
    expect(parseStartupSelection("x".repeat(4097))).toBeNull();
    expect(parseLessonProgress("x".repeat(64 * 1024 + 1))).toBeNull();
    expect(sanitizeLessonProgress({ version: 1, entries: Array.from({ length: 257 }, () => ({})) })).toBeNull();
  });

  it("getters proxies circular values prototype keys and invalid unicode are safe", () => {
    const throwingGetter = {};
    Object.defineProperty(throwingGetter, "version", { get: () => { throw new Error("getter executed"); } });
    const throwingProxy = new Proxy({}, { getPrototypeOf: () => { throw new Error("prototype trap"); } });
    expect(() => sanitizeApplicationPreferences(throwingGetter)).not.toThrow();
    expect(() => sanitizeStartupSelection(throwingGetter)).not.toThrow();
    expect(() => sanitizeLessonProgress(throwingGetter)).not.toThrow();
    expect(sanitizeStartupSelection(throwingProxy)).toBeNull();
    expect(sanitizeLessonProgress(throwingProxy)).toBeNull();
    const circular: Record<string, unknown> = { version: 1 };
    circular.self = circular;
    expect(sanitizeApplicationPreferences(circular)).toEqual({ version: 1 });
    expect(sanitizeStartupSelection(circular)).toBeNull();
    expect(sanitizeLessonProgress(circular)).toBeNull();
    expect(() => parseStartupSelection('{"version":1,"lastExampleId":"\\ud800"}')).not.toThrow();
    expect(Object.prototype).not.toHaveProperty("polluted");
  });

  it("production adapters contain no logging retry timers listeners network or baseline reads", () => {
    for (const path of ["src/i18n/localeStorage.ts", "src/preferences/storage.ts", "src/startupSelection/storage.ts", "src/lessonProgress/storage.ts"]) {
      const source = readFileSync(path, "utf8");
      expect(source).not.toMatch(/console\.|setTimeout|setInterval|addEventListener|fetch\(|persistence-baseline-v1/);
    }
  });
});

function validStoredValues(): Map<string, string> {
  return new Map([
    [LOCALE_STORAGE_KEY, "ja"],
    [APPLICATION_PREFERENCES_STORAGE_KEY, '{"version":1,"observationMode":"register-stack","circuitFocusEnabled":true,"inspectorActiveTab":"memory","outputDockActiveTab":"messages"}'],
    [STARTUP_SELECTION_STORAGE_KEY, '{"version":1,"lastExampleId":"cpp-addition"}'],
    [LESSON_PROGRESS_STORAGE_KEY, '{"version":1,"entries":[{"lessonId":"cpp-addition","exampleId":"cpp-addition","progressCompatibilityVersion":1,"completedStepIds":["assemble"]}]}']
  ]);
}

function keyName(key: string): "locale" | "applicationPreferences" | "startupSelection" | "lessonProgress" {
  const entry = Object.entries(PERSISTENCE_STORAGE_KEYS).find(([, value]) => value === key);
  if (!entry) throw new Error(`Unknown persistence key: ${key}`);
  return entry[0] as ReturnType<typeof keyName>;
}

function readAll(storage: Storage) {
  return {
    locale: new WebLocalStorageLocaleStorage(() => storage).read(),
    applicationPreferences: new WebLocalStorageApplicationPreferenceStorage(() => storage).read(),
    startupSelection: new WebLocalStorageStartupSelectionStorage(() => storage).read(),
    lessonProgress: new WebLocalStorageLessonProgressStorage(() => storage).read()
  };
}

function writeOne(key: string, storage: Storage): void {
  if (key === LOCALE_STORAGE_KEY) new WebLocalStorageLocaleStorage(() => storage).write("zh-CN");
  else if (key === APPLICATION_PREFERENCES_STORAGE_KEY) new WebLocalStorageApplicationPreferenceStorage(() => storage).write({ version: 1, observationMode: "code-machine" });
  else if (key === STARTUP_SELECTION_STORAGE_KEY) new WebLocalStorageStartupSelectionStorage(() => storage).write({ version: 1, lastExampleId: "casl-call-return" });
  else new WebLocalStorageLessonProgressStorage(() => storage).write({ version: 1, entries: [] });
}

function clearOne(key: string, storage: Storage): void {
  if (key === LOCALE_STORAGE_KEY) clearStoredLocale(new WebLocalStorageLocaleStorage(() => storage));
  else if (key === APPLICATION_PREFERENCES_STORAGE_KEY) new ApplicationPreferenceController(new WebLocalStorageApplicationPreferenceStorage(() => storage)).reset();
  else if (key === STARTUP_SELECTION_STORAGE_KEY) new StartupSelectionController(new WebLocalStorageStartupSelectionStorage(() => storage)).clear();
  else new LessonProgressController(new WebLocalStorageLessonProgressStorage(() => storage)).clear();
}

function mapStorage(values: Map<string, string>, failures: { failReadKey?: string; failWriteKey?: string; failRemove?: boolean } = {}): Storage {
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => {
      if (key === failures.failReadKey) throw new DOMException("denied", "SecurityError");
      return values.get(key) ?? null;
    },
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => {
      if (failures.failRemove) throw new DOMException("denied", "SecurityError");
      values.delete(key);
    },
    setItem: (key, value) => {
      if (key === failures.failWriteKey) throw new DOMException("quota", "QuotaExceededError");
      values.set(key, value);
    }
  };
}
