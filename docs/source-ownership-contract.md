# Source Ownership Contract

## Identity

`DocumentId` identifies one application document lifecycle instance. `SourceUnitId` identifies the owner of source-derived state. Neither is a filename, display name, locale string, source hash, generated label, or localized message. IDs come from an injectable `DocumentIdFactory` so transitions are deterministic in tests.

Replacing a document creates both a new `DocumentId` and a new `SourceUnitId`. Reopening the same filename still creates a new lifecycle instance unless a future reload design explicitly says otherwise.

## Source-Derived State

The following values belong to one `SourceUnitId`:

- diagnostics and selected diagnostic identity;
- editor diagnostic marker/range;
- Generated CASL;
- machine-code words;
- source map;
- Trace;
- assembly result and VM-loaded status;
- FramePlan preview and selected frame slot.

`SourceDerivedState` is the Phase 15A simulation boundary. It is not wired into the current UI store yet.

## Invalidation

Document/source replacement invalidates all source-derived state in one transition. The replacement receives an empty derived state owned by the new `SourceUnitId`. Old diagnostics, selections, markers, Generated CASL, machine code, source map, Trace, VM state, FramePlan preview, and slot selection cannot survive.

Content edits keep the lifecycle's source identity but continue to use the current store's Dirty/VM invalidation behavior. Phase 15B must reconcile that behavior with `SourceDerivedState` without changing execution semantics.

Filename-only changes, Save, Save As metadata updates, locale changes, diagnostic selection, related-location navigation, observation modes, and tab changes do not create a new source unit and do not invalidate otherwise current source-derived state.

## Navigation Safety

A selected diagnostic or related location can navigate only when its owner equals the current document's `SourceUnitId`. A related generated CASL location must not be presented as a C++ source location. Locale/rendered text is never used to decide ownership.

## Phase 15B Rule

Any asynchronous parse/assemble/file completion must carry or verify source ownership before committing. A stale result for an old source unit is discarded rather than merged into the current document.
