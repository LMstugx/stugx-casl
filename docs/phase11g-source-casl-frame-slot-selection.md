# Phase 11G: Source and CASL Frame Slot Selection

Phase 11G wires C++ source context and Generated CASL static labels to the design-only FramePlan slot selection model.

This phase does not implement stack-frame locals, stack arguments, recursion, new C++ syntax, VM behavior, assembler behavior, WASM behavior, mock-core behavior, transpiler lowering changes, or emitted CASL changes.

Phase 11H extends this selection into Signal Probe and Slot Detail relation notes. See [Phase 11H: FramePlan Circuit and Signal Probe Relation](phase11h-frameplan-circuit-probe-relation.md).

Phase 11I adds a lightweight Source Editor related-symbol surface for the same design-only selection model. See [Phase 11I: Editor FramePlan Symbol Hover](phase11i-editor-frameplan-symbol-hover.md).

## Purpose

Phase 11F made FramePlan slot rows selectable. Phase 11G lets other teaching surfaces select the same design-only slot:

- C++ source context symbol chips;
- Generated CASL static-label slot badges;
- Stack Frame View rows.

The goal is to help students connect a C++ symbol, its current static label, and the future frame-slot concept without pretending the slot is live memory.

## Design-Only Selection Wiring

The selected frame slot is UI-only state.

It records:

- function name;
- slot name;
- symbol name;
- optional source line;
- current static label;
- selection source.

It does not affect VM state, source text, trace, generated CASL, machine code, or execution.

## C++ Source Symbol To FrameSlot

In Code / Machine mode, Current Source Mapping can show compact source symbol chips.

When a symbol chip is activated, Stack Frame View selection points to the related FramePlan slot. If the current source line directly owns parameter or local slot metadata, the chip uses that mapping. If not, it can fall back to symbols visible in the current source text.

This is not a Monaco editor decoration, hover system, or source rewrite.

## Generated CASL Static Label To FrameSlot

Generated CASL rows can show a subtle `slot` badge when the row label or operand references a current static label from `FrameSlotMapping`.

Examples:

- `FUNC_ADD_A`
- `FUNC_ADD_B`
- `ADD_C`
- `MAIN_RESULT`

Activating the badge selects the corresponding design-only slot and updates Slot Detail.

## Current Static Label Relation

Slot Detail can show the current CASL label relation, for example:

```text
Current CASL label: FUNC_ADD_A
Related C++ symbol: a
Current lowering: static label FUNC_ADD_A
```

This is a relation to the current static-label lowering, not proof of live stack-frame storage.

## Future Stack Slot Relation

The same detail also records future storage such as `future-stack-slot` or `register-argument`.

That field is a future design target only. It is not emitted and is not used by runtime execution.

## No Emitted CASL Change

The Generated CASL text and C++ lowering are unchanged. The `slot` badge is UI decoration derived from FramePlan metadata and current static labels.

Regression tests assert emitted CASL remains unchanged after selection wiring.

## No Runtime Value

Slot Detail must keep showing:

```text
Runtime state: Not available in simple mode.
```

The UI must not display fake live frame slot values, fake FP state, fake stack-frame bounds, or fake local lifetimes.

Signal Probe may show a compact design-only relation for the selected slot, but it must not draw fake frame-slot circuit paths or present fake live values.

## Limitations

- No direct editor variable click yet.
- No editor hover or decoration yet.
- Generated CASL selection is a badge, not a row-level jump system.
- Source chips are compact teaching aids, not full AST navigation.
- Frame slots are not live runtime state.

## Future Work

- Click C++ variables in the editor to select matching FramePlan slots.
- Click Generated CASL labels to jump between code and slot detail.
- Show live stack-frame slot values after stack-frame lowering exists.
- Add real stack-frame lowering for locals and arguments.
- Add debugger-style slot highlighting once live frame slots exist.
