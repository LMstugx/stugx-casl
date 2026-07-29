# ADR 0020: Deterministic CASL Multi-program Linker

- Audience: Architects and maintainers
- Status: Accepted
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Linker Profile](../casl-multi-program-linker-profile.md), [Relocation Model](../link-relocation-model.md)

## Context

Source concatenation would collapse file ownership, label provenance, Dirty guards, literal pools, and cross-file diagnostics. It would also make linked runtime history depend on whichever editor tab happened to be active.

## Decision

Assemble each module independently, retain module-relative words and relocation records, then atomically resolve a deterministic project order into one linked image. Export only each module's `START` program label in v1. Preserve ordinary, generated, and literal labels as module-local.

## Consequences

Single-module output remains unchanged. Cross-module `CALL` uses the real COMET II instruction and stack. Link failures are project diagnostics and cannot partially mutate Memory. Dynamic linking, optimization, arbitrary exports, and object files remain unsupported.
