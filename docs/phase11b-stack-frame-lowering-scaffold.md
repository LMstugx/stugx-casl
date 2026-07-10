# Phase 11B: Stack-Frame Lowering Scaffold

Phase 11B is a design scaffold only. It does not implement stack-frame locals, stack arguments, recursion, new C++ syntax, new CASL instructions, UI runtime changes, VM behavior, assembler behavior, WASM behavior, or mock core behavior.

The goal is to make future stack-frame lowering precise enough to implement safely later.

## Purpose

Phase 11A defined the teaching direction for future stack-frame locals. Phase 11B turns that direction into a concrete future implementation scaffold:

- compiler metadata shape;
- lowering stages;
- Stack Frame View data needs;
- Observation Mode interaction;
- future test plan;
- risks and implementation order.

This document is not executable code. It should guide Phase 11C and later work without changing current generated CASL.

## Current Simple Mode

The current C++ function lowering remains the default simple mode.

Current storage model:

- `MAIN_X` for a `main` local variable;
- `FUNC_ADD_A` for parameter `a`;
- `FUNC_ADD_B` for parameter `b`;
- `FUNC_ADD_C` for a local `c`;
- `GR0` for return values;
- `GR1`, `GR2`, and `GR3` for the first three register arguments.

Advantages:

- generated CASL is short and stable;
- beginners can inspect function calls without frame layout;
- Generated CASL, Machine Code, Trace, Call Stack, and Stack Preview stay readable;
- current demos remain unchanged.

Limitations:

- static namespaced labels are shared storage, not per-call locals;
- recursion cannot be represented correctly;
- local lifetime is not modeled;
- stack arguments are not represented;
- stack-frame slot reads/writes cannot be taught from current lowering.

## Future Advanced Mode

The future stack-frame lowering mode should be an advanced option, not a replacement for simple mode.

Advanced mode goals:

- preserve `GR0` as the return-value register;
- preserve `GR1`-`GR3` as register argument inputs;
- create a per-call frame;
- copy register arguments into frame slots when needed;
- store locals in frame slots;
- free the frame before `RET`;
- expose enough metadata for Stack Frame View and Signal Probe.

The advanced mode should be enabled only when the compiler, docs, and UI can explain the frame.

## Proposed Frame Metadata

Future compiler internals may use a plan object like this:

```ts
type StackFramePlan = {
  functionName: string;
  returnAddressSlot: FrameSlot;
  savedFramePointerSlot?: FrameSlot;
  argumentSlots: FrameSlot[];
  localSlots: FrameSlot[];
  temporarySlots: FrameSlot[];
  frameSize: number;
  usesFramePointer: boolean;
  stackGrowthDirection: "down";
};

type FrameSlot = {
  name: string;
  kind: "argument" | "local" | "temporary" | "return-address" | "saved-fp";
  offset: number;
  sizeWords: number;
  sourceLine?: number;
  labelForDebug?: string;
};
```

This is a design sketch. Do not add these TypeScript runtime types until an implementation phase needs them.

Metadata rules:

- `functionName` is the C++ function name, not necessarily the emitted CASL label.
- `returnAddressSlot` describes the existing return address pushed by `CALL`.
- `savedFramePointerSlot` exists only if a future FP model requires it.
- `argumentSlots` represent `GR1`-`GR3` saves and future stack-passed arguments.
- `localSlots` represent C++ locals such as `int c;`.
- `temporarySlots` are compiler-owned scratch slots.
- `frameSize` is counted in words.
- `stackGrowthDirection` stays downward to match current `PUSH` / `CALL` behavior.

## Future Lowering Stages

Future advanced lowering should be staged and testable.

1. Function entry
   - identify function label and expected frame plan;
   - preserve current `CALL` / stack-aware `RET` semantics.

2. Prologue
   - optionally save old FP;
   - establish frame base if needed;
   - reserve frame slots by adjusting `SP`.

3. Argument save
   - copy `GR1`, `GR2`, and `GR3` into argument slots;
   - later copy stack-passed arguments into normalized argument slots if needed.

4. Local allocation
   - assign each local variable a `FrameSlot`;
   - no static label should be needed for stack-frame locals.

5. Body lowering
   - lower reads/writes through frame slots;
   - keep expression values in registers when possible;
   - use temporary slots only when needed.

6. Return value to `GR0`
   - evaluate return expression into `GR0`.

7. Epilogue
   - release temporary and local slots;
   - restore FP if present;
   - restore `SP` to the expected return-address position.

8. `RET`
   - execute existing stack-aware `RET`.

## Example Pseudo Lowering

Input:

```cpp
int add(int a, int b) {
    int c;
    c = a + b;
    return c;
}
```

Current simple mode:

