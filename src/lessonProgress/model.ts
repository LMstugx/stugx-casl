import type { LearningLesson } from "../examples/learningLessons";
import { LESSON_PROGRESS_VERSION, type LessonProgressPersistenceV1, type LessonProgressState } from "./types";

function lessonIsPersistable(lesson: LearningLesson): boolean {
  if (!lesson.lessonId || lesson.lessonId !== lesson.exampleId) return false;
  if (!Number.isSafeInteger(lesson.progressCompatibilityVersion) || lesson.progressCompatibilityVersion <= 0) return false;
  const stepIds = lesson.suggestedSteps.map((step) => step.stepId);
  return stepIds.every(Boolean) && new Set(stepIds).size === stepIds.length;
}

export function resolveLessonProgress(
  payload: LessonProgressPersistenceV1 | null,
  lessons: readonly LearningLesson[]
): LessonProgressState {
  if (!payload) return {};
  const lessonById = new Map(lessons.filter(lessonIsPersistable).map((lesson) => [lesson.lessonId, lesson]));
  const progress: LessonProgressState = {};
  for (const entry of payload.entries) {
    const lesson = lessonById.get(entry.lessonId);
    if (!lesson || lesson.exampleId !== entry.exampleId || lesson.progressCompatibilityVersion !== entry.progressCompatibilityVersion) continue;
    const currentStepIds = new Set(lesson.suggestedSteps.map((step) => step.stepId));
    const completed = entry.completedStepIds.filter((stepId) => currentStepIds.has(stepId));
    if (completed.length > 0) progress[lesson.exampleId] = Object.fromEntries(completed.map((stepId) => [stepId, true]));
  }
  return progress;
}

export function createLessonProgressPayload(
  progress: LessonProgressState,
  lessons: readonly LearningLesson[]
): LessonProgressPersistenceV1 {
  const entries = lessons
    .filter(lessonIsPersistable)
    .map((lesson) => {
      const descriptor = Object.getOwnPropertyDescriptor(progress, lesson.exampleId);
      const lessonProgress = descriptor && "value" in descriptor && descriptor.value && typeof descriptor.value === "object"
        ? descriptor.value as Record<string, boolean>
        : {};
      const completedStepIds = lesson.suggestedSteps
        .map((step) => step.stepId)
        .filter((stepId) => Object.prototype.hasOwnProperty.call(lessonProgress, stepId) && lessonProgress[stepId] === true)
        .sort((left, right) => left.localeCompare(right, "en"));
      return completedStepIds.length > 0
        ? {
            lessonId: lesson.lessonId,
            exampleId: lesson.exampleId,
            progressCompatibilityVersion: lesson.progressCompatibilityVersion,
            completedStepIds
          }
        : null;
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .sort((left, right) => left.lessonId.localeCompare(right.lessonId, "en"));
  return { version: LESSON_PROGRESS_VERSION, entries };
}

export function cloneLessonProgress(progress: LessonProgressState): LessonProgressState {
  return Object.fromEntries(Object.entries(progress).map(([exampleId, steps]) => [exampleId, { ...steps }]));
}

export function isPersistableLessonStep(lessons: readonly LearningLesson[], exampleId: string, stepId: string): boolean {
  const lesson = lessons.find((candidate) => candidate.exampleId === exampleId && candidate.lessonId === exampleId);
  return Boolean(lesson?.suggestedSteps.some((step) => step.stepId === stepId));
}
