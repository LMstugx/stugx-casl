import type { LearningLesson } from "../examples/learningLessons";
import { createLessonProgressPayload, resolveLessonProgress } from "./model";
import type { LessonProgressStorage } from "./storage";
import type { LessonProgressState } from "./types";
import { sanitizeLessonProgress, serializeLessonProgress } from "./validation";

export class LessonProgressController {
  private hydrated = false;
  private current: LessonProgressState = {};
  private serialized = serializeLessonProgress({ version: 1, entries: [] });

  constructor(private readonly storage: LessonProgressStorage) {}

  hydrate(lessons: readonly LearningLesson[]): LessonProgressState {
    if (!this.hydrated) {
      try {
        const payload = sanitizeLessonProgress(this.storage.read());
        this.current = resolveLessonProgress(payload, lessons);
      } catch {
        this.current = {};
      }
      this.serialized = serializeLessonProgress(createLessonProgressPayload(this.current, lessons));
      this.hydrated = true;
    }
    return Object.fromEntries(Object.entries(this.current).map(([exampleId, steps]) => [exampleId, { ...steps }]));
  }

  persist(progress: LessonProgressState, lessons: readonly LearningLesson[]): boolean {
    const payload = createLessonProgressPayload(progress, lessons);
    const serialized = serializeLessonProgress(payload);
    if (serialized === this.serialized) return false;
    this.current = resolveLessonProgress(payload, lessons);
    this.serialized = serialized;
    this.hydrated = true;
    try {
      this.storage.write(payload);
    } catch {
      // Custom adapters may throw; UI progress remains committed in memory.
    }
    return true;
  }

  clear(): void {
    this.current = {};
    this.serialized = serializeLessonProgress({ version: 1, entries: [] });
    this.hydrated = true;
    try {
      this.storage.clear();
    } catch {
      // Clear remains an in-memory success when storage is unavailable.
    }
  }
}
