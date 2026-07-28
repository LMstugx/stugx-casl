# Reverse Instruction Runtime Contract

- Audience: Core, bridge, store, and debugger maintainers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Instruction History Grouping](instruction-history-grouping.md), [Reverse Microstep Contract](reverse-microstep-runtime-contract.md), [History Integrity](reverse-history-integrity.md)

Reverse Instruction atomically restores the runtime to the state before the Fetch phase of the latest retained machine instruction. It does not read source, reassemble, execute the instruction again, or reconstruct intermediate state.

## Unit Of Reversal

The unit is one decoded machine instruction. A group is identified by a runtime-owned instruction ID, machine address, mnemonic, history epoch, and ordered reversible entries. Source text and localized labels never define the group.

If execution is inside an instruction, the partial group from Fetch through the current committed phase is reversed. If an instruction has completed, all of its phases are reversed. Both cases require a retained Fetch entry. A truncated group is rejected with `history-capacity-boundary` or `partial-instruction-history`.

Macros are expanded before execution. One Reverse Instruction reverses one expanded instruction, while source mapping continues to identify the original macro line. Reverse Macro and Reverse Source Line are outside this contract.

## Atomic Transaction

The C++ Core:

1. validates source, assembly, history, execution, and timeline ownership;
2. locates the latest contiguous instruction group;
3. validates every after-state and Memory delta on a private candidate VM;
4. runs the existing Reverse Microstep transaction from newest entry to oldest;
5. commits the candidate only when the full group succeeds;
6. removes the corresponding Trace suffix and history entries;
7. increments `timelineRevision` once and invalidates pending application work.

Any mismatch returns `stale` or `corrupt-history` without partially changing the live VM. The implementation uses sparse Memory deltas and never copies a 65536-word Memory image into the public DTO.

## Modes

CASL Mode exposes Reverse Instruction and stays at an instruction boundary. COMET Mode exposes Reverse Instruction and Reverse Microstep. Reverse Microstep remains exclusive to COMET Mode.

## Barriers

Reverse Instruction uses the Phase 20D barrier authority without exceptions. It cannot cross debugger mutation, program override, Reset, Reload, Full Clear, assembly or source replacement, backend replacement, input submission, console or I/O side effects, SVC commit, or the retained-history floor.

The initial release has no Redo, Reverse Run, Reverse Macro, timeline scrubber, branch selector, or persisted history.
