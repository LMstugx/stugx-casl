import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createExternalDocument, createUntitledDocument } from "../../documents/documentModel";
import { createSequentialDocumentIdFactory } from "../../documents/idFactory";
import { demoPrograms, getDemoProgram } from "../../examples/demoPrograms";
import { learningLessons, type LearningLesson } from "../../examples/learningLessons";
import { DEFAULT_APPLICATION_PREFERENCES } from "../../preferences/types";
import { appStoreReducer, createInitialAppState } from "../../store/useAppStore";
import {
  LESSON_PROGRESS_BLOCKED_MIGRATION_TECHNIQUES,
  LESSON_PROGRESS_DEFERRED_SESSION_RESTORE,
  LESSON_PROGRESS_HYDRATION_POLICY,
  LESSON_PROGRESS_IDENTITY_POLICY,
  LESSON_PROGRESS_INDEPENDENT_STORAGE_KEYS,
  LESSON_PROGRESS_LESSON_COMPATIBILITY_POLICY,
  LESSON_PROGRESS_PROHIBITED_FIELDS,
  LESSON_PROGRESS_RESET_POLICY,
  LESSON_PROGRESS_SECURITY_POLICY,
  LESSON_PROGRESS_STEP_COMPATIBILITY_POLICY,
  LESSON_PROGRESS_WRITE_POLICY
} from "../contract";
import { LessonProgressController } from "../controller";
import { createLessonProgressPayload, resolveLessonProgress } from "../model";
import { WebLocalStorageLessonProgressStorage, type LessonProgressStorage } from "../storage";
import {
  LESSON_PROGRESS_MAX_BYTES,
  LESSON_PROGRESS_MAX_ENTRIES,
  LESSON_PROGRESS_MAX_ID_LENGTH,
  LESSON_PROGRESS_MAX_STEPS_PER_LESSON,
  LESSON_PROGRESS_PERSISTED_FIELDS,
  LESSON_PROGRESS_STORAGE_KEY,
  LESSON_PROGRESS_VERSION,
  type LessonProgressPersistenceV1
} from "../types";
import { parseLessonProgress, sanitizeLessonProgress, serializeLessonProgress } from "../validation";

const baselineRaw = readFileSync("docs/lesson-progress-baseline-v1.json", "utf8");
const baseline = JSON.parse(baselineRaw) as Record<string, unknown>;
const auditDocument = readFileSync("docs/phase16c-lesson-progress-persistence-audit.md", "utf8");

