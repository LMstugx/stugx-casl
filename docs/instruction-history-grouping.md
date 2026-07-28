# Instruction History Grouping

- Audience: Runtime and debugger maintainers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Reverse Instruction Contract](reverse-instruction-runtime-contract.md), [Microcycle History](developer/microcycle-history.md), [COMET Runtime](comet-microcycle-runtime-contract.md)

An instruction history group is a contiguous suffix of reversible microcycle transactions with one runtime instruction identity.

The Core records:

- `instructionId`
- machine address and decoded mnemonic
- source line and macro mapping ownership
- `startsAtFetch`
- `endsAtInstructionComplete`
- `historyEpoch`
- ordered before/after state and sparse Memory deltas

The identity is assigned when the runtime begins Fetch. It is independent of source text, locale, array index, PR reuse, and presentation selection. Loop iterations at the same machine address receive different runtime instruction identities.

## Completeness

A group is eligible when its oldest retained entry starts at Fetch. The newest entry may be Instruction Complete or an intermediate phase. Capacity eviction that removes Fetch makes the group unavailable; the Core never reverses the remaining suffix and calls it a full instruction rollback.

Groups cannot cross a history epoch or barrier. Macro expansion creates normal machine instructions, so each expanded `PUSH`, `POP`, or SVC-related instruction has its own group while retaining the macro source relation.

## Public Boundary

The UI receives availability and a compact result, not the full transaction list. C++ Core owns grouping, dry-run validation, and commit. WASM forwards the operation and Mock implements the same contract for deterministic tests.
