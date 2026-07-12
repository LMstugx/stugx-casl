# Phase 16D: Persistence Final Quality Gate

## 1. Scope

Phase 16D freezes the compatibility, isolation, versioning, reset, privacy, and security contract for the four browser-local persistence domains created through Phase 16A-C. It adds no persisted field, combined session payload, source restore, external-file reopen, runtime restore, settings UI, telemetry, or cloud synchronization.

[`persistence-baseline-v1.json`](persistence-baseline-v1.json) is the deterministic aggregate validation snapshot. Runtime constants, registries, stores, and controllers remain authoritative. The aggregate baseline summarizes but does not replace the four independent contracts or the frozen Phase 14/15 baselines.

## 2. Four-storage Architecture

| Domain | Key | Owner | Version | Limit | Persisted data | Default/fallback | Decision |
| --- | --- | --- | --- | ---: | --- | --- | --- |
| Locale | `stugx.casl.locale` | i18n context/adapter | canonical value | 64 B | `en`, `ja`, or `zh-CN` | invalid stored value is ignored; browser locale then English fallback | frozen |
| UI preferences | `stugx.casl.preferences.v1` | preference controller/store slice | 1 | 16 KiB | observation mode, Circuit Focus boolean, Inspector tab, Output Dock tab | current UI defaults | frozen |
| Startup selection | `stugx.casl.startup-selection.v1` | startup controller and built-in registry | 1 | 4 KiB | last successfully committed built-in example ID | default/first safe built-in example | frozen |
| Lesson progress | `stugx.casl.lesson-progress.v1` | progress controller, lesson registry, progress store slice | 1 | 64 KiB | lesson/example/version and completed step IDs | empty progress | frozen |

All unknown fields are ignored. Unknown V1 payload versions are rejected as a whole. Malformed, oversized, unavailable, or throwing storage resolves independently to that domain's safe fallback. Storage is untrusted input and never a runtime registry.

## 3. Bootstrap Composition

The frozen synchronous order is locale, UI preferences, startup selection, lesson progress, then initial store/document exposure. Locale configures presentation; preferences configure safe UI state; startup selection chooses one immutable built-in definition; lesson progress restores only validated checkbox state. The initial `SourceDocument` is then created once, clean and unassembled, with no diagnostics, Generated CASL, Machine Code, Trace, VM execution state, write binding, guard, notice, source flash, or progress flash.

Controller hydration is idempotent and does not write. One domain's failure cannot skip or overwrite a later domain. React rendering does not directly access localStorage; adapters are independently injectable.

## 4. Failure Isolation

Read, write, and clear failures were injected independently for every key, together with malformed pairs, all-malformed input, missing storage, quota/security exceptions, and storage-unavailable startup. In every case:

- the other domains retain their valid data;
- source, document/source-unit identity, Dirty, diagnostics, VM, and file lifecycle are unchanged;
- no replacement, parser, assembler, run, retry loop, banner, modal, or code diagnostic is created;
- a failed write does not rewrite another key or roll back in-memory UI/progress state;
- fallback resolution does not write back over invalid data.

## 5. Version and Migration Policy

Locale is not a structured version payload; unknown locale normalization yields English, while an invalid stored value is ignored before browser/default resolution. UI preferences, startup selection, and lesson progress accept only version 1. Future versions are not reinterpreted from shape.

Any future migration must be an explicit, deterministic pure function reviewed with the owning registry/schema. It may not use locale, title, display text, array index, fuzzy matching, source hash, file system, URL, network, timestamp, or storage-provided mapping. Migration failure uses current defaults without changing source or writing storage. Lesson compatibility-version mismatch discards only the affected lesson entry.

## 6. Reset Isolation

| Reset/clear | Removed key/state | Explicitly preserved |
| --- | --- | --- |
| Clear locale | locale key | active in-memory locale and all other keys/state |
| Reset UI preferences | preference key and in-memory safe defaults | locale, startup, lessons, source, file/runtime state |
| Clear startup selection | startup key | current document and all other keys/state |
| Reset one lesson | that lesson's completed steps | other lessons and every independent key/state |
| Clear all lesson progress | lesson key and in-memory progress | locale, preferences, startup, source, file/runtime state |

Clear failure is best-effort and never makes the document Dirty. No combined reset UI exists. A future global reset must list every affected key explicitly.

## 7. Write-trigger Matrix

| User action | Locale | UI prefs | Startup | Lessons |
| --- | :---: | :---: | :---: | :---: |
| Locale switch | write | - | - | - |
| Observation/Circuit/allowed tab change | - | write | - | - |
| Successful built-in example commit | - | - | write | - |
| Lesson step toggle/reset | - | - | - | write |
| New/Open/Save/Save As | - | - | - | - |
| Source edit | - | - | - | - |
| Assemble/Run/Step | - | - | - | - |
| Diagnostic/FrameSlot selection | - | - | - | - |
| Hydration/default fallback | - | - | - | - |

Unchanged snapshots are suppressed. Render and failure paths do not start cross-key writes.

## 8. Privacy Findings

