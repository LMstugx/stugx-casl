# Phase 15C: Browser Save And Save As MVP

## Scope

Phase 15C adds single-document browser Save As and session-scoped Save. It does not add projects, multi-file workspaces, directories, recent files, session restore, handle persistence, or automatic Assemble/Run.

## Honest Save Semantics

- `Save` is shown only when the current `DocumentId` owns a live File System Access binding.
- Examples, untitled documents, browser Open, and download results use `Save As`.
- A File System Access write is confirmed only after `writable.close()` succeeds.
- The fallback requests a browser download and reports `Saved a copy`; it never claims to overwrite an existing file and creates no writable binding.

## Save Flow And Revisions

`DocumentSessionController` captures document ID, source-unit ID, revision, content, filename, and operation ID before calling the adapter. Only its result is committed. The adapter returns the revision it wrote, so editing during I/O leaves the newer current revision Dirty. Completion for a replaced document/source unit is ignored.

Save never parses, assembles, transpiles, resets, steps, runs, or changes locale. Save and Save As preserve document/source-unit identity, content, diagnostic identity/ranges, markers, Generated CASL, Machine Code, Trace, FramePlan selection, and VM state.

## Dirty Open Guard

The Open guard offers `Save and open`, `Discard and open`, and `Cancel`. Save cancellation, failure, or a concurrent edit blocks Open. Discard still preserves the old document until a replacement file has been read and validated successfully.

## Locale, Security, And Accessibility

Save UI strings are complete in EN, JA, and zh-CN. Filenames are basenames rendered as text. Handles, target IDs, paths, and source are not persisted. UTF-8 output has no BOM, output is limited to 1 MiB, object URLs and temporary anchors are cleaned up, and raw exceptions are not primary messages. Cancel receives initial dialog focus; notices use accessible alert/status semantics.

## Limitations

Writable bindings last only for the page session. Download initiation cannot prove a completed disk write or reliably detect every browser download block. Files opened through `<input type=file>` have no overwrite binding. There is no project lifecycle or persistent permission model.

## Phase 15D Recommendation

Implemented in Phase 15D. New and built-in example replacement use the same Save/Discard/Cancel continuation, and the future session metadata contract explicitly excludes handles, paths, source, diagnostics, and VM state.
