# Document Session Controller

`DocumentSessionController` coordinates asynchronous Open, Save, and Save As boundaries without owning React UI or store state.

## Responsibilities

1. enforce the Dirty guard decision;
2. allow one active operation;
3. allocate a non-localized operation ID;
4. call `TextFileAdapter.openTextFile()`;
5. verify that the pending document is still current;
6. sanitize failure detail;
7. create a fresh external `SourceDocument` after success;
8. return a stable result for the caller to commit.

Results are `opened`, `cancelled`, `blocked-unsaved`, `failed`, or `stale-ignored`. The controller does not parse, assemble, run, set locale, create code diagnostics, or directly mutate the store.

Save results report strategy, captured saved revision, whether the latest document remains Dirty, and optional binding metadata. `requestSave()` uses a live binding or routes to Save As; `requestSaveAs()` always chooses a new target/copy. A changed revision may accept an older `savedRevision`, but changed document/source identity makes completion stale.

## Atomic Commit

The React store receives an opened document through one replacement action. That action synchronizes compatibility source/language fields and invalidates all old source-derived runtime state in one reducer transition. Local diagnostic and FramePlan selections are cleared in the same React event before commit and are also protected by the new `SourceUnitId`.

## Concurrency

A second request while Open is active returns `stale-ignored`. Completion is also ignored when the original `DocumentId` is no longer current. Locale changes do not invalidate the operation; source replacement does.