describe("Phase 16C identity audit and baseline", () => {
  it("every_lesson_and_step_has_stable_explicit_identity", () => {
    expect(learningLessons).toHaveLength(18);
    expect(learningLessons.reduce((count, lesson) => count + lesson.suggestedSteps.length, 0)).toBe(68);
    expect(learningLessons.reduce((count, lesson) => count + lesson.checkpoints.length, 0)).toBe(56);
    expect(new Set(learningLessons.map((lesson) => lesson.lessonId)).size).toBe(learningLessons.length);
    for (const lesson of learningLessons) {
      expect(lesson.lessonId).toBe(lesson.exampleId);
      expect(demoPrograms.some((program) => program.id === lesson.exampleId)).toBe(true);
      expect(lesson.progressCompatibilityVersion).toBe(1);
      const ids = lesson.suggestedSteps.map((step) => step.stepId);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids.every((id) => Boolean(id) && !/^(?:step|item)-?\d+$/i.test(id))).toBe(true);
      expect(lesson.suggestedSteps.every((step) => step.stepId !== step.label && step.stepId !== step.action)).toBe(true);
    }
  });

  it("baseline_is_deterministic_and_matches_runtime_contract", () => {
    expect(baselineRaw).toBe(`${JSON.stringify(baseline, null, 2)}\n`);
    expect(baseline.baselineVersion).toBe(LESSON_PROGRESS_VERSION);
    expect(baseline.storageKey).toBe(LESSON_PROGRESS_STORAGE_KEY);
    expect(baseline.maxPayloadBytes).toBe(LESSON_PROGRESS_MAX_BYTES);
    expect(baseline.limits).toEqual({ maxLessonEntries: LESSON_PROGRESS_MAX_ENTRIES, maxStepsPerLesson: LESSON_PROGRESS_MAX_STEPS_PER_LESSON, maxIdLength: LESSON_PROGRESS_MAX_ID_LENGTH });
    expect(baseline.persistedFields).toEqual(LESSON_PROGRESS_PERSISTED_FIELDS);
    expect(baseline.identityPolicy).toEqual(LESSON_PROGRESS_IDENTITY_POLICY);
    expect(baseline.lessonCompatibilityPolicy).toEqual(LESSON_PROGRESS_LESSON_COMPATIBILITY_POLICY);
    expect(baseline.stepCompatibilityPolicy).toEqual(LESSON_PROGRESS_STEP_COMPATIBILITY_POLICY);
    expect(baseline.hydrationPolicy).toEqual(LESSON_PROGRESS_HYDRATION_POLICY);
    expect(baseline.writePolicy).toEqual(LESSON_PROGRESS_WRITE_POLICY);
    expect(baseline.resetPolicy).toEqual(LESSON_PROGRESS_RESET_POLICY);
    expect(baseline.prohibitedFields).toEqual(LESSON_PROGRESS_PROHIBITED_FIELDS);
    expect(baseline.independentStorageKeys).toEqual(LESSON_PROGRESS_INDEPENDENT_STORAGE_KEYS);
    expect(baseline.securityPolicy).toEqual(LESSON_PROGRESS_SECURITY_POLICY);
    expect(baseline.blockedMigrationTechniques).toEqual(LESSON_PROGRESS_BLOCKED_MIGRATION_TECHNIQUES);
    expect(baseline.deferredSessionRestore).toEqual(LESSON_PROGRESS_DEFERRED_SESSION_RESTORE);
    expect(baseline.registrySnapshot).toEqual(
      learningLessons
        .map((lesson) => ({ lessonId: lesson.lessonId, exampleId: lesson.exampleId, progressCompatibilityVersion: lesson.progressCompatibilityVersion, stepIds: lesson.suggestedSteps.map((step) => step.stepId) }))
        .sort((left, right) => left.lessonId.localeCompare(right.lessonId, "en"))
    );
  });

  it("baseline_is_not_a_runtime_source_and_frozen_baselines_remain_intact", () => {
    for (const path of ["src/App.tsx", "src/store/useAppStore.tsx", "src/lessonProgress/controller.ts", "src/lessonProgress/model.ts"]) {
      expect(readFileSync(path, "utf8")).not.toContain("lesson-progress-baseline-v1.json");
    }
    expect((JSON.parse(readFileSync("docs/diagnostic-localization-baseline-v1.json", "utf8")) as { structuredDiagnostics: unknown[] }).structuredDiagnostics).toHaveLength(76);
    expect((JSON.parse(readFileSync("docs/file-lifecycle-operation-matrix-v1.json", "utf8")) as { coverage: { totalCombinations: number } }).coverage.totalCombinations).toBe(112);
    expect((JSON.parse(readFileSync("docs/application-preferences-baseline-v1.json", "utf8")) as { persistedFields: string[] }).persistedFields).toEqual(["observationMode", "circuitFocusEnabled", "inspectorActiveTab", "outputDockActiveTab"]);
    expect((JSON.parse(readFileSync("docs/startup-selection-baseline-v1.json", "utf8")) as { persistedFields: string[] }).persistedFields).toEqual(["lastExampleId"]);
  });

  it("audit_document_classifies_every_lesson_step_and_checkpoint", () => {
    for (const lesson of learningLessons) {
      expect(auditDocument).toContain(`\`${lesson.lessonId}\``);
      for (const step of lesson.suggestedSteps) expect(auditDocument).toContain(`\`${step.stepId}\``);
      for (const checkpoint of lesson.checkpoints) expect(auditDocument).toContain(`\`${checkpoint.id}\``);
    }
    expect(auditDocument).toContain("stable-after-explicit-id");
    expect(auditDocument).toContain("stable-persistable");
    expect(auditDocument).toContain("intentionally-session-only");
    expect(auditDocument).toContain("no real step-ID rename");
  });
});

