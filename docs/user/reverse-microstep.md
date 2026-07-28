# Reverse Microstep

- Audience: CASL II learners and instructors
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [COMET Microcycle Mode](comet-microcycle-mode.md), [CASL State Editing](casl-state-editing.md), [Known Limitations](known-limitations.md)

Reverse Microstep is available in the COMET Mode panel. It restores the machine to the state before the most recently completed microcycle.

The restored state includes registers, OF/SF/ZF, Memory writes, IR, MAR, MDR, the current phase, Machine Code highlight, source relation, Circuit path, and microcycle Trace. The action does not edit source, change document Dirty state, reassemble, or rerun the program.

## Using It

1. Assemble a CASL II program.
2. Open COMET Mode.
3. advance one or more microcycles.
4. Select **Reverse Microstep**.
5. Inspect the restored phase and state.

The control keeps keyboard focus. A short status notice reports the restored phase; it is not added to execution Trace.

## Boundaries

Reverse cannot cross a debugger edit, Reset, Reload, Full Clear, new assembly, source replacement, input/output, or SVC side effect. It is disabled while Run is active or input is waiting. The displayed reason explains the boundary.

History holds at most 1000 microcycles in the current session. Earlier entries may become unavailable. There is no Redo, Reverse Run, Reverse Instruction, persistent history, or timeline scrubber.

Instruction Mode still executes one complete instruction. Switch to COMET Mode to inspect or reverse intermediate phases.
