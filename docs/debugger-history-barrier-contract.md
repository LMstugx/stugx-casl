# Debugger History Barrier Contract

- Audience: Debugger and asynchronous runtime maintainers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Debugger Mutation Contract](debugger-mutation-contract.md), [Frontend State Management](developer/frontend-state-management.md)

Phase 20B does not implement Reverse Step. It establishes the ownership barrier that a later time-travel debugger must obey.

## Execution Ownership

Every asynchronous Step, Run batch, WASM response, waiting-input continuation, and debugger mutation belongs to:

```text
SourceUnitId + assemblyId + executionEpoch
```

The reducer accepts a completion only when all three values still match. A stale completion cannot overwrite a manual edit, restore an older register or memory word, append stale Trace, or emit a success notice.

## Epoch Rules

`executionEpoch` advances for:

- manual GR, PR, SP, FR, or memory edit
- Reset or Reload
- Full Clear
- source replacement or source-mode change
- successful new assembly

`historyEpoch` advances at the same invalidation boundaries. It is a monotonic barrier identity, not retained reverse history. Manual mutation events belong only to the new epoch.

## Future Reverse Step

A future Reverse Step implementation may traverse snapshots only inside the current `historyEpoch`. It must not cross a manual edit, Reload, Full Clear, source replacement, or new assembly unless that boundary is later redesigned as an explicit reversible transaction.

Reload and Full Clear discard all prior history. Full Clear also removes assembly ownership. No Phase 20B control exposes reverse execution or creates fake snapshots.

## Serialization

The core bridge serializes mutating backend calls. The application also allows only one debugger mutation transaction at a time. UI disabling is advisory; controller ownership checks remain authoritative.
