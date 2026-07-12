# Phase 16A: Non-source Application Preference Persistence

## 1. Scope

Phase 16A persists a narrow set of non-source UI preferences. It adds no source/session restore, project behavior, file reopening, runtime restore, diagnostic migration, or parser/VM change.

## 2. Inventory And Decisions

The complete audit is in [`application-preference-inventory.md`](application-preference-inventory.md). Observation Mode, Circuit Focus enabled, Inspector active tab, and Output Dock active tab are `persist-now`. Locale remains independently persisted. Theme has no implemented stable enum and is deferred. Source, example, lessons, editor state, diagnostics, machine/runtime state, file operations, and modals remain excluded.

## 3. Versioned Model

Version 1 uses `stugx.casl.preferences.v1`, a 16 KiB maximum, strict machine enums, and deterministic allowlist serialization. [`application-preferences-baseline-v1.json`](application-preferences-baseline-v1.json) is a validation snapshot; runtime constants in `src/preferences` remain the source of truth.

## 4. Storage And Sanitization

The Web adapter catches missing localStorage, access errors, quota errors, malformed JSON, and clear failures. The validator accepts only a plain version-1 object, ignores unknown/unsafe keys, discards invalid fields independently, and never spreads untrusted data into the store.

## 5. Hydration

The controller hydrates synchronously and once before store initialization. Partial valid payloads merge with existing defaults. Hydration changes only the four presentation fields and does not replace source, create IDs, set Dirty, parse/assemble, alter diagnostics/VM, change locale, or start a file operation.

## 6. Write Behavior

The centralized store selector emits only the four fields. Duplicate snapshots are suppressed. User changes to Observation Mode, Circuit Focus, Inspector, or Output Dock persist; source edits, execution, diagnostics, locale, and file lifecycle changes do not. Write failure leaves the in-memory UI selection active.

## 7. Reset And Failure Handling

The controller exposes a non-UI reset that restores defaults and clears only the application-preference key. Read/write/clear failures safely use defaults or retain in-memory values and never enter the code diagnostic system.

## 8. Locale, File, And Diagnostic Boundaries

Locale continues at `stugx.casl.locale` and is absent from the preference payload. New/Open/Save/Save As/example replacement preserve these preferences but do not write unless a preference actually changed. Phase 14 diagnostic and Phase 15 file-lifecycle manifests remain unchanged.

## 9. Security And Privacy

No source, filenames, paths, handles, IDs, diagnostics, raw context, VM/Trace, editor coordinates, arbitrary user strings, operation state, analytics, or network synchronization is present. Oversized payloads are ignored.

## 10. Accessibility And Visual Behavior

Restored tabs use their existing accessible tab semantics. Hydration has no loading modal or error banner. Existing 1920, 1440, and 1280 layouts, natural page scroll, bounded Inspector Memory scroll, and clean-wire contract remain unchanged.

## 11. Acceptable Limitations

- Theme remains deferred because the UI has only a disabled placeholder.
- Lesson progress remains memory-only pending a stable content migration model.
- No source/session/external-file restore is implemented.
- Preferences are local-browser only and have no cross-device synchronization.

## 12. Validation

- Unit suite: 66 files and 1,262 tests passed, including 27 Phase 16A model/store/UI tests.
- Browser E2E: 55 tests passed, including preference reload, partial-invalid recovery, unknown-version fallback, locale independence, and 1280px overflow checks.
- WASM build, 21 adapter tests, 13 WASM E2E tests, 65 CTest cases, and 61 stress/fuzz tests passed.
- Visual review and gallery capture passed at 1280x720, 1440x900, and 1920x1080.
- `pnpm audit` reported no known vulnerabilities.

## 13. Final Result

**PASS.** Phase 16A persists only the four approved non-source presentation preferences. Phase 14 diagnostics, Phase 15 file lifecycle, parser/assembler behavior, emitted CASL, lowering, and VM behavior remain unchanged.

## 14. Phase 16B Recommendation

Audit optional built-in-example startup restoration separately. `lastExampleId` may only be admitted through the frozen source replacement contract, with deleted-ID fallback and no external-file, Dirty source, runtime, path, or handle restoration.

Phase 16B implements that recommendation with a separate startup-selection key. The Phase 16A persisted-field allowlist and reset semantics remain unchanged.

Phase 16C likewise keeps versioned built-in lesson progress in a separate key. It does not add lesson fields to the Phase 16A preference payload or reset contract.
