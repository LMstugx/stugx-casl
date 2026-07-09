# Phase 10J: Observation Mode Split

Phase 10J reduces Focus Mode information density by splitting the same runtime state into three observation modes. This is an information architecture change only: assembler, VM, WASM, mock core, transpiler, and Step / Run / Reset semantics are unchanged.

## Why Observation Modes Are Needed

Circuit Focus Mode had become capable enough to show circuit paths, registers, stack state, memory, trace, source mapping, machine code, Signal Probe, and Call Stack at once. That was useful for implementation, but too dense for learning.

The split follows the same teaching choice offered by WCASL II-style tools: sometimes learners want to observe CPU and main memory movement, and sometimes they want to observe register / stack values numerically.

## CPU Flow Mode

CPU Flow is the default Focus Mode view.

Primary content:

- Program compact view
- Current Instruction
- Circuit panel
- active path and active memory/register row targeting
- Step Timeline
- compact Main Memory window
- compact Signal Probe
- latest Trace context

Full register bank, full stack preview, and machine-code mapping are not shown by default in this mode. The goal is to make the circuit and active path the first visual target.

## Register / Stack Mode

Register / Stack Mode is for value-oriented observation.

Primary content:

- all GR0-GR7 rows
- PR, SP, IR, MAR, MDR, FR
- Stack Preview
- Call Stack
- Main Memory window
- compact Signal Probe
- recent Trace

The circuit is intentionally not the main view here. This mode is for confirming numerical changes in registers, stack memory, and nearby main memory without making the right rail carry every panel at once.

## Code / Machine Mode

Code / Machine Mode is for mapping-oriented study.

Primary content:

- compact source/program context
- Generated CASL
- Machine Code rows with meaning
- Current Source Mapping
- Trace
- small Call Stack / Signal Probe context

This mode is the recommended view for C++ function examples, especially when explaining how C++ calls lower to argument-register setup, `CALL`, generated function labels, machine words, and `RET`.

## Information Density Rules

- Only the selected observation mode shows its full panel set.
- Switching observation mode must not reset source, VM state, trace, lesson progress, generated CASL, or machine code.
- CPU Flow keeps the circuit dominant.
- Register / Stack keeps all GR registers and PR / SP / FR visible.
- Code / Machine keeps generated assembly and machine words readable.
- Secondary panels must remain compact and avoid long-form explanation text.

## Accessibility

The selector is a small tab-style segmented control. Buttons expose `aria-selected`, descriptive labels, and keyboard focus states through the existing button focus-visible rules.

## Current Limitations

- Observation mode selection is session UI state only.
- There are no saved custom layouts.
- Code / Machine Mode uses compact machine-code meaning rows rather than the full bottom-dock explanation panel.
- Register / Stack Mode is not a full debugger watch-window system.

## Future Direction

- Customizable panel presets.
- Saved teaching layouts.
- Keyboard shortcuts for observation modes.
- Instructor presets for CPU path, stack, function lowering, and machine-code mapping lessons.
