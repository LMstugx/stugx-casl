# Phase 11E: FramePlan Stack Frame View Preview

Phase 11E connects the design-only `FramePlan` metadata from Phase 11D to the read-only Stack Frame View introduced in Phase 11C.

This phase does not implement stack-frame locals, stack arguments, recursion, new C++ syntax, VM behavior, assembler behavior, WASM behavior, mock-core behavior, or new emitted CASL.

Phase 11F extends this preview with selected slot highlighting and Slot Detail in [phase11f-frameplan-slot-highlighting-contract.md](phase11f-frameplan-slot-highlighting-contract.md). That contract remains design-only and still does not make FramePlan rows live runtime slots.

## Purpose

The placeholder Stack Frame View was useful as a warning that current C++ locals are not real stack-frame locals. Phase 11E makes that panel more useful by showing a `FramePlan` preview whenever the current C++ source can be parsed and semantically checked.

The preview is a teaching aid and future implementation guide. It is not runtime state.

## Design-Only Preview

The panel is labeled:

- Design preview
- Not runtime state

That wording is intentional. The preview shows proposed future frame slots, but those slots are not live memory rows, do not have runtime values, and do not affect execution.

## How Stack Frame View Uses FramePlan

The UI derives a `StackFramePreviewState` from:

- current source mode;
- current source text;
- parsed C++ program;
- semantic validation result;
- `buildFramePlans(program)`.

For non-C++ source, invalid C++ source, or unsupported C++ source, the preview is unavailable and the panel stays in simple static-locals mode.

For valid C++ source, the panel can show function-level `StackFramePlan` previews.

## What Is Shown

The Register / Stack observation mode Stack Frame View can show:

- current mode: simple static locals;
- preview availability;
- `GR0` return-value convention;
- `GR1` / `GR2` / `GR3` argument-register convention;
- design-only frame size;
- function selector for sources with multiple functions;
- return-address slot;
- argument slots;
- local slots;
- temporary slot status;
- current lowering notes such as static labels.

Phase 11F allows selecting a row to inspect its `FrameSlotMapping`: source symbol, current static label, future storage, and a clear `Runtime state: Not available in simple mode` note.

Example slot rows:

```text
argument        a          +1 / static label FUNC_ADD_A
argument        b          +2 / static label FUNC_ADD_B
local           c          +3 / static label ADD_C
return          return     +0 / CALL stack
```

## What Is Not Shown

The preview must not show:

- fake live slot values;
- fake frame-pointer state;
- stack-frame local allocation;
- stack arguments;
- recursion frames;
- runtime frame bounds.

The existing Stack Preview and Call Stack remain the runtime views for SP, stack memory, return-address writes, and stack returns.

## No Emitted CASL Change

FramePlan preview generation is separate from normal C++ lowering. It does not call or modify `generateCaslFromCpp`, does not alter the AST, and does not feed into emitted CASL.

Current generated CASL still uses static namespaced labels such as `MAIN_X`, `FUNC_ADD_A`, and `FUNC_ADD_B`.

## No Runtime Change

The VM, assembler, WASM bridge, mock core, `CALL`, stack-aware `RET`, `PUSH`, and `POP` behavior are unchanged.

`CALL` still pushes return addresses. `RET` still returns through the stack only when `callDepth > 0`, and top-level `RET` still finishes the program.

## Relation To Simple Static Labels

The current C++ lowering remains the beginner-friendly simple mode:

- arguments are loaded into `GR1` / `GR2` / `GR3`;
- callee entry saves those argument registers into static parameter labels;
- local variables use static namespaced labels;
- return values use `GR0`;
- no stack-frame locals are allocated.

FramePlan preview explains how those same functions might look in a future advanced stack-frame mode.

## Future Advanced Stack-Frame Lowering

The preview prepares future phases where the compiler may:

- generate a `StackFramePlan` before lowering;
- map arguments to frame slots;
- map locals to frame slots;
- add prologue / epilogue lowering;
- show active frame-slot reads and writes in Stack Frame View;
- teach stack-frame locals without replacing the simple mode.

## Limitations

- FramePlan is currently design metadata only.
- Function selection changes only the preview display.
- Slot selection changes only the preview display.
- No runtime frame slots exist.
- No stack arguments exist.
- No recursion support exists.
- No frame pointer exists.