describe("Phase 16C parsing and security", () => {
  const valid = {
    version: 1,
    entries: [{ lessonId: "cpp-addition", exampleId: "cpp-addition", progressCompatibilityVersion: 1, completedStepIds: ["run", "assemble", "run"] }]
  };

  it("valid_payload_parses_deduplicates_and_sorts", () => {
    expect(parseLessonProgress(JSON.stringify(valid))).toEqual({
      version: 1,
      entries: [{ lessonId: "cpp-addition", exampleId: "cpp-addition", progressCompatibilityVersion: 1, completedStepIds: ["assemble", "run"] }]
    });
  });

  it.each(["{", "null", "[]", "7", JSON.stringify({ version: 2, entries: [] })])("rejects malformed primitive array or unknown version %s", (raw) => {
    expect(parseLessonProgress(raw)).toBeNull();
  });

  it("rejects_oversized_payload", () => {
    expect(parseLessonProgress(JSON.stringify({ version: 1, entries: [], ignored: "x".repeat(LESSON_PROGRESS_MAX_BYTES) }))).toBeNull();
  });

  it("drops_invalid_entries_independently_and_ignores_unknown_fields", () => {
    expect(sanitizeLessonProgress({ version: 1, entries: [
      { lessonId: "bad", exampleId: "bad", progressCompatibilityVersion: 0, completedStepIds: [] },
      { ...valid.entries[0], title: "ignored", source: "ignored" }
    ], locale: "ja" })).toEqual({ version: 1, entries: [{ lessonId: "cpp-addition", exampleId: "cpp-addition", progressCompatibilityVersion: 1, completedStepIds: ["assemble", "run"] }] });
  });

  it("rejects_duplicate_lesson_entries_as_ambiguous", () => {
    expect(sanitizeLessonProgress({ version: 1, entries: [valid.entries[0], { ...valid.entries[0], completedStepIds: ["machine-code"] }] })).toEqual({ version: 1, entries: [] });
  });

  it("enforces_entry_step_and_id_limits", () => {
    expect(sanitizeLessonProgress({ version: 1, entries: Array.from({ length: LESSON_PROGRESS_MAX_ENTRIES + 1 }, (_, index) => ({ lessonId: `lesson-${index}`, exampleId: `lesson-${index}`, progressCompatibilityVersion: 1, completedStepIds: [] })) })).toBeNull();
    expect(sanitizeLessonProgress({ version: 1, entries: [{ lessonId: "lesson", exampleId: "lesson", progressCompatibilityVersion: 1, completedStepIds: Array.from({ length: LESSON_PROGRESS_MAX_STEPS_PER_LESSON + 1 }, (_, index) => `s-${index}`) }] })).toEqual({ version: 1, entries: [] });
    expect(sanitizeLessonProgress({ version: 1, entries: [{ lessonId: "x".repeat(LESSON_PROGRESS_MAX_ID_LENGTH + 1), exampleId: "lesson", progressCompatibilityVersion: 1, completedStepIds: [] }] })).toEqual({ version: 1, entries: [] });
  });

  it("does_not_execute_getters_or_merge_prototype_keys", () => {
    const entry = Object.create(null) as Record<string, unknown>;
    Object.defineProperty(entry, "lessonId", { value: "cpp-addition", enumerable: true });
    Object.defineProperty(entry, "exampleId", { value: "cpp-addition", enumerable: true });
    Object.defineProperty(entry, "progressCompatibilityVersion", { value: 1, enumerable: true });
    Object.defineProperty(entry, "completedStepIds", { get: () => { throw new Error("getter executed"); }, enumerable: true });
    Object.defineProperty(entry, "__proto__", { value: { polluted: true }, enumerable: true });
    expect(sanitizeLessonProgress({ version: 1, entries: [entry] })).toEqual({ version: 1, entries: [] });
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
  });

  it("rejects_malicious_control_and_prototype_like_ids_at_registry_boundary", () => {
    const payload = sanitizeLessonProgress({ version: 1, entries: [
      { lessonId: "constructor", exampleId: "constructor", progressCompatibilityVersion: 1, completedStepIds: ["toString"] },
      { lessonId: "bad\u0000id", exampleId: "bad", progressCompatibilityVersion: 1, completedStepIds: [] }
    ] });
    expect(resolveLessonProgress(payload, learningLessons)).toEqual({});
  });

  it("serializer_outputs_allowlist_only_and_stable_order", () => {
    const serialized = serializeLessonProgress({ version: 1, entries: [
      { lessonId: "z", exampleId: "z", progressCompatibilityVersion: 1, completedStepIds: ["b", "a", "a"], source: "secret" as never },
      { lessonId: "a", exampleId: "a", progressCompatibilityVersion: 1, completedStepIds: [] }
    ], locale: "ja" as never } as LessonProgressPersistenceV1);
    expect(serialized).toBe('{"version":1,"entries":[{"lessonId":"a","exampleId":"a","progressCompatibilityVersion":1,"completedStepIds":[]},{"lessonId":"z","exampleId":"z","progressCompatibilityVersion":1,"completedStepIds":["a","b"]}]}');
    expect(serialized).not.toMatch(/source|locale|title|path|document|handle|index/i);
  });
});

