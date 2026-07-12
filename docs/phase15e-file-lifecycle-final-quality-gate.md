# Phase 15E: File Lifecycle Final Quality Gate

## 1. Scope

Phase 15E audits and freezes the Phase 15A-D single-document lifecycle. It adds no file feature. New, Open, Save, Save As, example replacement, Dirty guards, source ownership, transient bindings, adapter cleanup, and native unload safety are validated as one contract.

## 2. Phase 15 Capabilities

- Browser Open accepts one UTF-8 `.cas` or `.cpp` file, strips BOM, normalizes editor text to LF, and never auto-runs.
- Save As uses File System Access after a confirmed `close()` or requests an honest download copy.
- Ordinary Save requires a page-session binding owned by the current `DocumentId`.
- New creates clean untitled CASL II or C++ documents.
- Built-in examples are immutable definitions copied into clean working documents.
- New, Open, and example selection use one replacement intent/controller/atomic transition.
- Native `beforeunload` protection is derived only from revision Dirty state.

## 3. Baseline Manifest

[`file-lifecycle-baseline-v1.json`](file-lifecycle-baseline-v1.json) freezes version 1 languages, extensions, byte limit, encoding/line-ending rules, origins, capabilities, lifecycle/result/failure sets, replacement intents, decisions, identity rules, invalidation categories, preferences, persistence prohibitions, save strategies, beforeunload policy, and backend capabilities.

The manifest is a deterministic validation snapshot. Runtime constants in `src/documents` remain the source of truth, and tests compare them to the manifest. Runtime code never reads the JSON.

## 4. Operation Matrix

[`file-lifecycle-operation-matrix-v1.json`](file-lifecycle-operation-matrix-v1.json) normalizes eight document profiles and fourteen operation rules, covering 112 state/operation combinations without duplicating equivalent rows.

| State | Origin | Dirty | Binding | Save action | Replacement guard | BeforeUnload |
| --- | --- | --- | --- | --- | --- | --- |
| A | untitled | no | no | Save As | none | off |
| B | untitled | yes | no | Save As | required | on |
| C | example | no | no | Save As | none | off |
| D | example | yes | no | Save As | required | on |
| E | external | no | no | Save As | none | off |
| F | external | yes | no | Save As | required | on |
| G | external | no | yes | Save | none | off |
| H | external | yes | yes | Save | required | on |

New/Open/example success creates new document/source identities and invalidates source-owned state. Save/Save As preserves both identities and source-owned state. Cancel/failure preserves everything. Locale and observation changes are application-only.

## 5. Race-Condition Findings

The audit covers repeated Open/Save, cross Open/Save/New/example requests, edits/preferences during Save, replacement during asynchronous work, pending guards, picker cancellation, unmount, stale assemble completion, and obsolete bindings.

One blocker was found and fixed: `requestReplacement()` previously prepared a Dirty guard before checking an active Save/Open operation. It now rejects any request while the controller owns an active operation, so no second pending replacement can be created. UI disabling remains defense in depth.

Operation IDs, current `DocumentId`, and `SourceUnitId` reject stale completions. Stale success does not update metadata, saved revision, binding, notice, or source-derived state.

## 6. Revision Findings

Save captures document/source IDs, revision, content, filename, and line-ending policy. Completion marks only the captured revision saved. An edit to revision N+1 remains Dirty and blocks guarded continuation. A second Save writes N+1 normally.

Confirmed write requires successful create/write/close. Write or close failure leaves Dirty and creates no binding. CRLF serialization and byte measurement operate on output bytes without changing editor text or diagnostic ranges.

## 7. Binding Findings

Bindings are opaque metadata scoped to one `DocumentId`; handles remain private to `TransientWriteBindingRegistry`. Confirmed Save As creates one, normal Save reuses it, and replacement/disposal releases it. Input Open and download copies create none. Missing/revoked targets fail safely; permission failure does not mark clean or expose a path. Refresh losing bindings remains intentional.

## 8. Replacement Invalidation Findings

New/Open/example replacement uses one reducer action and clears diagnostics/selection, editor markers, Generated CASL, Machine Code, source maps, Trace, assembly/VM state, FramePlan preview/selection, related mappings, stale source-unit work, and bindings. Locale, theme, observation mode, Circuit preference, accessibility preferences, and global lesson progress remain.

Cancel/failure and same-example no-op clear nothing. Save/Save As and filename changes do not invalidate source-owned state.

## 9. Unsaved Guard Findings

