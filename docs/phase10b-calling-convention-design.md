# Phase 10B: C++ Calling Convention and Stack-Frame Design

Phase 10B is a design and teaching-preparation phase. It did not add C++ syntax, parameters, recursion, stack-frame locals, or new VM behavior when it was introduced.

Phase 10C implements the first part of this design: a single `int` parameter passed through `GR1`.

The Phase 10A implementation started as:

- no-argument `int` functions
- `CALL FUNC_NAME` for a function call
- `GR0` as the return-value register
- stack-aware `RET` inside a call frame
- top-level `RET` in `main` still finishes the program
- static namespaced local labels such as `MAIN_X` and `ADDONE_X`

Phase 10C extends that with:

- one `int` parameter per helper function
- `GR1` as the first argument register
- static parameter labels such as `FUNC_ADDONE_X`

## Design Goals

Future C++ function lowering should be easy to explain from the existing CASL and COMET-II views:

1. C++ call site
2. Generated CASL `CALL`
3. return address on the stack
4. argument passing convention
5. callee return through `GR0`
6. caller stores or uses `GR0`
7. stack-frame locals when they are eventually implemented

The convention should stay small enough for students to trace in Generated CASL, Machine Code, Trace, Stack Preview, and Circuit Focus Mode.

## Current Return Convention

`GR0` is the return-value register.

```cpp
int value() {
    return 1;
}
```

The callee evaluates the return expression into `GR0` and then emits `RET`.

```casl
FUNC_VALUE LAD   GR0,1
     RET
```

At the call site, the caller treats `GR0` as the returned value:

```casl
     CALL  FUNC_VALUE
     ST    GR0,MAIN_X
```

This convention is already implemented in Phase 10A and should remain stable.

## Future Parameter Convention

Phase 10C implements the first register-argument slot. The broader proposed convention remains a hybrid design:

- `GR1`, `GR2`, and `GR3` are the first register argument slots; only `GR1` is implemented today.
- Additional arguments, when supported later, are passed on the stack.
- `GR0` remains reserved for the return value.
- `SP` owns stack argument and return-address storage.
- `CALL` continues to push the return address.

Example shape:

```cpp
int add(int a, int b) {
    return a + b;
}
```

Possible lowering direction:

```casl
     LAD   GR1,2      ; arg0
     LAD   GR2,3      ; arg1
     CALL  FUNC_ADD
     ST    GR0,MAIN_X
```

Inside `FUNC_ADD`, `GR1` and `GR2` would be read as parameters. Today only the single-argument `GR1` version is implemented; `GR2` remains future work.

## Register Arguments vs Stack Arguments

Register arguments are good for the first teaching step:

- easy to see in the Register panel
- no stack-frame layout needed for one or two arguments
- fewer generated CASL rows
- less noise in Trace

Stack arguments are needed for a more complete model:

- more than a few arguments
- recursive calls
- preserving caller values
- later local-variable frames
- closer connection to stack-frame teaching

The first parameter implementation should prefer register arguments. Stack arguments should be introduced only when the Stack Preview and Call Stack views can explain where each value is stored.

## Static Namespaced Locals Today

Current C++ locals are not stack-frame locals.

When multiple functions are present, the transpiler emits static namespaced labels:

- `main` local `x` -> `MAIN_X`
- `addOne` local `x` -> `ADDONE_X`

This is intentionally simple. It avoids label collisions and keeps Generated CASL readable, but it has limitations:

- no per-call local storage
- no recursion
- no lifetime separation between repeated calls
- no local layout relative to `SP`
- no arguments or locals in Call Stack as true frame slots

This is why recursive function calls remain unsupported.

## Future Stack-Frame Locals

A future stack-frame design should separate these pieces:

- return address pushed by `CALL`
- saved caller registers, if needed
- stack arguments beyond register arguments
- callee local variables
- temporary values for complex expressions

One possible teaching frame shape:

```text
Memory[SP + 0]  return address
Memory[SP + 1]  saved GR1
Memory[SP + 2]  local x
Memory[SP + 3]  local y
```

The exact layout should be chosen only when parameters and local stack variables are implemented. Until then, docs and UI should call the current locals "static namespaced labels", not stack-frame locals.

## Circuit and UI Implications

Future parameter support should reuse existing teaching surfaces:

- Register panel: show `GR1` / `GR2` argument values.
- Machine Code: show `CALL` and return-address write as today.
- Stack Preview: show stack arguments only when they are actually implemented.
- Call Stack view: show call depth and return address, not fake locals.
- Signal Probe: show argument registers and `GR0` return value when available.
- Circuit Focus Mode: keep `CALL` as a control / stack path, not an ALU operation.

No UI should imply stack-frame locals before the transpiler actually lowers locals onto the stack.

## Current Limitations

Still not implemented:

- multiple function parameters
- `GR2` / `GR3` argument lowering
- stack arguments
- stack-frame locals
- recursion
- caller-saved / callee-saved register rules
- function calls inside larger expressions
- argument evaluation order
- local lifetime per call

## Future Work

Recommended next steps:

1. Add one- and two-argument functions using `GR1` and `GR2`.
2. Document caller-owned argument setup in Generated CASL.
3. Add Circuit Focus hints for `GR1` / `GR2` argument values.
4. Add stack arguments only after the Call Stack view can display them clearly.
5. Add stack-frame locals after parameters are stable.
6. Consider recursion only after stack-frame locals exist.
