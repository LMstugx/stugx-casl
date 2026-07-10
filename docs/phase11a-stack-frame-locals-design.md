# Phase 11A: C++ Stack-Frame Locals Design

Phase 11A is a design-only phase. It does not implement stack-frame locals, stack arguments, recursion, new C++ syntax, new CASL instructions, or new VM behavior. The current transpiler still uses static namespaced labels such as `MAIN_X`, `FUNC_ADD_A`, and `FUNC_ADD_B`.

## Why Static Namespaced Locals Are Enough For The MVP

The current C++ lowering is intentionally simple:

- `GR0` is the return-value register.
- `GR1`, `GR2`, and `GR3` are the first three register argument slots.
- `CALL` pushes the return address to the stack.
- stack-aware `RET` returns through that stack entry when `callDepth > 0`.
- local variables and saved parameters use static namespaced data labels.

This is enough for the current learning goals. Students can see C++ calls lower to `CALL`, see return values in `GR0`, and observe return-address stack activity without also learning frame layout, variable lifetime, recursion, and stack slot addressing at the same time.

The limitation is semantic: static labels are not real local variables. They do not model per-call storage, so they cannot support recursion, re-entrant calls, or true local lifetime.

## Why Real Function Calls Need Stack Frames

A real function call needs a private storage area for each call instance. That storage area is the stack frame. It normally holds:

- the return address;
- optionally a saved frame pointer;
- stack-passed arguments;
- saved register values when needed;
- local variables;
- temporary values.

Without a stack frame, two calls to the same function reuse the same static labels. That is fine for the simple non-recursive MVP, but it is not a complete function-call model.

## Current Calling Convention To Preserve

The future stack-frame design should preserve the conventions already taught:

- `GR0`: return value.
- `GR1`: first register argument.
- `GR2`: second register argument.
- `GR3`: third register argument.
- `SP`: stack pointer for return addresses, `PUSH` / `POP`, and future stack slots.
- `CALL`: writes the return address to the stack.
- stack-aware `RET`: reads the return address from the stack when inside a call frame.

Stack-frame lowering should extend this model. It should not replace the beginner-friendly register-argument story.

## Two-Mode Recommendation

Use a two-mode route rather than replacing the current behavior.

### Mode A: Simple Register-Argument + Static Locals

This is the current default.

Advantages:

- stable and already implemented;
- easy to inspect in Generated CASL;
- easy to explain in Machine Code and Trace;
- good for first-year function-call teaching;
- no frame-pointer decisions required.

Limitations:

- not real stack-frame storage;
- no recursion;
- no true local lifetime;
- no stack-passed arguments;
- static parameter labels such as `FUNC_ADD_A` are shared storage.

### Mode B: Stack-Frame Locals Advanced Mode

This is future work.

Target behavior:

- function entry creates a frame;
- argument registers can be copied to frame slots;
- local variables are stored in frame slots;
- temporary values can use frame slots when needed;
- function exit releases the frame;
- return value still uses `GR0`;
- `RET` still uses the existing stack-aware return semantics.

This mode should be introduced as an advanced lowering option after the UI can explain frame slots clearly.

## Future Lowering Sketch

Input:

```cpp
int add(int a, int b) {
    int c;
    c = a + b;
    return c;
}

int main() {
    return add(2, 3);
}
```

Current simple lowering shape:

```casl
MAIN START
     LAD   GR1,2
     LAD   GR2,3
     CALL  FUNC_ADD
     RET

FUNC_ADD
     ST    GR1,FUNC_ADD_A
     ST    GR2,FUNC_ADD_B
     LD    GR0,FUNC_ADD_A
     ADDA  GR0,FUNC_ADD_B
     ST    GR0,FUNC_ADD_C
     LD    GR0,FUNC_ADD_C
     RET

FUNC_ADD_A DS 1
FUNC_ADD_B DS 1
FUNC_ADD_C DS 1
     END
```

Future stack-frame lowering sketch:

```text
caller:
  load first arguments into GR1-GR3
  spill additional arguments to future stack slots if needed
  CALL FUNC_ADD
  use GR0 as the return value

callee prologue:
  create frame
  optionally save old FP
  establish FP or frame base
  save GR1-GR3 into argument slots
  allocate local slots

callee body:
  read a and b from argument slots
  write c to a local slot
  place return value in GR0

callee epilogue:
  release local slots
  restore old FP if one exists
  RET
```

This is only a design sketch. The current implementation does not emit this lowering.

