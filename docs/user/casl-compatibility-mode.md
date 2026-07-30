# CASL Compatibility Mode

- Audience: CASL II learners and instructors
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [CASL Workflow](casl-workflow.md), [CASL Input and Output](casl-input-output.md)

CASL Mode is instruction-level execution over the same assembled program and COMET II state used by COMET Mode. It is an independent stugx.CASL interface, not a copy of WCASL-II and not a separate emulator.

Open CASL Mode from the low-weight view switch below the toolbar. Entering or leaving it does not edit source, set Dirty, assemble, run, change the selected source relation, or write a persistence key.

The [Unified Observation Workspace](unified-observation-workspace.md) keeps the Circuit visible while the auxiliary data selection changes. CASL Mode remains the execution-granularity choice; it no longer owns an exclusive whole-page data layout.

## Visible State

The mode keeps these views together:

- source and current mapped line
- current machine instruction
- `GR0` through `GR7`
- `PR`, `SP`, `MAR`, `MDR`, and `FR`
- a navigable 32-word memory window
- eight stack words beginning at `SP`
- console input and output
- deterministic assembler output, symbol table, and literal table

Memory navigation accepts a 16-bit hexadecimal address. Only the current window is rendered; all 65536 words remain addressable without creating 65536 DOM rows. Program, `DC`, and `DS` spans are labelled from the same assembly source map.

## Numeric Display

Hex, signed decimal, unsigned decimal, and fixed 16-bit binary are four presentations of the same machine word:

| Mode | `FFFF` |
| --- | --- |
| Hex | `#FFFF` |
| Signed | `-1` |
| Unsigned | `65535` |
| Binary | `1111 1111 1111 1111` |

Switching format is local UI state. It does not change registers, memory, source, locale-independent word identity, or persistence.

## Reset And Reload

`Reset` restores registers, program counter, stack pointer, Trace, console, and pending input, then reapplies active manual Memory overrides. This makes repeated experiments deterministic without discarding a runtime patch.

`Reload image` restores the assembly-defined image and discards all runtime overrides without reading source or a file again. `Reload DS = 0000` and `Reload DS = FFFF` additionally fill only assembled `DS` spans. Machine instructions, `DC` values, generated literals, and other memory are preserved. Reload is disabled when source is Dirty so an old assembly result cannot silently replace current source ownership.

The displayed value of uninitialized `DS` storage is a simulator policy. A CASL II program must not depend on `DS` being initialized by the language.

## State Editing And Full Clear

Register values remain visually read-only until their Edit action is activated. `GR0`-`GR7`, PR, SP, current FR bits, and one Memory word can be changed through an atomic dialog. Program words require a separate confirmation and are shown as runtime overrides rather than source changes. See [CASL State Editing](casl-state-editing.md).

Full Clear unloads machine state and preserves the source document and its Dirty status. It is a separate destructive action from Reset, Reload, Clear Console, and New. See [Full Clear](full-clear.md).

## Multi-program Sessions

Project Modules can assemble standard `.cas` sources independently and link them into one runtime image. A cross-module `CALL` targets another module's `START` program label. Machine Code, Source Mapping, Trace, Circuit, and Reverse retain module ownership. See [Multi-program Projects](multi-program-projects.md).

## Scope

Step executes one real machine instruction. Reverse Instruction returns to the previous machine boundary; an expanded macro reverses one real expanded instruction at a time. Use [COMET Microcycle Mode](comet-microcycle-mode.md) to advance or reverse one teaching-microarchitecture phase. Redo, Reverse Run, bulk Memory editing, arbitrary cross-module data exports, and proprietary project import are not available.

The final readiness audit classifies this workflow as WCASL-compatible, not as an official or pixel-identical WCASL interface. See the [WCASL Replacement Final Gate](../wcasl-replacement-final-gate.md).
