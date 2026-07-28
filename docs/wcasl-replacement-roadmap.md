# WCASL-compatible Workflow Roadmap

stugx.CASL is an independent, unofficial CASL II / COMET II learning studio. It is a modern replacement candidate based on public specifications; Phase 20A does not claim a perfect replacement or official endorsement.

## Phase 20A

- complete official machine-instruction, directive, literal, and standard-macro coverage
- nonblocking `IN` / `OUT`
- responsive CASL Mode
- four numeric presentations of one 16-bit word
- safe Reset and DS-only reload initialization
- deterministic assembler output and parity fixtures
- machine-readable compatibility and future microcycle contracts

## Phase 20B

- atomic GR, PR, SP, FR, and single-word Memory editing
- explicit program-image runtime overrides
- Reset keeps overrides; Reload restores the assembly image
- Full Clear unloads machine state while preserving source ownership
- execution and history epoch barriers for future Reverse Step

## Phase 20C-20E

Phase 20C implements the documented COMET teaching microarchitecture after proving instruction-specific phases and the absence of fake memory accesses. Phase 20D adds deterministic Reverse Microstep inside one history epoch, with atomic inverse deltas and strict SVC/I/O, mutation, lifecycle, ownership, and capacity barriers. Phase 20E groups those retained transactions by runtime machine instruction identity and adds atomic Reverse Instruction.

## Candidate Next Work

Structured multi-program linking remains behind the Phase 20F gate in [multi-program-linking-design.md](multi-program-linking-design.md). Redo, reverse run, Reverse Macro, and persistent timelines remain separate admission work.

## Prohibited Shortcuts

- no source concatenation presented as a linker
- no synchronous browser prompt for `IN`
- no fictional macro opcodes or microcycles
- no weakening of diagnostics, file lifecycle, persistence, or clean-wire baselines
- no WCASL binaries, logos, screenshots, copied manuals, or installation assets
- no claim of school or original-author endorsement
