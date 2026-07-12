# Phase 16B: Built-in Example Startup Restore

## 1. Scope

Phase 16B restores only the last successfully committed built-in example selection. It does not restore source sessions, external files, Untitled content, Dirty state, paths, write handles, diagnostics, generated output, VM state, editor state, or operations.

## 2. Separate Persistence Boundary

`lastExampleId` is intentionally absent from the Phase 16A UI preference payload. Three independent keys remain:

- locale: `stugx.casl.locale`;
- UI preferences: `stugx.casl.preferences.v1`;
- startup built-in selection: `stugx.casl.startup-selection.v1`.

Reset/clear operations are isolated, and failure in one adapter does not affect the other two.

## 3. Model And Storage

`StartupSelectionV1` contains only `version: 1` and `lastExampleId`. The adapter is synchronous, injectable, localStorage-safe, and capped at 4 KiB. Serialization is deterministic and allowlist-only. [`startup-selection-baseline-v1.json`](startup-selection-baseline-v1.json) is a test snapshot, never a runtime source.

## 4. ID Resolution And Fallback

Only exact canonical IDs from the static built-in registry resolve. No title, translation, source, extension, pseudo selection, prototype property, path, or dynamic lookup is accepted. Missing/deleted IDs use the current default; an unavailable default uses the first stable registry entry; an empty registry remains with the existing safe initial-document fallback. Invalid fallback does not rewrite storage or show a notice.

No alias migration was added because no verified example-ID rename history exists in the repository.

## 5. Bootstrap Timing

The app establishes locale first, then synchronously hydrates Phase 16A UI preferences and startup selection before constructing `AppStoreProvider`. The resolved example is supplied to `createInitialAppState`, which creates one working document. There is no startup React effect, replacement intent, guard, selector event, async completion, loading modal, or source flash.

Controller hydration is idempotent, including React StrictMode/remount behavior for the same injected storage adapter. Bootstrap never writes startup storage.

## 6. Restored Document

The restored document is an immutable-example working copy with origin `example`, matching language/extension, revision and saved revision `0`, clean Dirty result, `save-as-only`, and fresh application-scoped `DocumentId`/`SourceUnitId`. Source, selected example metadata, and document language are created in one state snapshot.

VM presentation is Idle/NotLoaded. Diagnostics, selection, markers, Generated CASL, Machine Code, source map, Trace, runtime output, FramePlan selection, and write binding start empty. Save therefore presents Save As, and explicit Assemble remains required.

## 7. Write Timing

`StudioShell` persists an ID only after the existing document session controller returns a successful built-in example replacement and the atomic store replacement commits. Cancel, Save failure/cancel, concurrent-edit block, invalid ID, stale result, same-example no-op, Open, New, Save/Save As, locale, and preference changes do not write.

External and Untitled documents do not clear the value. On the next cold start, the last committed built-in example is restored rather than external or unsaved source. Write failure does not roll back a successful switch or set Dirty.

## 8. File, Diagnostic, And VM Boundaries

Startup uses the existing example document factory but does not masquerade as a user replacement. It does not call Open/Save adapters, create lifecycle operations, restore bindings, invoke beforeunload, auto-assemble, or run. Phase 14 diagnostic and Phase 15 file-lifecycle manifests remain unchanged; restored source receives a fresh source unit for future diagnostics.

## 9. Locale And UI Preferences

Locale and safe UI preferences restore independently. Example restore changes none of Observation Mode, Circuit Focus, Inspector tab, Output Dock tab, locale, or their storage payloads. Invalid startup storage still allows UI preference hydration; invalid UI preferences or locale storage do not invalidate the example resolution.

## 10. Security And Privacy

Validation rejects malformed, oversized, accessor-backed, control-character, and noncanonical values. The storage value cannot select prototypes, execute code, import modules, read files, construct URLs, enter HTML/CSS, or reach network APIs. Source, paths, handles, IDs, diagnostics, VM/Trace, arbitrary user text, analytics, and complete payload logs remain prohibited.

## 11. UI And Visual QA

Injected-storage scenarios cover default/restored CASL and C++, invalid/deleted/malformed/oversized fallback, JA and zh-CN locale independence, all Observation modes, Circuit Focus, and 1280px layout. The initial selector, source header, source text, and language agree; no guard, restore notice, loading spinner, Dirty marker, automatic assembly, or horizontal overflow appears.

## 12. Known Limitations

- Only built-in selection is restored; no source/session/external-file restoration exists.
- Storage is browser-local and best-effort.
- Deleted IDs silently use the current default and are not rewritten.
- Alias migration is intentionally absent until a verified rename is introduced.
- Lesson selection/progress remains under its existing memory-only contract.

## 13. Validation

- Unit suite: 67 files and 1,290 tests passed, including 28 startup-selection model, baseline, parsing, resolution, storage, bootstrap, adapter-revalidation, empty-registry fallback, and document tests.
- Browser E2E: 56 tests passed across Mock and WASM, including valid restore, independent locale/preferences, successful write timing, external/Untitled behavior, deleted-ID fallback without rewrite, malformed preference isolation, and 1280px containment.
- Production and WASM builds passed; 21 WASM adapter tests and the dedicated 13-test WASM E2E suite passed.
- `validate-all.ps1` passed, including the complete TypeScript/browser/WASM chain and all 65 CTest cases.
- Visual review and capture passed at 1280x720, 1440x900, and 1920x1080. The injected startup gallery was manually reviewed for source/selector agreement, locale/preference independence, clean Save As/Idle state, clean-wire stability, and overflow.
- `stress-check.ps1` passed 61 stress/fuzz tests plus C++ build/CTest; `pnpm audit` reported no known vulnerabilities.
- `git diff --check`, tracked secret/artifact scan, generated-artifact cleanup, and final clean-worktree verification are part of the commit gate.

## 14. Final Result

**PASS.** Startup restoration remains a narrow canonical built-in selection contract. Phase 14 diagnostics, Phase 15 file lifecycle, Phase 16A preferences, parser/assembler behavior, emitted CASL, lowering, and VM behavior are unchanged.

## 15. Phase 16C Recommendation

Audit lesson-progress persistence as a separate content-versioned preference, or freeze Phase 16 persistence if no stable lesson-step migration contract is available. Do not broaden this startup key into general session restore.

Phase 16D completes that freeze in [`phase16d-persistence-final-quality-gate.md`](phase16d-persistence-final-quality-gate.md). Startup-selection failure, clear, fallback, and writes remain isolated from locale, UI preferences, and lesson progress.

Phase 16C passes that audit using explicit lesson/step IDs and per-lesson compatibility versions under an independent storage key. Startup selection remains unchanged and stores no lesson progress.
