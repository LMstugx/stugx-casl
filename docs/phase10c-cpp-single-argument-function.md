# Phase 10C: C++ Single-Argument Function Call Lowering

Phase 10C adds the first implemented C++ argument-passing path. It keeps the Phase 10B calling-convention design small and concrete:

- `GR1` carries the first argument.
- `GR0` carries the return value.
- `CALL` and stack-aware `RET` keep the existing subroutine flow.
- parameters are saved to static generated labels, not stack-frame locals.

No COMET II VM, WASM bridge, `CALL`, `RET`, `PUSH`, or `POP` semantics are changed.

## Supported Subset

Supported:

- `int foo(int x) { ... }`
- `foo(5)`
- `foo(a)`
- assignment from a single-argument call: `y = foo(5);`
- return from a single-argument call: `return foo(5);`

Still unsupported:

- multiple parameters
- stack arguments
- stack-frame locals
- recursion
- forward declarations
- overloads
- calls inside larger expressions such as `foo(1) + 2`
- complex arguments such as `foo(a + b)`

## GR1 First-Argument Convention

The caller loads the first argument into `GR1` before `CALL`.

Literal argument:

```cpp
y = addOne(5);
```

```casl
     LAD   GR1,5
     CALL  FUNC_ADDONE
     ST    GR0,MAIN_Y
```

Identifier argument:

```cpp
y = addOne(a);
```

```casl
     LD    GR1,MAIN_A
     CALL  FUNC_ADDONE
     ST    GR0,MAIN_Y
```

## GR0 Return Convention

`GR0` remains the return-value register.

```cpp
return x + 1;
```

inside the callee lowers to a normal expression evaluation into `GR0`, followed by `RET`.

## Parameter Save Lowering

At function entry, the callee saves `GR1` into a static parameter label.

```cpp
int addOne(int x) {
    return x + 1;
}
```

```casl
FUNC_ADDONE ST    GR1,FUNC_ADDONE_X
     LD    GR0,FUNC_ADDONE_X
     ADDA  GR0,CONST_1
     RET
```

The generated `FUNC_ADDONE_X` label is a static parameter slot.

```casl
FUNC_ADDONE_X DS 1
```

This keeps the current Generated CASL readable and avoids pretending that stack-frame locals exist.

## Static Parameter Label Limitation

`FUNC_ADDONE_X` is not a real C++ stack-frame local.

Limitations:

- repeated calls reuse the same static parameter slot
- recursion is still unsupported
- parameter lifetime is not per call
- Call Stack does not show locals or arguments as true frame slots
- stack arguments are not implemented

This design is intentionally limited until stack-frame locals are implemented.

## Teaching Views

Use `C++: Function Argument` to observe:

- `LAD GR1,5` before `CALL FUNC_ADDONE`
- `ST GR1,FUNC_ADDONE_X` at function entry
- `GR0` holding the return value `0006`
- Trace showing `GR1` set before `CALL`
- stack-aware `RET` returning to the caller

## Diagnostics

The transpiler reports:

- `only one function parameter is supported yet`
- `function call argument count mismatch`
- `complex function call arguments are not supported yet`
- `parameter name conflicts with local variable`
- `recursive function calls are not supported yet`

## Future Work

- `GR2` / `GR3` for more register arguments
- stack arguments
- stack-frame locals
- caller-saved / callee-saved register rules
- recursion after stack-frame locals exist
- function calls inside larger expressions
