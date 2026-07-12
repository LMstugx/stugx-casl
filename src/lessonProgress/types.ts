export const LESSON_PROGRESS_VERSION = 1 as const;
export const LESSON_PROGRESS_STORAGE_KEY = "stugx.casl.lesson-progress.v1";
export const LESSON_PROGRESS_MAX_BYTES = 64 * 1024;
export const LESSON_PROGRESS_MAX_ENTRIES = 256;
export const LESSON_PROGRESS_MAX_STEPS_PER_LESSON = 256;
export const LESSON_PROGRESS_MAX_ID_LENGTH = 128;

export const LESSON_PROGRESS_PERSISTED_FIELDS = [
  "lessonId",
  "exampleId",
  "progressCompatibilityVersion",
  "completedStepIds"
] as const;

export interface LessonProgressEntryV1 {
  lessonId: string;
  exampleId: string;
  progressCompatibilityVersion: number;
  completedStepIds: readonly string[];
}

export interface LessonProgressPersistenceV1 {
  version: typeof LESSON_PROGRESS_VERSION;
  entries: readonly LessonProgressEntryV1[];
}

export type LessonProgressState = Record<string, Record<string, boolean>>;
