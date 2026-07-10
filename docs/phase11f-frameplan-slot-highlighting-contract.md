# Phase 11F: FramePlan Slot Highlighting Contract

Phase 11F adds a design-only slot mapping and highlighting contract for the Stack Frame View.

This phase does not implement stack-frame locals, stack arguments, recursion, new C++ syntax, VM behavior, assembler behavior, WASM behavior, mock-core behavior, C++ lowering behavior, or emitted CASL changes.

## Purpose

FramePlan preview already shows proposed future slots. Phase 11F makes those rows inspectable without making them live runtime state.

The goal is to connect three teaching concepts:

- C++ source symbols such as `a`, `b`, and `c`;
- current static labels such as `FUNC_ADD_A`, `FUNC_ADD_B`, and `ADD_C`;
- future stack-frame slots that may exist in an advanced lowering mode.

## Slot Mapping Contract

The UI derives `FrameSlotMapping` metadata from the FramePlan and current AST-derived slot data.

Each mapping records:

- `functionName`
- `symbolName`
- optional `sourceLine`
- `slotKind`
- `frameSlotName`
- `currentLabelForDebug`
- `currentLowering`
- `futureStorage`
- `explanation`
- `runtimeValueAvailable: false`

The mapping is design-only. It is not generated from VM state, does not change `sourceMap`, and does not alter generated CASL.

## Selected Slot Behavior

Stack Frame View slot rows can be selected.

Selecting a row:

- highlights that row;
- opens Slot Detail information;
- updates only local UI state;
- does not step, reset, run, or mutate the VM;
- does not change emitted CASL.

The default state has no selected slot.

## Slot Detail

Slot Detail shows:

- symbol;
- kind;
- current lowering;
- future storage;
- current static label when one exists;
- source line when available;
- generated-CASL label reference when applicable;
- `Runtime state: Not available in simple mode.`

The detail must never show fake live stack slot values.

## Current Static Label Relation

Current lowering still uses static labels.

Examples:

- argument `a` maps to `FUNC_ADD_A`;
- argument `b` maps to `FUNC_ADD_B`;
- local `c` in `add` maps to `ADD_C`;
- return address maps to the current CALL stack behavior.

These labels are current emitted CASL facts. They are not live stack-frame locals.

## Future Stack Slot Relation

For arguments and locals, `futureStorage` describes where the symbol may move in an advanced stack-frame lowering mode.

Arguments keep the current `GR1` / `GR2` / `GR3` register convention today, while the preview can still explain their future argument-slot role. Locals remain static labels today, with `future-stack-slot` reserved for later.

## Accessibility

Slot rows are keyboard-focusable buttons with `aria-selected`.

Focus-visible styling is retained, and the Slot Detail text uses compact rows, ellipsis, and native `title` text for long labels. Selecting a function resets the selected slot if the previous slot is not valid for the new function.

## Limitations

- No live frame slots exist.
- No runtime slot values are displayed.
- No frame pointer state exists.
- No stack-frame locals are emitted.
- No stack arguments are emitted.
- Function and slot selection affect preview display only.

## Future Work

- Click a C++ variable and select the matching FramePlan slot.
- Click a Generated CASL static label and select the matching FramePlan slot.
- Show live stack-frame slot values after stack-frame lowering exists.
- Add real stack-frame lowering for locals and arguments.
- Teach recursive frames once live frame slots exist.
