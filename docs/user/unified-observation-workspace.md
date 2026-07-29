# Unified Observation Workspace

- Audience: Students, teachers, and users studying program execution
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Observation Modes](observation-modes.md), [COMET Mode](comet-mode.md), [Circuit Visualization](../developer/circuit-visualization.md)

The Observation Workspace keeps the live Circuit visible while one auxiliary data view is selected. This allows a class to compare the active data path with the corresponding register, Memory, stack, machine-code, mapping, Trace, Console, or Inspector state.

## Two Independent Choices

Execution mode controls how far one Step advances:

- CASL Mode advances one machine instruction.
- COMET Mode advances one teaching microcycle.

Observation Data controls what appears beside or below the Circuit:

- Registers
- Memory
- Stack
- Code / Machine
- Source Mapping
- Trace
- Console
- Inspector

Changing an observation tab does not assemble, execute, reset, reverse, edit source, or change the VM.

## Layout

`Show both` is the default. Wide windows place the Circuit and data side by side. At 1320 pixels and below, the workspace stacks the Circuit above the data panel so labels remain readable.

`Focus Circuit` reduces the data area to a clear restore control. `Focus Data` expands the selected data view while retaining a compact live Circuit. Both focus layouts use the same Circuit component and runtime state as `Show both`.

## Follow Execution

Follow Execution is enabled by default for the session. It keeps the current Memory address or machine word in view. Turning it off allows manual browsing without changing the active Circuit path or runtime selection.

Follow Execution and workspace layout are temporary presentation state. They do not create a persistence key or set the document Dirty.

## Linked Changes

Register writes, Memory reads and writes, stack activity, machine-word selection, and flag updates come from the same runtime DTO used by the Circuit. A Reverse Microstep or Reverse Instruction restores both views together. Manual debugger edits remain visually distinct from instruction writes.

The clean-wire contract remains unchanged: no arrows, no circular markers, no inactive ghost wires, and active-flow-only emphasis.

Linked projects add module context to Code / Machine, Source Mapping, and Trace while the same persistent Circuit continues to show the single real VM path. A cross-module `CALL`, `RET`, or Reverse operation changes both panes from the same runtime mapping; selecting another editor module does not create a second Circuit or VM.
