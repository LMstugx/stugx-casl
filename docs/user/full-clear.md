# Full Clear

- Audience: CASL II learners and instructors
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [CASL State Editing](casl-state-editing.md), [Open, Save, and New](open-save-new.md)

Full Clear unloads the current machine state. It is separate from Reset, Reload, Clear Console, and New.

## Cleared

- loaded program and runtime memory
- `GR0`-`GR7`, PR, SP, FR, stack preview, and current instruction state
- Trace, console output, pending input, and waiting-input state
- runtime word overrides and machine-image revision
- assembly/runtime ownership and generated runtime metadata
- debugger history barrier content and runtime selections

The VM returns to Not Loaded/Idle. Assemble is required before Step or Run.

## Preserved

- source content, document name, and source Dirty state
- locale and UI preferences
- Observation Mode and CASL Mode choice
- startup example and built-in lesson progress
- current source diagnostics under their existing source ownership

Full Clear does not save, write storage, make a network request, invoke the unsaved-source guard, or automatically Assemble.

## Confirmation

The confirmation dialog initially focuses Cancel. Escape or the backdrop cancels. Closing restores focus to the Full Clear trigger. This project records Full Clear as intentionally different from exact WCASL behavior because complete public evidence for the legacy document lifecycle is unavailable.
