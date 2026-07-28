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

## Candidate Next Work

Phase 20C may implement Reverse Step using the frozen history barrier. Phase 20D may implement the documented COMET teaching microcycle only after proving instruction-specific phases and the absence of fake memory accesses. Phase 20E may implement structured multi-program linking after the admission gate in [multi-program-linking-design.md](multi-program-linking-design.md).

## Prohibited Shortcuts

- no source concatenation presented as a linker
- no synchronous browser prompt for `IN`
- no fictional macro opcodes or microcycles
- no weakening of diagnostics, file lifecycle, persistence, or clean-wire baselines
- no WCASL binaries, logos, screenshots, copied manuals, or installation assets
- no claim of school or original-author endorsement
