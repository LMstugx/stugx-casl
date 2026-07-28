# CASL Compatibility Mode

- Audience: CASL II learners and instructors
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [CASL Workflow](casl-workflow.md), [CASL Input and Output](casl-input-output.md)

CASL Mode is a responsive observation layout over the same assembled program and COMET II state used by the modern Observation Modes. It is an independent stugx.CASL interface, not a copy of WCASL-II and not a separate emulator.

Open CASL Mode from the low-weight view switch below the toolbar. Entering or leaving it does not edit source, set Dirty, assemble, run, change the selected source relation, or write a persistence key.

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

`Reset` restores registers, program counter, stack pointer, memory image, Trace, console, and pending input to the state captured at assembly.

`Reload image` performs the same reset without reading source or a file again. `Reload DS = 0000` and `Reload DS = FFFF` additionally fill only assembled `DS` spans. Machine instructions, `DC` values, generated literals, and other memory are preserved. Reload is disabled when source is Dirty so an old assembly result cannot silently replace current source ownership.

The displayed value of uninitialized `DS` storage is a simulator policy. A CASL II program must not depend on `DS` being initialized by the language.

## Scope

Step executes one real machine instruction. Expanded macros remain visible as grouped source relations, but the VM does not skip their instructions. COMET microcycle stepping, reverse execution, and manual register or memory editing are not available in this phase.
