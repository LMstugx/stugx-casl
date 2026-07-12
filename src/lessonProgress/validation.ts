import {
  LESSON_PROGRESS_MAX_BYTES,
  LESSON_PROGRESS_MAX_ENTRIES,
  LESSON_PROGRESS_MAX_ID_LENGTH,
  LESSON_PROGRESS_MAX_STEPS_PER_LESSON,
  LESSON_PROGRESS_VERSION,
  type LessonProgressEntryV1,
  type LessonProgressPersistenceV1
} from "./types";

const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function ownDataValue(object: Record<string, unknown>, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(object, key);
  return descriptor && "value" in descriptor ? descriptor.value : undefined;
}

function arrayDataValue(array: readonly unknown[], index: number): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(array, String(index));
  return descriptor && "value" in descriptor ? descriptor.value : undefined;
}

function safeId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!value || value !== value.trim() || value.length > LESSON_PROGRESS_MAX_ID_LENGTH || CONTROL_CHARACTER_PATTERN.test(value)) return null;
  return value;
}

function positiveVersion(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : null;
}

function sanitizeCompletedStepIds(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length > LESSON_PROGRESS_MAX_STEPS_PER_LESSON) return null;
  const ids = new Set<string>();
  for (let index = 0; index < value.length; index += 1) {
    const id = safeId(arrayDataValue(value, index));
    if (!id) return null;
    ids.add(id);
  }
  return [...ids].sort((left, right) => left.localeCompare(right, "en"));
}

function sanitizeEntry(value: unknown): LessonProgressEntryV1 | null {
  if (!isPlainObject(value)) return null;
  const lessonId = safeId(ownDataValue(value, "lessonId"));
  const exampleId = safeId(ownDataValue(value, "exampleId"));
  const progressCompatibilityVersion = positiveVersion(ownDataValue(value, "progressCompatibilityVersion"));
  const completedStepIds = sanitizeCompletedStepIds(ownDataValue(value, "completedStepIds"));
  if (!lessonId || !exampleId || !progressCompatibilityVersion || !completedStepIds) return null;
  return { lessonId, exampleId, progressCompatibilityVersion, completedStepIds };
}

export function sanitizeLessonProgress(raw: unknown): LessonProgressPersistenceV1 | null {
  if (!isPlainObject(raw) || ownDataValue(raw, "version") !== LESSON_PROGRESS_VERSION) return null;
  const entriesValue = ownDataValue(raw, "entries");
  if (!Array.isArray(entriesValue) || entriesValue.length > LESSON_PROGRESS_MAX_ENTRIES) return null;

  const entries: LessonProgressEntryV1[] = [];
  const duplicateLessonIds = new Set<string>();
  const seenLessonIds = new Set<string>();
  for (let index = 0; index < entriesValue.length; index += 1) {
    const entry = sanitizeEntry(arrayDataValue(entriesValue, index));
    if (!entry) continue;
    if (seenLessonIds.has(entry.lessonId)) duplicateLessonIds.add(entry.lessonId);
    seenLessonIds.add(entry.lessonId);
    entries.push(entry);
  }

  return {
    version: LESSON_PROGRESS_VERSION,
    entries: entries
      .filter((entry) => !duplicateLessonIds.has(entry.lessonId))
      .sort((left, right) => left.lessonId.localeCompare(right.lessonId, "en"))
  };
}

export function parseLessonProgress(raw: string | null): LessonProgressPersistenceV1 | null {
  if (raw === null || new TextEncoder().encode(raw).byteLength > LESSON_PROGRESS_MAX_BYTES) return null;
  try {
    return sanitizeLessonProgress(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function serializeLessonProgress(value: LessonProgressPersistenceV1): string {
  const sanitized = sanitizeLessonProgress(value);
  if (!sanitized) throw new TypeError("Invalid lesson progress payload.");
  return JSON.stringify({
    version: LESSON_PROGRESS_VERSION,
    entries: sanitized.entries.map((entry) => ({
      lessonId: entry.lessonId,
      exampleId: entry.exampleId,
      progressCompatibilityVersion: entry.progressCompatibilityVersion,
      completedStepIds: [...entry.completedStepIds]
    }))
  });
}