describe("Phase 16C compatibility", () => {
  const cppLesson = learningLessons.find((lesson) => lesson.lessonId === "cpp-addition")!;
  const entry = (overrides: Partial<LessonProgressPersistenceV1["entries"][number]> = {}): LessonProgressPersistenceV1 => ({
    version: 1,
    entries: [{ lessonId: cppLesson.lessonId, exampleId: cppLesson.exampleId, progressCompatibilityVersion: cppLesson.progressCompatibilityVersion, completedStepIds: ["assemble", "deleted-step"], ...overrides }]
  });

  it("matching_version_restores_current_intersection_and_ignores_deleted_steps", () => {
    expect(resolveLessonProgress(entry(), learningLessons)).toEqual({ "cpp-addition": { assemble: true } });
  });

  it("version_mismatch_discards_lesson_progress", () => {
    expect(resolveLessonProgress(entry({ progressCompatibilityVersion: 2 }), learningLessons)).toEqual({});
  });

  it("new_steps_start_incomplete_and_wording_changes_preserve_identity", () => {
    const changed: LearningLesson = { ...cppLesson, title: "Translated title", suggestedSteps: [...cppLesson.suggestedSteps, { stepId: "new-semantic-step", label: "New wording", action: "New action", expectedObservation: "New" }] };
    const restored = resolveLessonProgress(entry({ completedStepIds: ["assemble"] }), [changed]);
    expect(restored[cppLesson.exampleId]).toEqual({ assemble: true });
    expect(restored[cppLesson.exampleId]["new-semantic-step"]).toBeUndefined();
  });

  it("rename_does_not_use_text_matching", () => {
    const renamed: LearningLesson = { ...cppLesson, suggestedSteps: cppLesson.suggestedSteps.map((step) => step.stepId === "assemble" ? { ...step, stepId: "assemble-source", label: step.label } : step) };
    expect(resolveLessonProgress(entry({ completedStepIds: ["assemble"] }), [renamed])).toEqual({});
  });

  it("deleted_lesson_example_mismatch_and_custom_ids_are_ignored", () => {
    expect(resolveLessonProgress(entry(), [])).toEqual({});
    expect(resolveLessonProgress(entry({ exampleId: "external" }), learningLessons)).toEqual({});
    expect(resolveLessonProgress({ version: 1, entries: [{ lessonId: "custom", exampleId: "custom", progressCompatibilityVersion: 1, completedStepIds: ["assemble"] }] }, learningLessons)).toEqual({});
  });

  it("payload_creation_persists_only_current_built_in_completed_steps", () => {
    expect(createLessonProgressPayload({
      "cpp-addition": { run: true, assemble: true, "deleted-step": true, "machine-code": false },
      external: { assemble: true }
    }, learningLessons)).toEqual({
      version: 1,
      entries: [{ lessonId: "cpp-addition", exampleId: "cpp-addition", progressCompatibilityVersion: 1, completedStepIds: ["assemble", "run"] }]
    });
  });
});

