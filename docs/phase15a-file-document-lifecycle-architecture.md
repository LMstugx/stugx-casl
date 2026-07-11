# Phase 15A: File And Document Lifecycle Architecture

## Scope

Phase 15A introduced the pure document/file lifecycle scaffold. Phase 15B now consumes its Open subset through the browser adapter and store bridge; the definitions in this document remain the architectural baseline.

Parser/assembler acceptance, ASTs, emitted CASL, C++ lowering, diagnostic triggers/order/severity, and VM transitions are unchanged.

## Document Model

`SourceDocument` owns source text and lifecycle metadata: branded document/source IDs, language, origin, safe filename/display name, extension, revision/saved revision, save capability, UTF-8 encoding, and line-ending preference. Locale, diagnostics, Generated CASL, machine code, source maps, Trace, VM state, and FramePlan state are excluded.

Dirty is computed by `isDocumentDirty()`. It is not a stored boolean. IDs come from an injectable factory and are never derived from filenames, content hashes, generated labels, or localized text.

## Identity Rules

- `DocumentId`: one application lifecycle instance.
- `SourceUnitId`: ownership boundary for source-derived state.
- filename/displayName: presentation metadata only.
- replacement: new document ID and source-unit ID.
- filename-only Save As update: identities unchanged.

## Origin Rules

- `untitled`: empty/clean initially, no filename, `save-as-only`; first edit is dirty.
- `example`: immutable demo definition copied into a working document, `save-as-only`; future save creates an external file.
- `external-file`: validated open result, clean at revision zero, `save` capable, new identities.
- `restored-session`: future-only; unknown saved revision remains dirty and cannot be falsely treated as saved.

## Dirty And Revision Rules

Edits increment revision. Save success copies revision to saved revision. Save As additionally updates safe filename, extension, origin, capability, and preferred line ending without changing source content/revision/source unit. Cancel/failure returns the exact current document. Assemble/Step/Run, locale, diagnostic selection, related navigation, and observation modes do not mutate document revisions.

## Adapter Boundary

See [file-io-adapter-contract.md](file-io-adapter-contract.md). `TextFileAdapter` has open/save methods and success/cancel/failure results. It has no store, parser, assembler, locale, or DOM dependency. Phase 15B provides the browser Open implementation while Save remains unsupported.

## Validation And Encoding

`.cas` and `.cpp` are accepted case-insensitively, with a configurable 1 MiB default. Validation strips directory data from display names, removes a UTF-8 BOM, rejects NUL content and oversized UTF-8 text, accepts empty files, detects LF/CRLF/mixed endings, and normalizes editor content to LF. Future save serialization uses preferred endings and no BOM by default.

## Source Ownership And Invalidation

See [source-ownership-contract.md](source-ownership-contract.md). `SourceDerivedState` groups diagnostics, selection, marker, Generated CASL, machine words, source map, Trace, assembly/VM state, and FramePlan selection by `SourceUnitId`. Open/replacement commits a new document and empty derived state atomically. Locale and filename-only changes preserve ownership.

## Lifecycle State Machine

Statuses are `idle`, `opening`, `saving`, `save-as`, and `confirming-replace`. One operation may be active. `operationId` rejects stale completion. Save also verifies the pending/current document identity. Cancel returns to idle without an error. Failure preserves document/derived state and stores only a safe failure plus sanitized developer detail. Success commits atomically after adapter success.

## Unsaved Guard

See [unsaved-changes-contract.md](unsaved-changes-contract.md). Dirty replacement intents require `save`, `discard`, or `cancel`. Save failure/cancellation blocks replacement. Dirty demo selection is explicitly a future guarded operation. Locale/observation/tab changes are never guarded.

## Locale Contract

Locale remains outside `SourceDocument`, adapter results, source files, and future project files. File lifecycle actions do not read, infer, reset, or persist locale. Locale storage failure does not affect the document state machine.

## Diagnostic Contract

Diagnostics are source-owned. Replacement clears old diagnostics, selection, markers, and related navigation. Save does not rerun diagnostics; Save As/filename changes do not change identity/ranges. File failures are not parser/assembler diagnostics. The Phase 14 v1 baseline remains unchanged and non-runtime.

## Security Rules

External filenames are plain text with directory information removed. Raw exceptions are not primary messages. The scaffold does not execute content, read directories, load URLs, fetch networks, open archives, persist source/local paths, or call a browser/Tauri file API. Measured UTF-8 size and NUL checks cannot be bypassed by candidate metadata.

## Current Store Migration Matrix

| Current field/surface | Future owner | Classification | Replacement invalidation | Phase 15A action |
| --- | --- | --- | --- | --- |
| `sourceText` | `SourceDocument.content` | document-owned | replace | Phase 15B synchronized bridge |
| `sourceMode` | `SourceDocument.language` | document-owned | replace | Phase 15B synchronized bridge |
| filename/display name | `SourceDocument` | document-owned | replace/update on Save As | Phase 15B Source header |
| `lastAssembledSource` | source unit/runtime | runtime-derived | clear | documented |
| document Dirty | revision helper | document-derived | recompute | Phase 15B derived alongside assembly staleness |
| `diagnostics` | `SourceDerivedState` | source-owned | clear | Phase 15B atomic replacement |
| App diagnostic selection/marker | `SourceDerivedState` | source-owned presentation | clear | Phase 15B source-unit reset |
| `generatedCaslSource` | `SourceDerivedState` | source-owned derived | clear | Phase 15B atomic replacement |
| machine code / `cppToCaslMapping` | `SourceDerivedState` | source-owned derived | clear | Phase 15B atomic replacement |
| `assembleResult` / `cometState` | `SourceDerivedState` | runtime-derived | invalidate | Phase 15B atomic replacement |
| Trace/output tied to execution | `SourceDerivedState` | runtime-derived | clear | Phase 15B atomic replacement |
| FramePlan preview/slot selection | `SourceDerivedState` | source-owned teaching state | clear | Phase 15B source-unit reset |
| `selectedDemoProgramId` | document provenance/UI | example selection | replacement | guard deferred |
| `lessonProgress` | application learning state | not source content | preserve by policy | unchanged |
| `observationMode` | application UI state | preference | preserve | unchanged |
| locale provider/storage | application preference | preference | preserve | unchanged |

## Deferred Implementation

Phase 15B minimally bridges `SourceDocument` into the current store and adds the browser Open picker, guard, and loading state. There is still no save command, project model, session restore, path persistence, multi-file support, or reload identity. Current demo selection behavior remains unchanged.

## Phase 15B Recommendation

Implement one browser text adapter behind `TextFileAdapter` and connect Open/Save As through a narrow document-session controller. Start with one active document, `.cas`/`.cpp`, UTF-8, and the unsaved guard. Preserve existing execution behavior and require source-unit checks before committing any async open or assemble result.
