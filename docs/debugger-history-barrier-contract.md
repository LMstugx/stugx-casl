# Debugger History Barrier Contract

- Audience: Debugger and asynchronous runtime maintainers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Debugger Mutation Contract](debugger-mutation-contract.md), [Frontend State Management](developer/frontend-state-management.md)

Phase 20B established the ownership barrier. Phase 20D uses it for Reverse Microstep, and Phase 20E reuses the same authority for Reverse Instruction without turning document or UI state into a time-travel project.

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

## Reverse Transactions

Reverse Microstep traverses only verified transactions in the current `historyEpoch`. It cannot cross a manual edit, program-word override, Reset, Reload, Full Clear, source/program/backend replacement, new assembly, input submission, SVC, I/O side effect, or retained-history floor.

Reverse Instruction atomically groups those same transactions by runtime machine instruction identity. It requires the retained Fetch entry and cannot cross any boundary that Reverse Microstep cannot cross.

Every forward and reverse commit increments `timelineRevision`. A grouped instruction reverse increments it once for the complete transaction. Reverse also changes application execution ownership so pending Step, Run, or WASM completions cannot overwrite the restored state. The Core rebinds earlier retained transactions to the current timeline without changing the history epoch.

Reload and Full Clear discard all prior history. Full Clear also removes assembly ownership. Locale, number format, panel selection, and display-mode changes are not barriers.

## Serialization

The core bridge serializes mutating backend calls. The application allows only one debugger mutation or reverse transaction at a time. UI disabling is advisory; controller and Core ownership checks remain authoritative. See the [Reverse Microstep Contract](reverse-microstep-runtime-contract.md) and [Reverse Instruction Contract](reverse-instruction-runtime-contract.md).
