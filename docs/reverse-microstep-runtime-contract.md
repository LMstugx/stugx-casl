# Reverse Microstep Runtime Contract

- Audience: Runtime, bridge, debugger, and UI maintainers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [History Integrity](reverse-history-integrity.md), [COMET Runtime](comet-microcycle-runtime-contract.md), [History ADR](adr/0017-reverse-microstep-and-history-barriers.md)

Reverse Microstep atomically restores the state immediately before the latest committed microcycle. It operates on retained runtime transactions. It does not reassemble source, rerun an instruction, calculate an expected state in React, or play a reverse animation.

## Authority And Request

The C++ Core owns forward history and inverse application. WASM exposes a small request containing the current `historyEpoch` and `timelineRevision`; the application controller separately validates `SourceUnitId`, assembly ID, and `executionEpoch`. Mock Core implements the same observable contract for development tests.

A request returns `reversed`, `unavailable`, `blocked`, `stale`, `corrupt-history`, or `cancelled`. Availability reasons are stable technical codes. The controller and UI read the same Core-derived availability and the Core validates it again when applying the transaction.

## Atomic Restore

Before mutation, the Core verifies:

- history and timeline ownership
- the current architectural and teaching state against the entry's after-state
- every changed memory word against its recorded after-value
- the active microcycle context
- the exact Trace suffix owned by the entry

Only after all checks pass does it restore Memory, GR0-GR7, PR, SP, OF/SF/ZF, IR, MAR, MDR, call depth, run state, microcycle cursor, mapping state, active Circuit path, changed markers, and Trace. A failed integrity check changes nothing.

## Timeline Rules

Each forward commit increments `timelineRevision`. Each reverse also increments it so pending asynchronous completions become stale. Reverse does not increment `historyEpoch`; earlier retained entries in the same epoch remain reversible.

There is no Redo. After a reverse, the popped future entry is gone. A new forward microcycle commits a new timeline. History is session-only and is never written to persistence.

## Scope

The initial UI exposes Reverse Microstep only in COMET Mode. Instruction Step retains one-instruction user semantics. Users may switch to COMET Mode and reverse retained microcycles, including into the middle of an instruction.

Phase 20E adds Reverse Instruction by grouping these retained transactions at runtime-owned machine boundaries. Continuous reverse run, Reverse Macro, a scrubber, branch storage, and project-file history remain outside the contract.
