# Phase 11C: Stack Frame View Placeholder

Phase 11C adds a read-only Stack Frame View placeholder to Register / Stack observation mode. It does not implement stack-frame locals, stack arguments, recursion, new C++ syntax, new CASL instructions, VM changes, assembler changes, WASM changes, mock-core changes, or transpiler lowering changes.

The goal is to reserve a clear UI location for the future advanced stack-frame model while keeping the current simple mode honest.

## Why This Is A Placeholder

Current C++ function lowering is intentionally simple:

- local variables lower to static namespaced labels such as `MAIN_X`;
- parameter saves lower to static namespaced labels such as `FUNC_ADD_A` and `FUNC_ADD_B`;
- `GR0` carries return values;
- `GR1`, `GR2`, and `GR3` carry the first three integer arguments;
- `CALL` / stack-aware `RET` use the stack for return addresses only.

That is enough for the current teaching demos. It is not a real stack-frame model, so the UI must not show live local slots, stack arguments, frame bounds, or a real frame pointer.

## Current Simple Static Locals

The placeholder states the active mode as:

```text
Simple static locals
```

It also explains:

- no live stack frame locals exist yet;
- C++ locals currently lower to static labels;
- arguments use `GR1-GR3`;
- return values use `GR0`;
- `CALL` / `RET` stack activity stores and reads return addresses only.

This keeps Register / Stack mode useful without implying that locals have moved onto the stack.

## StackFrameViewState Contract

The UI derives a small `StackFrameViewState` from the current COMET state and focus context.

```ts
type StackFrameViewState = {
  mode: "simple-static-locals" | "future-stack-frame";
  hasLiveFrame: boolean;
  currentFunction?: string;
  callDepth: number;
  returnValueRegister: "GR0";
  argumentRegisters: ["GR1", "GR2", "GR3"];
  localsStrategy: "static-namespaced-labels";
  futureSlots: Array<{
    kind: "return-address" | "argument" | "local" | "temporary" | "saved-fp";
    label: string;
    status: "future";
  }>;
};
```

For Phase 11C:

- `mode` is `simple-static-locals`;
- `hasLiveFrame` is always `false`;
- `futureSlots` are explanatory rows only;
- no core DTO extension is needed;
- execution state is not changed.

Phase 11D adds [phase11d-frameplan-generator-scaffold.md](phase11d-frameplan-generator-scaffold.md), a TypeScript-only `buildFramePlans` metadata scaffold. That metadata still does not make the placeholder a live frame view.

## Future StackFramePlan / FrameSlot

The Details section introduces future concepts from Phase 11B:

- return address slot;
- optional saved FP slot;
- argument slots;
- local variable slots;
- temporary slots.

These are not runtime rows. They are labeled as future placeholders so students can see where the advanced model will eventually appear.

## UI Behavior

The Stack Frame View appears only in Register / Stack observation mode. It sits near Stack Preview and Call Stack as tertiary educational context.

It must preserve the primary Register / Stack goals:

- all `GR0-GR7` rows remain visible;
- `PR`, `SP`, and `FR` remain visible;
- Stack Preview remains visible;
- main-memory rows remain visible;
- Signal Probe and Trace stay compact.

CPU Flow mode does not show the placeholder by default because that mode prioritizes the circuit and active path. Code / Machine mode can continue to focus on source, Generated CASL, Machine Code, Trace, and mapping.

## Accessibility

The Details region uses native `details` / `summary` behavior with:

- keyboard focus support;
- `aria-expanded`;
- compact title text;
- no hidden live-frame state.

## What Is Not Implemented

Phase 11C does not implement:

- stack-frame local allocation;
- stack argument passing;
- recursion;
- frame pointer runtime state;
- live frame-slot reads or writes;
- changes to current static namespaced labels;
- C++ lowering changes.

## Limitations

The placeholder is intentionally educational. It cannot show local lifetimes, recursive frames, stack overflow, frame cleanup, or frame-relative addressing until a later phase adds real lowering metadata and runtime behavior.

## Future Phases

- Phase 11D: FramePlan generator only, with no emitted CASL change.
- Phase 11E: single-function stack-frame local lowering MVP.
- Phase 11F: register arguments saved to frame slots.
- Phase 11G: recursion teaching demo.