Open, New CASL, New C++, and example switch use machine intents with complete intent-specific EN/JA/zh-CN action labels. Cancel is initial focus; Escape/backdrop cancel; Discard is explicit/destructive; Save chooses real Save or Save As capability. Failure, cancellation, or a newer edit blocks continuation. Selector/document values commit only after success.

## 10. BeforeUnload Findings

Only Dirty registers the native handler. Clean/save-success/clean replacement removes it; save failure, cancellation, or concurrent edits keep it. The manager prevents default, uses browser-owned prompt text, never auto-saves or writes storage, creates no diagnostic, de-duplicates listeners, and cleans up across unmount/remount. File-operation activity alone is not a condition.

## 11. Adapter Cleanup Findings

Open removes input/listeners, clears input value, permits same-file reselect, releases File references, and ignores stale post-cancel change. Download removes its anchor and revokes its object URL even when click throws. File System Access validates the final name and reports success only after close. No adapter parses, executes, commits store state, or performs network access.

## 12. Security Findings

Path-like, control-character, reserved, empty, long, emoji, Japanese, Chinese, and HTML-like filenames remain safe basenames/plain text. Invalid UTF-8, NUL content, and byte-limit overflow are rejected; exactly 1 MiB is accepted. Source including HTML-like text or CJK comments is retained as plain text and is neither executed nor persisted.

Raw exceptions are not primary messages. No absolute path, handle, target ID, source, operation ID, or raw context is persisted. Directory, archive, URL, network, project, multi-file, and recent-file behavior remain absent.

## 13. Locale And Diagnostic Findings

Locale remains independent application storage and never enters a document/adapter/session payload. File actions do not change locale or Dirty. File failures use file notices rather than code diagnostics. Save preserves diagnostic identity/ranges/selection; replacement clears old source ownership. The Phase 14 diagnostic baseline remains unchanged.

## 14. Accessibility Findings

Toolbar busy/disabled semantics align across New/Open/Save. Save versus Save As and download-copy status are accurate. New/guard dialogs retain modal semantics, safe focus, Escape, focus restoration, clear destructive labels, and no keyboard trap. Notices use status/alert semantics. Dirty markers remain separate from filename text.

## 15. Viewport Findings

Existing Phase 15B-D visual scenarios cover New, Open guard, New guard, example guard, Save As, Saving, Saved, Saved copy, failures, concurrent-edit Dirty, long filenames, Untitled, replacement busy, and notices at 1920x1080, 1440x900, and 1280x720 in EN/JA/zh-CN.

No horizontal overflow, action overlap, toolbar jump, tiny scroll trap, natural-page-scroll regression, Inspector bounded-scroll regression, or Circuit clean-wire regression was found.

## 16. Session Metadata Boundary

Version 1 remains an allowlist-only future contract: last language/example and Observation/Circuit preferences. It excludes source, filenames/paths, handles/targets, diagnostics/markers, generated/machine data, VM/Trace, IDs, Dirty content, pending operations, raw context, and locale. Invalid/unknown versions and enum values are ignored. No storage or restore is implemented.

## 17. Acceptable Limitations

- One current document only; no project, multi-file, directory, URL, archive, or recent-file model.
- File System Access bindings are page-session only and disappear on refresh.
- Download initiation cannot prove a completed disk write.
- Native unload prompt text and availability are browser controlled.
- Session metadata is not persisted; source/session restore is not implemented.
- Long built-in lesson/example content remains outside this lifecycle gate.

## 18. Prohibited Regressions

Future work must not use filename/localized text/content hash as identity; read runtime behavior from the baseline JSON; persist source/path/handle/target IDs; auto-execute opened content; commit stale results; bypass the shared replacement controller; preserve source-owned state across replacement; treat download as confirmed overwrite; or make beforeunload depend on locale/operation state.

## 19. Final Result

**PASS.** Phase 15 single-document file lifecycle is frozen at baseline version 1. Parser, assembler, AST, emitted CASL, lowering, VM behavior, diagnostics, and Phase 14 baseline are unchanged.

## 20. Next Recommendation

Begin Phase 16A with a non-source application-preference persistence audit using the existing metadata allowlist. Keep source, external-file reopening, paths, handles, runtime state, and diagnostics out of persistence unless a separately reviewed project/session architecture explicitly changes the contract.

Phase 16A follows this recommendation with a separate allowlisted preference payload. It does not modify the frozen file-lifecycle manifest or add source/session restore.
