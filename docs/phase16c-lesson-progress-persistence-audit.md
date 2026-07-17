# Phase 16C: Lesson Progress Persistence Stability Audit And Safe MVP

## 1. Scope And Admission Result

Phase 16C audited all built-in Guided Lessons, suggested steps, checkpoints, Demo Guide suggested actions, practice-task relation, store actions, and example replacement behavior. The audit passed admission: persistent identity can be made explicit without changing teaching text, order, recommended tabs, checkboxes, parser/assembler behavior, emitted CASL, lowering, diagnostics, or VM semantics.

## 2. Current Identity Audit

The registry contains 17 lessons, 58 suggested steps, and 52 checkpoints. Before Phase 16C, lesson ownership used canonical `exampleId`; every suggested step and checkpoint already had an explicit semantic `id`. Machine audit found no duplicate lesson IDs, no duplicate step IDs within a lesson, no index-generated IDs, and no title/locale-derived identity. Git history from Phase 8C through Phase 10D shows additions only and no real step-ID rename.

Phase 16C adds explicit `lessonId`, renames the existing step metadata field from `id` to `stepId` without changing any value, and sets `progressCompatibilityVersion: 1` on each lesson. Checkpoint IDs remain stable UI keys but checkpoint completion is intentionally not persisted.

| Lesson / example ID | Suggested step IDs | Step decision | Checkpoint decision | Risk |
| --- | --- | --- | --- | --- |
| `casl-gr2-addition` | `assemble`, `step-ld`, `step-adda`, `step-st` | stable-persistable | intentionally-session-only | low |
| `casl-logic-operations` | `assemble`, `step-logic`, `check-result` | stable-persistable | intentionally-session-only | low |
| `casl-logical-add-compare` | `assemble`, `step-cpl`, `step-jov`, `check-result` | stable-persistable | intentionally-session-only | low |
| `casl-shift-operations` | `assemble`, `step-shifts`, `circuit-focus`, `check-result` | stable-persistable | intentionally-session-only | low |
| `casl-index-addressing` | `assemble`, `step-lad`, `step-ld-indexed`, `check-result` | stable-persistable | intentionally-session-only | low |
| `casl-push-pop-stack` | `assemble`, `step-push`, `step-pop`, `check-result` | stable-persistable | intentionally-session-only | low |
| `casl-call-return` | `assemble`, `step-call`, `step-sub-ret`, `finish` | stable-persistable | intentionally-session-only | low |
| `casl-nested-call-return` | `assemble`, `step-calls`, `step-returns`, `check-result` | stable-persistable | intentionally-session-only | low |
| `cpp-function-call` | `open-generated`, `inspect-call`, `run-trace` | stable-persistable | intentionally-session-only | low |
| `cpp-function-argument` | `open-generated`, `inspect-function-entry`, `run-trace` | stable-persistable | intentionally-session-only | low |
| `cpp-function-arguments` | `open-generated`, `inspect-function-entry`, `run-trace` | stable-persistable | intentionally-session-only | low |
| `cpp-addition` | `assemble`, `machine-code`, `run` | stable-persistable | intentionally-session-only | low |
| `cpp-if-else` | `generated-casl`, `jump-word`, `run` | stable-persistable | intentionally-session-only | low |
| `cpp-while-sum` | `labels`, `trace`, `memory` | stable-persistable | intentionally-session-only | low |
| `cpp-for-sum` | `find-for-labels`, `inspect-machine`, `run` | stable-persistable | intentionally-session-only | low |
| `cpp-for-sum-sugar` | `open-generated`, `inspect-machine`, `run` | stable-persistable | intentionally-session-only | low |
| `cpp-break-continue` | `open-generated`, `inspect-jumps`, `run-trace` | stable-persistable | intentionally-session-only | low |

All 17 lessons were `stable-after-explicit-id` at audit start and are `stable-persistable` after metadata addition. All 58 steps are individually covered by the table and decision. Demo suggested-action strings and practice tasks are `intentionally-session-only`; they remain text, not progress identity.

