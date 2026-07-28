# Microcycle History

- Audience: Core, WASM, Mock, store, and debugger maintainers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Reverse Runtime Contract](../reverse-microstep-runtime-contract.md), [History Integrity](../reverse-history-integrity.md), [COMET VM](comet-vm.md)

`CometVm` is the authority for reversible history. A successful microcycle records a before-state, after-state, contexts, sparse memory changes, and Trace delta under the current history epoch and timeline revision.

## Ownership Layers

- `SourceUnitId` and assembly ID bind the application request to the current document-derived runtime.
- `executionEpoch` invalidates pending application/WASM completions.
- `historyEpoch` separates ranges that must never be crossed.
- `timelineRevision` detects stale forward or reverse operations on the current range.

The app increments execution ownership before an asynchronous reverse request. On success it rebinds the restored DTO to the new execution owner while preserving the Core history epoch.

## Forward And Reverse

Forward commits append one transaction and increment `timelineRevision`. Reverse validates the latest transaction, applies its inverse atomically, pops it, and increments `timelineRevision`. Since the entry is removed, a new forward commit naturally creates a new timeline with no Redo branch.

Snapshots include scalar architecture, teaching latches, mapping markers, and the microcycle cursor. Memory uses ordered deltas. Exact Trace suffixes are tracked so bounded Trace truncation remains reversible.

## Adapter Rules

The WASM adapter forwards `reverseMicrostep`; it must never calculate memory inverses. Mock Core follows the same status, barrier, capacity, and timeline contract for tests. React consumes returned state and may not synthesize a restored VM.

No history DTO contains a full 65536-word snapshot. History is bounded, runtime-only, and absent from persistence and document models.
