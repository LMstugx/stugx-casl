# Phase 20E.1: Unified Circuit and Data Observation Workspace

- Audience: Maintainers and QA reviewers
- Status: Historical implementation record
- Last reviewed version: 0.1.0
- Classification: Historical
- Related: [Canonical User Guide](user/unified-observation-workspace.md), [ADR 0019](adr/0019-persistent-circuit-with-auxiliary-data.md)

Phase 20E.1 responds to teacher feedback that the former mutually exclusive observation modes hid the Circuit while learners inspected related values.

The implementation introduces one persistent Circuit, auxiliary observation tabs, responsive side/stack layouts, Show Both and focus layouts, and session-only Follow Execution. It preserves CASL/COMET execution semantics, Reverse Microstep, Reverse Instruction, debugger mutation, source ownership, persistence baselines, and the clean-wire contract.

No linker, Redo, Reverse Run, new persistence key, duplicated Circuit runtime, or generated build artifact is part of this phase.