Checkpoint IDs were also audited and remain non-completion metadata:

- `casl-gr2-addition`: `gr2-after-ld`, `gr2-after-adda`, `memory-c-after-st`;
- `casl-logic-operations`: `logic-opcodes`, `logic-result`;
- `casl-logical-add-compare`: `addl-result`, `cpl-flags`, `jov-fallthrough`, `result`;
- `casl-shift-operations`: `shift-opcodes`, `shift-no-memory-read`, `shift-final-result`;
- `casl-index-addressing`: `x-field`, `effective-address`, `final-result`;
- `casl-push-pop-stack`: `push-sp-decrement`, `push-stores-ea`, `pop-loads-gr`, `final-result`;
- `casl-call-return`: `call-stack-write`, `ret-stack-return`, `top-level-ret`, `final-result`;
- `casl-nested-call-return`: `depth-two`, `ret-order`, `result`;
- `cpp-function-call`: `function-label`, `call-stack`, `gr0-result`;
- `cpp-function-argument`: `gr1-argument`, `parameter-save`, `gr0-result`;
- `cpp-function-arguments`: `gr1-gr2-arguments`, `parameter-saves`, `gr0-result`;
- `cpp-addition`: `generated-casl-addition`, `machine-code-rows`, `return-value`;
- `cpp-if-else`: `contains-cpa-jze`, `target-info`, `final-gr0`;
- `cpp-while-sum`: `loop-labels`, `trace-loop`, `final-sum`;
- `cpp-for-sum`: `for-labels`, `final-gr0`;
- `cpp-for-sum-sugar`: `increment-lowering`, `compound-lowering`, `final-gr0`;
- `cpp-break-continue`: `continue-target`, `break-target`, `final-gr0`.

All 52 checkpoint IDs are explicit, text/locale/index independent, and lesson-local unique. Their decision is `intentionally-session-only` because the UI does not expose checkpoint completion controls.

## 3. Compatibility Version Policy

Version 1 freezes current semantic meanings. Wording or future translation changes preserve completion. Added steps start incomplete; removed IDs are ignored. Semantic replacement or incompatible meaning requires incrementing the lesson version, which discards older progress by default. Renaming a step creates a new step unless a future explicit code-owned migration is reviewed. No text/index/fuzzy migration is allowed.

## 4. Storage Model

`LessonProgressPersistenceV1` is stored separately under `stugx.casl.lesson-progress.v1`, capped at 64 KiB. It uses deterministic sorted entry arrays and sorted unique completed-step arrays. [`lesson-progress-baseline-v1.json`](lesson-progress-baseline-v1.json) freezes runtime constants and the text-free 17-lesson/58-step registry snapshot for validation only.

## 5. Hydration And Store Bridge

Locale, UI preferences, startup selection, and lesson progress remain separate controllers. Lesson progress is synchronously reconciled before `AppStoreProvider` creates initial state, so checkboxes do not render empty then jump. Existing in-memory `lessonProgress[exampleId][stepId]` remains the single UI truth; the persistence model is derived from it through current lesson metadata rather than maintained as a second state tree.

Hydration does not replace source, change document/source IDs, set Dirty, parse/assemble, alter diagnostics/VM, change current example, or write storage.

## 6. Write And Reset Behavior

Valid user checkbox toggle/uncheck and per-lesson reset produce persistence updates. Same snapshots are suppressed. Source, VM, locale, preferences, file lifecycle, example switch, diagnostics, details, and FramePlan interactions do not write. Storage failure does not roll back progress or set Dirty.

The non-UI clear-all action removes only lesson-progress storage and memory. It does not clear locale, preferences, startup selection, source, file lifecycle, diagnostics, or VM.

## 7. Built-in, Locale, And Security Boundaries

Only canonical selected built-in example metadata can create progress. External/Untitled source, including text equal to a demo, cannot infer a lesson. Open/New/Save preserve progress; startup-restored built-in examples receive matching progress. Lesson and step IDs do not vary across EN/JA/zh-CN, and locale never enters or triggers the payload.

