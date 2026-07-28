# CASL State Editing

- Audience: CASL II learners and instructors
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [CASL Compatibility Mode](casl-compatibility-mode.md), [Full Clear](full-clear.md)

CASL Mode can edit the loaded COMET II teaching state without changing source.

## Registers

Activate a value for `GR0` through `GR7`, `PR`, or `SP`, enter a value in the current numeric format, and choose Apply. FR uses exactly three checkboxes: `OF`, `SF`, and `ZF`. They are applied atomically. `MAR` and `MDR` remain read-only.

Manual register editing:

- changes only the selected target
- does not execute an instruction
- does not recalculate FR after a GR edit
- does not Assemble, Run, Reset, Save, or set source Dirty

An edited PR can point to a mapped instruction or an unmapped address. Execution resumes only after an explicit Step or Run.

Any 16-bit SP value is accepted. Values below `#8000` show a warning because they are outside the usual high-memory teaching stack area; the edit still does not change memory.

## Memory

Select a Memory row, then choose Edit Word. One edit changes exactly one 16-bit word. Program, data, reserved, stack, and unassigned memory can be edited.

Editing a program word changes only the loaded machine image. It requires an additional confirmation. Source and assembler output remain original, while CASL Mode shows the original word, current runtime word, and mapping confidence separately.

Reset keeps current runtime word overrides. Reload restores the assembly-defined image and removes the overrides. Save and Save As never save runtime state.

## Input Formats

| Format | Examples | Range |
| --- | --- | --- |
| Hex | `FFFF`, `#1234`, `0x0042` | `0000`-`FFFF` |
| Signed | `-1`, `32767` | `-32768`-`32767` |
| Unsigned | `0`, `65535` | `0`-`65535` |
| Binary | `0b1010`, `1111 0000` | 1-16 bits |

Invalid or out-of-range input is rejected without wrapping. These form errors are not code diagnostics.

## Availability

Editing requires a current, clean, loaded assembly and a stopped VM. Finished and WaitingInput may be edited; the result becomes Ready and execution resumes only after an explicit Step or Run. Editing is unavailable while Running, during file operations, during another mutation, before assembly, or after source changes invalidate the assembly.