```text
FUNC_ADD_A DS 1
FUNC_ADD_B DS 1
FUNC_ADD_C DS 1

Function entry:
  ST GR1,FUNC_ADD_A
  ST GR2,FUNC_ADD_B

Body:
  LD GR0,FUNC_ADD_A
  ADDA GR0,FUNC_ADD_B
  ST GR0,FUNC_ADD_C
  LD GR0,FUNC_ADD_C
  RET
```

Future advanced mode sketch:

```text
Frame plan:
  return-address slot: CALL-created stack slot
  argument slot a: frame offset +0
  argument slot b: frame offset +1
  local slot c: frame offset +2

Function entry:
  create frame
  save GR1 into slot a
  save GR2 into slot b

Body:
  load slot a
  add slot b
  store slot c
  load slot c into GR0

Exit:
  release frame
  RET
```

This is not current generated CASL. It is the desired future shape when advanced stack-frame mode is implemented.

## FP Decision Scaffold

Future work must choose one frame-base strategy.

### Option A: No Frame Pointer, SP-Relative Only

Advantages:

- no register reservation;
- simpler VM contract;
- fewer concepts for the first implementation.

Risks:

- offsets move when `SP` changes;
- harder to explain nested temporary pushes;
- UI may need derived frame-base metadata.

### Option B: Virtual FP In Compiler / UI Only

Advantages:

- stable frame-base concept for docs and Stack Frame View;
- no VM register change;
- no real register pressure.

Risks:

- generated CASL must still be explainable;
- students may confuse UI-only FP with COMET-II state.

### Option C: Real FP Register, For Example GR7

Advantages:

- closer to conventional calling conventions;
- visible in Registers;
- stable addressing anchor.

Risks:

- consumes a general register;
- affects user programs and generated code;
- requires a clear reserve-register rule.

Recommendation: do not implement a real FP yet. Keep FP design-only, and prototype either SP-relative lowering or a virtual frame-base concept first.

## Stack Frame View Data Needs

Future Stack Frame View needs data that is not currently part of runtime state.

Required data:

- current function;
- frame depth;
- `SP`;
- optional FP or frame-base value;
- list of frame slots;
- slot values;
- source mapping for each slot;
- active slot read/write marker;
- return address slot;
- prologue / epilogue stage marker when relevant.

Suggested UI-derived shape:

```ts
type StackFrameViewModel = {
  currentFunction: string;
  frameDepth: number;
  sp: number;
  fp?: number;
  slots: FrameSlotView[];
  activeSlotName?: string;
};

type FrameSlotView = {
  name: string;
  kind: "argument" | "local" | "temporary" | "return-address" | "saved-fp";
  address: number;
  value: number;
  sourceLine?: number;
  access?: "read" | "write";
};
```

Again, this is a future scaffold, not a current implementation type.

## Observation Mode Interaction

CPU Flow Mode:

- show only the active stack path;
- prologue and epilogue should not flood the circuit with every frame slot;
- local slot read/write should highlight one active slot at a time.

Register / Stack Mode:

- show the full Stack Frame View;
- keep `GR0`, `GR1`-`GR3`, `SP`, and optional FP visible;
- show frame slots with monospaced addresses and values.

Code / Machine Mode:

- show C++ source to generated CASL mapping for prologue, argument save, local read/write, epilogue, and `RET`;
- Machine Code explanation should distinguish frame-slot access from static labels.

All modes must keep the Circuit Visual Contract intact.

## Future Test Plan

When implementation begins, add tests for:

- frame plan generation per function;
- argument slot allocation for `GR1`, `GR2`, and `GR3`;
- local slot allocation;
- temporary slot allocation;
- frame size calculation;
- return address slot preservation;
- return value in `GR0`;
- prologue and epilogue ordering;
- stack cleanup after return;
- nested calls;
- recursion only if enabled;
- static simple mode regression;
- stack-frame advanced mode opt-in;
- source mapping for frame slots;
- Stack Frame View slot highlighting;
- Signal Probe frame-slot read/write values;
- Observation Mode density with Stack Frame View.

## Risks

- Recursion adds call-depth and per-frame state complexity.
- Local lifetime rules become real semantics rather than static labels.
- Stack overflow and frame-size diagnostics become necessary.
- FP choice can affect register availability and teaching clarity.
- Arrays and pointers require addressable local storage and stronger EAU explanation.
- Too much prologue/epilogue detail can overwhelm beginners.
- Simple mode and advanced mode must not silently diverge in unsupported cases.

## Recommended Future Phases

- Phase 11C: Stack Frame View placeholder UI, no lowering change. See [phase11c-stack-frame-view-placeholder.md](phase11c-stack-frame-view-placeholder.md).
- Phase 11D: FramePlan generator only, no emitted CASL change.
- Phase 11E: single-function stack-frame local lowering MVP.
- Phase 11F: register arguments saved to frame slots.
- Phase 11G: recursive function teaching demo.

## No Runtime Behavior Changed

Phase 11B changes no runtime behavior. Current generated CASL still uses static namespaced labels, current demos still run the same way, and no UI runtime reads stack-frame metadata yet.
