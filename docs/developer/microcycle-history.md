# Microcycle History

- Audience: Core, WASM, Mock, store, and debugger maintainers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Reverse Microstep Contract](../reverse-microstep-runtime-contract.md), [Reverse Instruction Contract](../reverse-instruction-runtime-contract.md), [History Integrity](../reverse-history-integrity.md)

`CometVm` is the authority for reversible history. A successful microcycle records a before-state, after-state, contexts, sparse memory changes, and Trace delta under the current history epoch and timeline revision.

## Ownership Layers

- `SourceUnitId` and assembly ID bind the application request to the current document-derived runtime.
- `executionEpoch` invalidates pending application/WASM completions.
- `historyEpoch` separates ranges that must never be crossed.
- `timelineRevision` detects stale forward or reverse operations on the current range.
- `ProjectId`, `LinkId`, and `LinkRevision` bind history to one immutable linked image.

The app increments execution ownership before an asynchronous reverse request. On success it rebinds the restored DTO to the new execution owner while preserving the Core history epoch.

## Forward And Reverse

Forward commits append one transaction and increment `timelineRevision`. Reverse Microstep validates the latest transaction, applies its inverse atomically, pops it, and increments `timelineRevision`. Reverse Instruction identifies a contiguous runtime instruction group, validates all entries on a candidate VM, applies the same inverse transaction newest-first, and increments the live timeline once. Since reversed entries are removed, new forward execution creates a new timeline with no Redo branch.

Snapshots include scalar architecture, teaching latches, mapping markers, and the microcycle cursor. Memory uses ordered deltas. Exact Trace suffixes are tracked so bounded Trace truncation remains reversible.

Every entry records a runtime `instructionId`, machine address, mnemonic, Fetch-start marker, and Instruction-Complete marker. The grouping contract is machine-owned and never derived from source text. See [Instruction History Grouping](../instruction-history-grouping.md).

## Adapter Rules

The WASM adapter forwards `reverseMicrostep` and `reverseInstruction`; it must never calculate memory inverses. Mock Core follows the same status, grouping, barrier, capacity, and timeline contract for tests. React consumes returned state and may not synthesize a restored VM.

No history DTO contains a full 65536-word snapshot. History is bounded, runtime-only, and absent from persistence and document models.

Successful Link/Relink, module add/remove/reorder, Main change, and module source replacement invalidate linked ownership. Reverse cannot cross those boundaries or apply an entry from an older `LinkId`.
