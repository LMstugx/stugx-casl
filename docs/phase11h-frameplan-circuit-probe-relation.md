# Phase 11H: FramePlan Circuit and Signal Probe Relation

Phase 11H connects the design-only FramePlan slot selection model to Signal Probe and Slot Detail explanations. It does not implement stack-frame locals, stack arguments, live frame slot values, or new runtime circuit paths.

## Purpose

Phase 11E and Phase 11F made future frame slots visible and selectable. Phase 11G connected C++ source symbols and Generated CASL static labels to that selection. Phase 11H explains what the selected slot means in the current circuit model:

- arguments currently travel through `GR1` / `GR2` / `GR3` and then static parameter labels,
- locals currently lower to static namespaced labels,
- return-address slots are already represented by the real `CALL` / stack-aware `RET` stack path,
- future frame slots remain design preview metadata.

## Design-Only Rule

This phase is design-only. It does not change emitted CASL, C++ lowering, assembler behavior, VM behavior, WASM behavior, or mock-core behavior.

FramePlan slots still have no live runtime slot values. Signal Probe may explain a selected slot relation, but it must label that relation as not runtime state.

## Signal Probe Relation

When a FramePlan slot is selected, Signal Probe can show a compact relation note.

Argument slot example:

- Slot: `a`
- Current: `GR1 -> FUNC_ADD_A`
- Future: frame argument slot
- Runtime frame value: not available

Local slot example:

- Slot: `c`
- Current: static label `FUNC_ADD_C`
- Future: frame local slot
- Runtime frame value: not available

Return-address slot example:

- Slot: return address
- Current: `CALL` / `RET` return-address stack path
- Future: frame return-address slot
- Runtime value: available only through the existing `CALL` / `RET` stack trace, not as a live frame slot.

## Argument Slot Relation

Argument slots use the current register argument convention:

- first argument: `GR1`
- second argument: `GR2`
- third argument: `GR3`

The current lowering then saves those registers into static labels such as `FUNC_ADD_A`. Future stack-frame lowering may place those values into argument frame slots, but that is not implemented yet.

## Local Slot Relation

Local slots currently have no stack-frame address. They are represented by static namespaced labels such as `MAIN_RESULT` or `ADD_C`. Signal Probe and Slot Detail must describe this as static-label lowering, not as a stack-frame memory access.

## Return-Address Relation

Return-address slots are special because `CALL` / stack-aware `RET` already use the stack for return addresses:

- `CALL` pushes a return address,
- stack-aware `RET` reads the return address and updates `PR`,
- top-level `RET` still finishes the program without a stack read.

FramePlan can describe the return-address slot concept, but it must not imply that full stack-frame locals are live.

## No Fake Live Values

Signal Probe must not show fake frame slot values. Slot Detail must continue to say `Runtime state: Not available in simple mode.` Future values can be described only as design notes.

## No Fake Circuit Path

Selecting a FramePlan slot must not create active circuit wires. It may explain the current lowering relation:

- argument register,
- static label,
- existing `CALL` / `RET` return-address stack path.

It must not draw a fake frame-slot route, fake FP route, or fake live stack-frame local path.

## Future Live Stack-Frame Probe Design

Future phases can reuse this relation model after stack-frame lowering exists:

- selected C++ variable -> FramePlan slot,
- selected Generated CASL label -> FramePlan slot,
- live stack-frame slot value,
- active frame-slot read/write path,
- Signal Probe frame node,
- Stack Frame View live slot highlight.

Those future features require emitted stack-frame lowering metadata and must still follow `docs/circuit-visual-contract.md`.

## Limitations

- No stack-frame locals are implemented.
- No stack arguments are implemented.
- No FP or frame-pointer runtime state exists.
- Signal Probe relation rows are explanatory only.
- Circuit Focus Mode does not render fake frame-slot paths.
