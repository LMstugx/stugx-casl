import { LESSON_PROGRESS_STORAGE_KEY, type LessonProgressPersistenceV1 } from "./types";
import { parseLessonProgress, serializeLessonProgress } from "./validation";

export interface LessonProgressStorage {
  read(): LessonProgressPersistenceV1 | null;
  write(value: LessonProgressPersistenceV1): void;
  clear(): void;
}

function browserLocalStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export class WebLocalStorageLessonProgressStorage implements LessonProgressStorage {
  constructor(private readonly getStorage: () => Storage | null = browserLocalStorage) {}

  read(): LessonProgressPersistenceV1 | null {
    try {
      return parseLessonProgress(this.getStorage()?.getItem(LESSON_PROGRESS_STORAGE_KEY) ?? null);
    } catch {
      return null;
    }
  }

  write(value: LessonProgressPersistenceV1): void {
    try {
      this.getStorage()?.setItem(LESSON_PROGRESS_STORAGE_KEY, serializeLessonProgress(value));
    } catch {
      // Persistence is best-effort and never rolls back in-memory learning progress.
    }
  }

  clear(): void {
    try {
      this.getStorage()?.removeItem(LESSON_PROGRESS_STORAGE_KEY);
    } catch {
      // Clearing remains safe when localStorage is unavailable.
    }
  }
}
