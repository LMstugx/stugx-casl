# Phase 20D: Deterministic Reverse Microstep

Phase 20D adds one-microcycle rollback to the Phase 20C teaching microarchitecture. The C++ Core owns reversible transactions; WASM and Mock expose equivalent DTO behavior, and COMET Mode provides the only user control.

The implementation restores architecture, teaching latches, sparse Memory changes, mapping, Circuit state, and exact Trace deltas. It verifies after-state integrity before mutation and never crosses debugger, lifecycle, SVC, I/O, source, assembly, backend, or capacity barriers.

History is bounded to 1000 entries and remains session-only. Reverse increments the timeline revision and application execution ownership. Forward execution after reverse creates a new timeline because no Redo history is retained.

Phase 20E subsequently adds machine-level Reverse Instruction by grouping these same transactions. Reverse Run, Redo, timeline scrubbing, persistent history, cross-SVC rollback, and multi-program linking remain outside Phase 20D.
