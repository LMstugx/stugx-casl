# ADR 0017: Reverse Microstep And History Barriers

- Audience: Runtime and debugger maintainers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Teaching Microarchitecture ADR](0016-comet-teaching-microarchitecture.md), [Reverse Runtime Contract](../reverse-microstep-runtime-contract.md), [History Integrity](../reverse-history-integrity.md)

## Context

Phase 20C introduced real microcycle transitions and bounded observations. Reversing them by replaying source, restoring unverified snapshots, or deleting UI rows would permit stale asynchronous work and external side effects to corrupt runtime state.

## Decision

The C++ Core records each reversible microcycle as an atomic transaction with scalar before/after state, microarchitecture context, sparse Memory deltas, and exact Trace deltas. Reverse validates current after-state before applying the inverse.

`historyEpoch` defines a non-crossable interval. `timelineRevision` changes on every forward or reverse commit. Application `executionEpoch` invalidates pending asynchronous completions. Debugger mutations, program overrides, lifecycle replacement, SVC, and I/O establish hard barriers.

History retains at most 1000 entries and is never persisted. SVC and I/O side effects are not reversed. The product exposes Reverse Microstep only; Redo, Reverse Run, Reverse Instruction, and timeline branches remain out of scope.

## Consequences

- Reverse restores real VM and teaching state without re-execution.
- Memory integrity mismatches fail atomically as corrupt history.
- Trace continues to represent the current execution timeline.
- Switching locale, number format, or view does not destroy history.
- A future Reverse Instruction must build on this contract rather than bypass it.
