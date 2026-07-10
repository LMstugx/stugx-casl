# Phase 11: FramePlan Design Layer Summary

Phase 11 adds a design-only FramePlan layer for teaching future stack-frame lowering. It does not implement stack-frame locals, stack arguments, live frame values, FP runtime state, or new C++ syntax. It also does not change emitted CASL, VM behavior, assembler behavior, WASM behavior, mock-core behavior, or current C++ lowering.

## What Phase 11 Adds

- A stack-frame locals design document.
- A StackFramePlan / FrameSlot scaffold.
- A Stack Frame View preview in Register / Stack observation mode.
- Slot selection inside Stack Frame View.
- C++ source, Source Context, SourceEditor Related Frame Symbols, and Generated CASL slot badge relations.
- Signal Probe relation notes for selected FramePlan slots.

## What Remains Design-Only

- FramePlan rows are a design preview.
- Slot Detail must say Not runtime state.
- Runtime frame values are not available in simple mode.
- Future frame slot rows are not live memory rows.
- No fake live values should appear in Stack Frame View, Slot Detail, Signal Probe, or Circuit Focus Mode.
- No fake stack-frame path should be drawn in the circuit.

## Current Simple Lowering

The current C++ function lowering still uses simple static namespaced labels:

- local variables use labels such as MAIN_X and FUNC_ADD_C;
- parameters are passed through GR1, GR2, and GR3, then saved to static namespaced labels;
- GR0 remains the return value register;
- CALL pushes a return address to the real stack;
- stack-aware RET reads the return address when callDepth is greater than zero;
- top-level RET remains program finish compatible.

## FramePlan Metadata

FramePlan metadata describes future storage without changing emitted code:

- StackFramePlan records the function, frame size, return register, argument registers, slots, and warnings.
- FrameSlot records the slot name, kind, offset, current lowering, future storage, and debug label.
- FrameSlotMapping connects C++ symbols, current static labels, and future frame slots.

This metadata is used only for QA, teaching, and future implementation planning.

## Stack Frame View Preview

Stack Frame View shows the FramePlan design preview. It can list argument slots, local slots, return-address slots, frame size, and warnings. It must keep the boundary clear:

- design preview;
- Not runtime state;
- no live frame slots;
- no fake FP state;
- current emitted CASL remains unchanged.

## Slot Selection

Slot selection is UI-only. A slot can be selected from:

- Stack Frame View rows;
- Source Context chips;
- SourceEditor Related Frame Symbols;
- Generated CASL slot badges.

The selected slot updates Slot Detail and Signal Probe relation text. It does not mutate source text, VM state, trace, registers, memory, emitted CASL, or source maps.

## Source / CASL Relation

Source and CASL relation UI explains how the current simple lowering relates to future frame slots:

- an argument symbol can point to GR1-GR3 and a static label such as FUNC_ADD_A;
- a local symbol can point to a static namespaced label such as FUNC_ADD_C;
- the Generated CASL slot badge points from the current static label back to the future FramePlan slot;
- the relation is design-only and must not imply live stack-frame storage.

## Signal Probe Relation

Signal Probe relation is explanatory:

- argument slots explain GR1-GR3 -> static label;
- local slots explain static label -> future frame slot;
- return-address slots explain the existing CALL/RET return-address stack path.

Signal Probe must not show fake live frame values or create fake circuit paths for FramePlan slots.

## Why Real Stack-Frame Lowering Is Deferred

Real stack-frame lowering needs additional decisions and tests:

- whether to introduce a frame pointer;
- whether FP is virtual, UI-only, or a real register;
- how arguments beyond GR1-GR3 spill to stack;
- how locals and temporaries are allocated and released;
- how recursion is taught and bounded;
- how arrays, pointers, and references interact with stack slots;
- how the circuit should show stack-frame reads and writes without overwhelming beginner mode.

## Criteria Before Advanced Lowering

Before implementing advanced stack-frame lowering, the project should have:

- a committed FramePlan test suite for argument, local, temporary, and return-address slots;
- clear prologue and epilogue lowering rules;
- stack cleanup and overflow tests;
- nested call and recursion policy tests;
- UI rules for live frame slot values;
- Circuit Focus Mode rules that avoid fake ALU involvement and preserve the circuit visual contract;
- docs that keep simple static-locals mode separate from advanced stack-frame mode.
