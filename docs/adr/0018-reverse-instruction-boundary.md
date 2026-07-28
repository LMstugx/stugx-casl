# ADR 0018: Reverse Instruction Uses Runtime Machine Boundaries

- Audience: Runtime and debugger maintainers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [ADR 0017](0017-reverse-microstep-and-history-barriers.md), [Reverse Instruction Contract](../reverse-instruction-runtime-contract.md)

## Decision

Reverse Instruction groups the already recorded Phase 20D microcycle transactions by a runtime instruction identity and reverses the complete retained group atomically.

The machine instruction, not a source line or macro, is the reverse unit. A partial instruction is eligible only when its Fetch entry remains available. The operation reuses Reverse Microstep validation on a private VM candidate and commits only after every inverse succeeds.

## Rationale

Machine identity is stable across localization, source formatting, macro expansion, and repeated execution at one address. Reusing the established inverse transaction keeps Memory integrity, Trace rollback, mapping restoration, and barriers consistent instead of creating a second history system.

## Consequences

- CASL Mode can reverse between instruction boundaries.
- COMET Mode can reverse a partial or complete instruction.
- expanded macro instructions reverse individually;
- capacity-truncated groups cannot be partially restored;
- SVC, I/O, mutation, and lifecycle barriers remain absolute;
- Redo, Reverse Run, Reverse Macro, and persistent timelines remain unsupported.

The new ADR number is 0018 because ADR 0017 already freezes Reverse Microstep and history barriers.
