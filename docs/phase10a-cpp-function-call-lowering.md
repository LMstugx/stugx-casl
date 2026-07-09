# Phase 10A: C++ Function Call Lowering MVP

Phase 10A adds the first C++ subset function-call path. It does not change COMET II execution semantics; it lowers supported C++ calls into the existing CASL `CALL` and stack-aware `RET` instructions from Phase 9G.

## Supported Function Subset

Supported:

- multiple `int` function definitions
- `int main()` as the entry point
- no-argument helper functions such as `int addOne()`
- assignment from a function call: `x = addOne();`
- return from a function call: `return addOne();`

Not supported:

- function parameters
- forward declarations
- recursion
- overloads
- `void` functions
- function pointers
- calls inside larger expressions such as `foo() + 1`

## GR0 Return Value Convention

The MVP uses `GR0` as the return-value register.

```cpp
int addOne() {
    return 1;
}
```

lowers to a generated function label and a return through `GR0`:

```casl
FUNC_ADDONE LAD   GR0,1
     RET
```

The caller stores `GR0` when the call appears on the right side of an assignment:

```cpp
x = addOne();
```

```casl
     CALL  FUNC_ADDONE
     ST    GR0,MAIN_X
```

## CALL / RET Lowering

`CALL FUNC_ADDONE` uses the existing CASL stack semantics:

1. push the return address to `Memory[SP - 1]`
2. decrement `SP`
3. jump to `FUNC_ADDONE`
4. execute the helper function
5. execute stack-aware `RET`
6. return to the instruction after `CALL`

The final `RET` in `main` still has top-level finish behavior because `callDepth` is zero.

## Static Namespaced Local Labels

This phase does not implement true stack-frame locals.

When multiple C++ functions are present, local variables use static namespaced labels:

- `main` local `x` -> `MAIN_X`
- `addOne` local `x` -> `ADDONE_X`

This keeps labels distinct and makes Generated CASL readable, but it is not full C++ local-variable lifetime semantics.

Single-`main` programs keep their older compact labels to avoid unnecessary churn in existing lessons and demos.

## Mapping

New mapping kinds:

- `function-declaration`
- `function-label`
- `function-call`
- `function-return`

Generated CASL, Machine Code, Trace, and Circuit Focus Mode use these mappings to connect the C++ call line with `CALL`, the `GR0` store, and the returned `RET`.

## Teaching Views

Use `C++: Function Call` to observe:

- `FUNC_ADDONE` in Generated CASL
- `CALL FUNC_ADDONE` in Machine Code
- return address stack write in Trace
- stack-aware `RET` returning to the caller
- final top-level `RET` finishing the program
- `GR0 = 0001`

## Current Limitations

- no parameters
- no recursion
- no local stack frame
- no arguments / locals display in Call Stack
- no C++ calls inside binary expressions
- no C++ function pointer or overload model

## Future Work

- parameter passing convention
- stack-frame local variables
- recursion teaching model
- C++ function calls inside expressions
- arrays and pointer-like addressing
