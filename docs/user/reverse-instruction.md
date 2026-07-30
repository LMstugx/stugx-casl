# Reverse Instruction

- Audience: CASL II learners and instructors
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Reverse Microstep](reverse-microstep.md), [CASL Compatibility Mode](casl-compatibility-mode.md), [COMET Mode](comet-mode.md)

Reverse Instruction restores the COMET II runtime to the state before the latest machine instruction began Fetch.

In CASL Mode, Step executes one complete instruction and Reverse Instruction restores the preceding instruction boundary. In COMET Mode, it also works while an instruction is partway through its phases; the whole partial instruction is restored to its pre-Fetch state. Reverse Microstep remains available only in COMET Mode.

Registers, PR, SP, OF/SF/ZF, Memory changes, IR, MAR, MDR, Trace, Machine Code highlight, source mapping, and Circuit state are restored together. The action does not edit source, change Dirty state, reassemble, or rerun the program.

Expanded macros remain real machine instructions. Reversing an `RPUSH` sequence reverses one expanded `PUSH` at a time, not the complete macro.

Reverse is unavailable across debugger edits, Reset, Reload, Full Clear, new assembly, source replacement, SVC, input/output, and discarded history. Up to 1000 microcycles are retained in the current session. There is no Redo, Reverse Run, Reverse Macro, persistent history, or rollback across external side effects.

For a first-year introduction, demonstrate Reverse Instruction before Reverse Microstep. It preserves the familiar machine-instruction boundary and reduces the chance that a learner mistakes an intermediate microarchitecture latch for a completed CASL operation.