Serialized values are limited to canonical locale/UI enums and booleans, canonical built-in example/lesson/step IDs, and compatibility versions. Contract tests inspect actual serializer output. No payload contains source, comments, arbitrary user text, filename/path, document/source IDs, handles/targets, Dirty, diagnostics/ranges/raw context, Generated CASL, Machine Code, source map, Trace/output/VM, operation IDs, modal/focus/cursor/scroll state, timestamp, or external-file reopening data.

The four keys do not jointly promise or reconstruct a working session: startup restores one immutable built-in source, while the other keys restore only presentation and built-in completion metadata.

## 9. Security Findings

Structured parsers require plain own-data objects, bounded payloads, bounded arrays/IDs, safe enums/booleans, deterministic allowlist serialization, and registry validation. Getter/prototype/Proxy traps, circular values, prototype-like keys, duplicates, control characters, invalid Unicode edges, huge strings, huge arrays, malformed JSON, and future versions fail safely. No adapter logs full payloads, creates timers/listeners, retries, accesses the network, constructs paths/URLs, dynamically imports data, or merges prototypes.

Phase 16D adds a 64-byte locale storage bound and an isolated locale clear operation. Startup-selection and lesson-progress sanitizers now catch hostile prototype/Proxy traps; valid V1 behavior is unchanged.

## 10. Cross-storage Findings

EN/JA/zh-CN, every observation mode, Circuit Focus, CASL/C++ startup examples, and empty/partial lesson progress hydrate independently in tested combinations. A valid key survives one or all other invalid keys. The resulting document remains clean, VM Idle/NotLoaded, unassembled, and free of stale diagnostics/generated output. No default-source or progress flash was observed.

## 11. Phase 14/15 Regression

The Phase 14 diagnostic manifest, diagnostic locale-independent identity, Phase 15 lifecycle manifest and 112-combination operation matrix, and Phase 16A-C independent baselines remain unchanged. New/Open/Save/Save As/Demo guards, beforeunload, parser/assembler acceptance, emitted CASL, lowering, VM behavior, source ownership invalidation, and clean-wire presentation remain unchanged.

## 12. Accessibility and Visual Result

Restored locale labels, `aria-pressed`/`aria-selected` preference controls, tabs, Circuit Focus, and lesson checkboxes expose the restored state without focus replacement or duplicate live announcements. Invalid or unavailable storage creates no banner, modal, or code diagnostic. Injected-storage visual review covers all-valid locales, every invalid domain, all invalid, storage unavailable, reset isolation, cross-key failure, and 1280/1440/1920 viewports.

## 13. Acceptable Limitations

- Persistence remains browser-local, best-effort, and unsynchronized across devices.
- Private/incognito or policy-restricted storage may revert any domain to safe defaults.
- Clearing locale has no UI in this phase and does not change the active locale until a later selection/startup.
- There is no combined reset UI or migration from hypothetical future versions.
- Lesson progress is built-in-only; startup selection never restores external/Untitled work.

## 14. Prohibited Future Regressions

Do not merge the keys, serialize app/store state wholesale, add source/session/file/runtime data, infer versions, migrate by text/index/hash, couple failure/reset paths, write during hydration/fallback, bypass adapters, or make a baseline a runtime source. Any new persisted field requires an owning schema, privacy review, explicit version/migration policy, independent reset/write tests, and baseline update.

## 15. Validation

Phase 16D passed the complete release-quality gate:

- `pnpm test`: 71 files and 1,341 tests passed.
- `pnpm build`, `pnpm build:wasm`, and `pnpm test:wasm`: passed; the WASM adapter suite passed 21 tests.
- `pnpm test:e2e` and `pnpm test:e2e:wasm`: 58 full browser tests and 13 WASM-only browser tests passed.
- `pnpm visual:review` and `pnpm visual:capture`: all three 1280/1440/1920 gallery tests passed. The generated Phase 16D EN/JA/zh-CN, invalid-domain, unavailable-storage, reset, failure-isolation, and viewport images were manually reviewed before artifact cleanup.
- `scripts/validate-all.ps1`: passed, including all 65 C++ core tests.
- `scripts/stress-check.ps1`: passed 61 stress tests, the WASM adapter suite, and all 65 C++ core tests.
- `pnpm audit`: no known vulnerabilities.
- Diff, deterministic JSON, frozen-baseline, tracked-file, secret-name, and generated-artifact gates passed before commit.

## 16. Final Result

**PASS.** The four independent persistence domains are frozen with explicit bootstrap, failure, reset, write, version, privacy, security, and migration boundaries. Phase 16 adds no implicit session/source restore and changes no parser, assembler, lowering, diagnostic, file-lifecycle, or VM semantics.

## 17. Phase 17 Recommendation

Proceed to the next product capability only after treating the Phase 16D aggregate baseline as the persistence change gate. Keep source/session restore out of incidental UI work; if requested later, design it as a separate threat-modeled lifecycle phase with explicit user consent and file ownership semantics.

Phase 17A consumes the frozen four-storage bootstrap in production static smoke tests. It does not alter keys, payloads, hydration, reset, write triggers, or the aggregate persistence baseline.