## Proposed Stack Frame Layout

The current stack direction decreases on push-like operations. A future frame can follow the same downward-growing stack model.

One proposal:

```text
high address

caller data
optional stack argument slots
return address             <- already pushed by CALL today
saved FP                   <- if a frame pointer is introduced
argument save slots         <- copies of GR1-GR3 when needed
local variable slots
temporary slots

low address
```

Notes:

- This is a proposal, not current behavior.
- The VM does not currently have an FP register.
- `CALL` currently pushes only the return address.
- `PUSH` and `POP` already provide stack read/write semantics that future lowering can reuse.
- Stack-frame locals may require pseudo-lowering helpers even if no new CASL instruction is added.

## Frame Pointer Decision

The design should postpone the exact FP choice.

Options:

1. Reserve a real general register such as `GR7` as FP in advanced mode.
2. Treat FP as a compiler-managed virtual concept shown in UI but lowered through `SP`-relative calculations.
3. Avoid FP initially and use fixed `SP` offsets within a simple single-function frame MVP.

Recommendation:

- Keep current simple mode with no FP.
- In advanced mode, start with a compiler-managed frame-base concept.
- Only reserve a real register after the teaching value and register-pressure cost are clear.

## Function Entry And Exit

Future prologue responsibilities:

- preserve the return address already pushed by `CALL`;
- optionally save previous FP;
- establish frame base;
- copy register arguments from `GR1`-`GR3` into frame slots;
- allocate local and temporary slots by moving `SP`.

Future epilogue responsibilities:

- restore `SP` to the frame boundary;
- restore previous FP if used;
- leave the return value in `GR0`;
- execute `RET`.

The current `RET` compatibility rule should remain: a top-level `RET` finishes the program, while a call-depth `RET` returns through the stack.

## Local Variable And Argument Addressing

Future stack-frame locals should be addressed as frame-relative slots.

Examples:

- `a`: argument slot copied from `GR1`;
- `b`: argument slot copied from `GR2`;
- `c`: local variable slot;
- temporary expression value: temporary slot only when registers are insufficient.

Arguments beyond `GR1`-`GR3` should be stack-passed only in a later phase. That decision is separate from the first local-frame MVP.

## Circuit And UI Impact

Future UI should add a Stack Frame View, not overload the current Stack Preview.

Stack Frame View should show:

- current frame bounds;
- return address;
- saved FP if present;
- argument slots;
- local variable slots;
- temporary slots.

Register / Stack Mode should show the current frame as the primary numeric learning surface. CPU Flow Mode should show only the active stack path for prologue, local read/write, epilogue, and return-address read. Code / Machine Mode should show how C++ variables map to frame slots and generated CASL rows.

Signal Probe should be able to show:

- selected local slot;
- selected argument slot;
- current `SP`;
- optional FP / frame base;
- return address when relevant.

Circuit Focus Mode must continue to follow `docs/circuit-visual-contract.md`:

- stack paths must not fake ALU involvement;
- active routes must remain anchor-based;
- text overflow rules apply to frame slot labels;
- Observation Mode primary/secondary hierarchy must remain intact.

## Why Recursion, Arrays, And Pointers Stay Future Work

Recursion needs per-call storage, which depends on real stack-frame locals and argument slots. Arrays and pointers need addressable local storage, pointer-like addressing, bounds teaching, and more complex EAU / memory visualization.

Those topics should not be introduced until the frame model is visible and stable.

## Open Decisions

The following decisions are intentionally postponed:

1. Which register, if any, becomes FP.
2. Whether FP is real VM state or a compiler/UI concept.
3. Whether arguments beyond `GR1`-`GR3` go directly to stack slots.
4. Whether local variables use stack slots by default in advanced mode.
5. Whether recursion is supported only in advanced mode.
6. How arrays and pointers are represented.
7. How to keep beginner mode simple while offering advanced stack-frame lowering.

## Roadmap Proposal

- Phase 11B: stack-frame locals prototype design tests only, no runtime change.
- Phase 11C: optional Stack Frame View UI placeholder.
- Phase 11D: single-function stack-frame local lowering MVP.
- Phase 11E: arguments spill to stack.
- Phase 11F: recursion teaching demo.
- Phase 12: configurable circuit display / custom circuit sandbox.

## Current Behavior Is Unchanged

Phase 11A does not change generated CASL, machine code, runtime state, Trace, Stack Preview, Call Stack, Signal Probe, Circuit Focus Mode, or any existing demo. It only documents the future design.
