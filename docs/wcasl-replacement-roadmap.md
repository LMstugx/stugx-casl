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

## Phase 20E.1

Teacher feedback moves the Circuit from an exclusive observation mode to a persistent teaching view beside switchable data. This is a modern `superset` experience: it links the same runtime event across Circuit, Registers, Memory, Stack, Code / Machine, Source Mapping, and Trace without copying the WCASL interface or changing execution semantics.

## Phase 20F

Phase 20F implements independent module assembly, structured relocation, deterministic placement, linked runtime ownership, and cross-module Source Mapping for standard `.cas` files. It does not concatenate source or parse a proprietary WCASL project format.

## Phase 20G Final Gate

The evidence-based replacement audit uses the frozen compatibility matrix, official conformance regression, an independently authored classroom corpus, production smoke, teacher demo scripts, and a first-year expert walkthrough. The result is `PASS_WITH_LIMITATIONS`: the core classroom workflow is ready for teacher evaluation, with no P0/P1 gaps.

Proprietary project import remains the one blocked P2 item pending a public format contract. Project persistence, Redo, Reverse Run, Reverse Macro, a complete C++ compiler, and stronger student-usability claims remain outside this gate.

## Prohibited Shortcuts

- no source concatenation presented as a linker
- no synchronous browser prompt for `IN`
- no fictional macro opcodes or microcycles
- no weakening of diagnostics, file lifecycle, persistence, or clean-wire baselines
- no WCASL binaries, logos, screenshots, copied manuals, or installation assets
- no claim of school or original-author endorsement