Parsing is own-data, plain-object, bounded, allowlist-only, and registry-reconciled. It rejects malformed/oversized payloads, unsafe IDs, accessors, ambiguity, and version mismatch without diagnostics. No source, paths, handles, document IDs, text, raw context, runtime state, analytics, network access, or executable data is stored.

## 8. Visual And Accessibility Scope

The existing checklist UI is unchanged except for a stable `data-step-id` test hook. Injected visual scenarios cover empty/partial/complete/restored EN/JA/zh-CN, reset, invalid version, deleted step, lesson-version mismatch, external source, and 1280px. Checkbox semantics, count, natural scroll, bounded panels, and clean-wire behavior remain under review.

## 9. Documentation Note

The repository history contains Phase 8C/8D commits but no separate Phase 8C/8D markdown files. The active [`learning-guide.md`](learning-guide.md) and later Phase 8K study-mode document carry the historical learning guidance and are updated with the frozen identity contract.

## 10. Acceptable Limitations

- Progress is browser-local and best-effort; no cross-device sync exists.
- Version mismatch discards one lesson's progress rather than guessing migration.
- No historical migration map exists because no rename was found.
- Checkpoints, practice tasks, panel state, active lesson, and lesson text remain unpersisted.
- There is no clear-all UI; only the tested controller/store action exists.

## 11. Validation

Phase 16C passed the complete validation gate:

- `pnpm test`: 69 files and 1,325 tests passed.
- `pnpm build`, `pnpm build:wasm`, and `pnpm test:wasm`: passed; the WASM adapter suite passed 21 tests.
- `pnpm test:e2e` and `pnpm test:e2e:wasm`: 57 full browser tests and 13 WASM-only browser tests passed.
- `pnpm visual:review` and `pnpm visual:capture`: all three target viewports passed; the generated gallery was manually reviewed for progress counts, locale stability, invalid-data fallback, external-source isolation, scrolling, overflow, and clean-wire regressions.
- `scripts/validate-all.ps1`: passed, including all 65 C++ core tests.
- `scripts/stress-check.ps1`: passed 61 stress tests, the WASM adapter suite, and all 65 C++ core tests.
- `pnpm audit`: no known vulnerabilities.
- Diff, artifact, and tracked-file secret gates passed before commit; generated visual/build outputs were not committed.

## 12. Final Result

**PASS.** All 17 built-in lessons and 58 guided steps meet the explicit identity and compatibility-version admission criteria. Browser-local persistence is enabled only for validated built-in completed-step IDs, with no source, file, locale, diagnostic, generated-output, or VM state included.

## 13. Phase 16D Recommendation

Run a Phase 16 persistence final quality gate covering all four independent storage contracts, upgrade/reset behavior, cross-key failure isolation, and privacy regression. Do not broaden lesson progress into source/session restoration.

Phase 16D performs that gate and freezes the four-key aggregate in [`persistence-baseline-v1.json`](persistence-baseline-v1.json). The Phase 16C lesson/step IDs, compatibility versions, payload fields, and built-in-only policy are unchanged.

## Phase 19A Registry Addition

Phase 19A adds the built-in `cpp-double-storage` lesson under the unchanged Phase 16C identity and compatibility contract. Its decision is `stable-persistable`; checkpoint completion remains `intentionally-session-only`.

- Stable step IDs: `assemble-source`, `inspect-generated-storage`, `open-memory`, `select-x`, `step-to-copy`, `observe-word-reads`, `observe-word-writes`, `confirm-y-bits`, `confirm-y-value`, `confirm-copy-not-move`.
- Session-only checkpoint IDs: `x-binary64`, `y-copy-order`, `y-decoded-value`, `x-preserved`.
- Compatibility version: `1`.
- The addition changes no storage key or payload field. Existing lesson entries remain compatible, and the new lesson starts with no completed steps.
