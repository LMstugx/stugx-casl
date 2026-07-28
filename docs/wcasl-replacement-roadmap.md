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

## Candidate Next Work

Phase 20B may implement the documented COMET teaching microcycle only after proving instruction-specific phases and the absence of fake memory accesses.

Phase 20C may consider manual register/memory editing, full clear, breakpoints, and reverse-step snapshots. These are debugger features, not CASL II semantics, and require ownership and rollback contracts.

Phase 20D may implement structured multi-program linking after the admission gate in [multi-program-linking-design.md](multi-program-linking-design.md).

## Prohibited Shortcuts

- no source concatenation presented as a linker
- no synchronous browser prompt for `IN`
- no fictional macro opcodes or microcycles
- no weakening of diagnostics, file lifecycle, persistence, or clean-wire baselines
- no WCASL binaries, logos, screenshots, copied manuals, or installation assets
- no claim of school or original-author endorsement