describe("Phase 16C storage, hydration, and boundaries", () => {
  it("web_storage_is_independent_and_failure_safe", () => {
    const values = new Map<string, string>([
      ["stugx.casl.locale", "ja"],
      ["stugx.casl.preferences.v1", '{"version":1}'],
      ["stugx.casl.startup-selection.v1", '{"version":1,"lastExampleId":"cpp-addition"}']
    ]);
    const storage = new WebLocalStorageLessonProgressStorage(() => mapStorage(values));
    storage.write({ version: 1, entries: [] });
    expect(values.has(LESSON_PROGRESS_STORAGE_KEY)).toBe(true);
    storage.clear();
    expect(values.has(LESSON_PROGRESS_STORAGE_KEY)).toBe(false);
    expect(values.get("stugx.casl.locale")).toBe("ja");
    expect(values.has("stugx.casl.preferences.v1")).toBe(true);
    expect(values.has("stugx.casl.startup-selection.v1")).toBe(true);
    const throwing = new WebLocalStorageLessonProgressStorage(() => { throw new Error("denied"); });
    expect(throwing.read()).toBeNull();
    expect(() => throwing.write({ version: 1, entries: [] })).not.toThrow();
    expect(() => throwing.clear()).not.toThrow();
  });

  it("controller_hydrates_once_without_writing_and_suppresses_unchanged_snapshots", () => {
    const storage = new FakeLessonProgressStorage({ version: 1, entries: [{ lessonId: "cpp-addition", exampleId: "cpp-addition", progressCompatibilityVersion: 1, completedStepIds: ["assemble"] }] });
    const controller = new LessonProgressController(storage);
    expect(controller.hydrate(learningLessons)).toEqual({ "cpp-addition": { assemble: true } });
    expect(controller.hydrate(learningLessons)).toEqual({ "cpp-addition": { assemble: true } });
    expect(storage.reads).toBe(1);
    expect(storage.writes).toBe(0);
    expect(controller.persist({ "cpp-addition": { assemble: true } }, learningLessons)).toBe(false);
    expect(controller.persist({ "cpp-addition": { assemble: true, run: true } }, learningLessons)).toBe(true);
    expect(storage.writes).toBe(1);
  });

  it("controller_write_and_clear_failures_do_not_rollback_memory", () => {
    const controller = new LessonProgressController({ read: () => null, write: () => { throw new Error("quota"); }, clear: () => { throw new Error("denied"); } });
    expect(() => controller.persist({ "cpp-addition": { assemble: true } }, learningLessons)).not.toThrow();
    expect(controller.hydrate(learningLessons)).toEqual({ "cpp-addition": { assemble: true } });
    expect(() => controller.clear()).not.toThrow();
    expect(controller.hydrate(learningLessons)).toEqual({});
  });

  it("hydrated_store_progress_does_not_change_document_source_dirty_vm_or_diagnostics", () => {
    const demo = getDemoProgram("cpp-addition")!;
    const state = createInitialAppState(createSequentialDocumentIdFactory("lesson-hydration"), DEFAULT_APPLICATION_PREFERENCES, demo, { "cpp-addition": { assemble: true } });
    expect(state.lessonProgress).toEqual({ "cpp-addition": { assemble: true } });
    expect(state.currentDocument.content).toBe(demo.source);
    expect(state.currentDocument.revision).toBe(state.currentDocument.savedRevision);
    expect(state.cometState.runState).toBe("Idle");
    expect(state.diagnostics).toEqual([]);
    expect(state.generatedCaslSource).toBe("");
    expect(state.fileLifecycle.status).toBe("idle");
  });

  it("external_untitled_and_source_text_match_cannot_create_progress", () => {
    const initial = createInitialAppState();
    const ids = createSequentialDocumentIdFactory("lesson-boundary");
    const external = createExternalDocument({ fileName: "same.cas", extension: ".cas", language: "casl", text: initial.sourceText, byteLength: initial.sourceText.length, encoding: "utf-8", lineEnding: "lf" }, ids);
    const externalState = appStoreReducer(initial, { type: "currentDocumentReplaced", document: external });
    expect(appStoreReducer(externalState, { type: "lessonStepToggled", exampleId: "casl-gr2-addition", stepId: "assemble" }).lessonProgress).toEqual({});
    const untitled = createUntitledDocument("casl", ids);
    const untitledState = appStoreReducer(initial, { type: "currentDocumentReplaced", document: untitled });
    expect(appStoreReducer(untitledState, { type: "lessonStepToggled", exampleId: "casl-gr2-addition", stepId: "assemble" }).lessonProgress).toEqual({});
  });

  it("open_new_save_replacement_preserve_existing_progress", () => {
    const initial = appStoreReducer(createInitialAppState(), { type: "lessonStepToggled", exampleId: "casl-gr2-addition", stepId: "assemble" });
    const replacement = createUntitledDocument("cpp", createSequentialDocumentIdFactory("progress-preserve"));
    const replaced = appStoreReducer(initial, { type: "currentDocumentReplaced", document: replacement });
    expect(replaced.lessonProgress).toBe(initial.lessonProgress);
    const saved = appStoreReducer(replaced, { type: "currentDocumentSaved", document: replacement, writeBinding: null });
    expect(saved.lessonProgress).toBe(initial.lessonProgress);
  });

  it("progress_toggle_and_reset_do_not_change_document_dirty_or_runtime", () => {
    const initial = createInitialAppState();
    const toggled = appStoreReducer(initial, { type: "lessonStepToggled", exampleId: "casl-gr2-addition", stepId: "assemble" });
    const reset = appStoreReducer(toggled, { type: "lessonProgressReset", exampleId: "casl-gr2-addition" });
    for (const next of [toggled, reset]) {
      expect(next.currentDocument).toBe(initial.currentDocument);
      expect(next.sourceText).toBe(initial.sourceText);
      expect(next.cometState).toBe(initial.cometState);
      expect(next.diagnostics).toBe(initial.diagnostics);
    }
  });
});

class FakeLessonProgressStorage implements LessonProgressStorage {
  reads = 0;
  writes = 0;
  constructor(public value: LessonProgressPersistenceV1 | null) {}
  read() { this.reads += 1; return this.value; }
  write(value: LessonProgressPersistenceV1) { this.writes += 1; this.value = value; }
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
