# Lesson Progress Storage Contract

## Scope And Identity

Lesson progress stores only completed suggested-step IDs for built-in lessons. Each persisted lesson has an explicit canonical `lessonId`, matching canonical built-in `exampleId`, and a positive `progressCompatibilityVersion`. Each suggested step has an explicit lesson-local `stepId`. Array index, title, label, instructional text, translation, source text/hash, and display name are prohibited identities.

Checkpoints remain observation prompts rather than completion state. Their explicit IDs are audited but are not persisted. Demo Guide suggested-action strings, practice tasks, panel expansion, and recommended-tab presentation are also outside the payload.

## Model And Storage

Version 1 uses `stugx.casl.lesson-progress.v1` with a 64 KiB limit. The payload contains an `entries` array. Each entry contains only `lessonId`, `exampleId`, `progressCompatibilityVersion`, and sorted unique `completedStepIds`. Entries are sorted by lesson ID. Empty/incomplete steps, text, timestamps, percentages, indices, source, locale, files, diagnostics, and runtime data are absent.

`LessonProgressStorage` owns direct storage access. The web adapter catches unavailable-window, read, parse, quota, write, and clear failures. It neither modifies the store nor emits code diagnostics. Locale, UI preferences, and startup selection remain under their independent keys.

## Untrusted Input

Parsing requires a plain version-1 object and an entries array. Limits are 256 lesson entries, 256 completed steps per lesson, and 128 characters per ID. IDs must be exact nonempty strings without leading/trailing whitespace, NUL, or control characters. Invalid entries are dropped independently; duplicate lesson entries are treated as ambiguous and dropped. Sanitization reads own data descriptors, does not execute accessors, and performs no prototype merge.

The registry is authoritative. Storage IDs cannot trigger dynamic import, file/path lookup, URL construction, HTML/CSS identity, network access, or code execution.

## Compatibility

An entry restores only when lesson ID exists, example ID matches, and compatibility version equals the current lesson definition. Matching versions restore the intersection with current step IDs. Deleted steps are ignored and newly added steps remain incomplete. Wording/translation changes preserve progress because identity is independent.

A compatibility-version mismatch discards that lesson entry. A step ID rename is a new step unless a future code-owned, explicitly reviewed version migration maps it. Index, fuzzy text, translated text, source hash, and storage-provided migrations are forbidden. No migration map is needed for version 1 because history contains no step-ID rename.

## Hydration And Writes

The controller synchronously reconciles storage with the built-in registry before the initial app store is exposed. Hydration is idempotent and does not write, replace source, create IDs, parse/assemble, modify Dirty, VM, diagnostics, locale, preferences, or startup selection.

The in-memory store remains the single UI truth, keyed by canonical example ID as an explicit bridge to existing UI actions. Only valid step toggle/uncheck and per-lesson reset change the persisted snapshot. Unrelated app state cannot trigger a different snapshot; duplicate writes are suppressed. Write failure leaves in-memory UI progress active.

## Built-in Boundary

Step toggles require the current working document to retain built-in example origin and matching canonical selected example metadata. Edited built-in source keeps its canonical progress association, but source text is never used for identity. External and Untitled documents cannot create progress even if their text matches a demo. Open/New/Save do not clear progress. Switching back to a built-in lesson reveals its stored progress.

## Reset

Per-lesson reset removes only that lesson and persists the remaining entries. `clearAllLessonProgress()` clears in-memory progress and best-effort removes only `stugx.casl.lesson-progress.v1`; it has no Phase 16C UI. It does not clear locale, UI preferences, startup selection, source, file lifecycle, diagnostics, or VM state.

Phase 16D validates lesson progress as the fourth synchronous bootstrap domain. Hostile object/prototype traps now fail closed, and aggregate tests confirm that hydration, write failure, reset, and compatibility mismatch cannot affect the other storage keys or source/runtime state.
