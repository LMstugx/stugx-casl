# Phase 20E: Deterministic Reverse Instruction

Phase 20E adds atomic machine-instruction rollback on top of the Phase 20D reversible microcycle transaction log.

The C++ Core assigns a runtime identity to every fetched machine instruction, groups its retained microcycles, validates the complete inverse on a candidate VM, and commits only when every entry is reversible. Both completed and partially executed instructions return to the state before Fetch.

CASL Mode exposes Reverse Instruction only. COMET Mode exposes Reverse Microstep and Reverse Instruction. Macro expansion remains machine-real: one action reverses one expanded instruction while preserving the macro source relation.

The existing 1000-entry capacity, history epochs, timeline revision, ownership checks, and debugger/lifecycle/SVC/I/O barriers remain authoritative. The phase does not add Redo, Reverse Run, Reverse Macro, persistent history, multi-program linking, or any change to forward COMET II semantics.
