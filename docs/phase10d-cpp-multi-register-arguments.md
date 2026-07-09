# Phase 10D: C++ Multi-Register Argument Lowering

Phase 10D extends the C++ subset function-call MVP from one argument to at most three `int` arguments.

It does not change the CASL VM, WASM bridge, `CALL`, `RET`, `PUSH`, or `POP` semantics. The change is only in TypeScript C++ subset parsing, semantic checks, and C++ to CASL lowering.

## Supported Subset

Supported:

- `int f() { ... }`
- `int f(int a) { ... }`
- `int f(int a, int b) { ... }`
- `int f(int a, int b, int c) { ... }`
- calls with matching 0-3 arguments
- literal arguments such as `add(2, 3)`
- identifier arguments such as `add(x, y)`
- assignment from a call: `result = add(2, 3);`
- return from a call: `return add(2, 3);`

Still unsupported:

- four or more parameters
- stack arguments
- stack-frame locals
- recursion
- forward declarations
- overloads
- calls inside larger expressions such as `add(1, 2) + 3`
- complex arguments such as `add(a + b, c)`

## Register Argument Convention

The first three arguments use general registers:

| C++ argument | CASL register |
| --- | --- |
| arg0 | `GR1` |
| arg1 | `GR2` |
| arg2 | `GR3` |

`GR0` remains reserved for the return value.

## Call-Site Lowering

Literal arguments:

```cpp
result = add(2, 3);
```

lower to:

```casl
     LAD   GR1,2
     LAD   GR2,3
     CALL  FUNC_ADD
     ST    GR0,MAIN_RESULT
```

Identifier arguments:

```cpp
result = add(x, y);
```

lower to:

```casl
     LD    GR1,MAIN_X
     LD    GR2,MAIN_Y
     CALL  FUNC_ADD
     ST    GR0,MAIN_RESULT
```

## Callee Parameter Save

The callee saves register arguments immediately into static namespaced parameter labels.

```cpp
int add(int a, int b) {
    return a + b;
}
```

lowers to:

```casl
FUNC_ADD ST    GR1,FUNC_ADD_A
     ST    GR2,FUNC_ADD_B
     LD    GR0,FUNC_ADD_A
     ADDA  GR0,FUNC_ADD_B
     RET
```

The generated labels:

```casl
FUNC_ADD_A DS 1
FUNC_ADD_B DS 1
```

are static parameter slots. They are not stack-frame locals.

## GR0 Return Convention

Return expressions are evaluated into `GR0`.

```cpp
return a + b;
```

becomes a normal expression evaluation using the generated parameter labels:

```casl
     LD    GR0,FUNC_ADD_A
     ADDA  GR0,FUNC_ADD_B
     RET
```

The caller reads the result from `GR0` after `CALL`.

## Why Stack Arguments Are Not Implemented Yet

Stack arguments require a real frame layout:

- where return address lives
- where arguments live relative to `SP`
- whether caller or callee cleans argument slots
- how locals are allocated
- how recursion gets separate storage per call

Phase 10D avoids pretending that this exists. The current generated parameter labels are simple static memory slots so students can observe the register convention without needing a full stack-frame model.

## Diagnostics

Expected diagnostics include:

- `only up to three function parameters are supported yet`
- `function call argument count mismatch`
- `duplicate parameter name`
- `parameter name conflicts with local variable`
- `complex function call arguments are not supported yet`
- `recursive function calls are not supported yet`

## Teaching Demo

Use `C++: Function Arguments`:

```cpp
int add(int a, int b) {
    return a + b;
}

int main() {
    int result;
    result = add(2, 3);
    return result;
}
```

Expected observations:

- `LAD GR1,2`
- `LAD GR2,3`
- `CALL FUNC_ADD`
- `ST GR1,FUNC_ADD_A`
- `ST GR2,FUNC_ADD_B`
- final `GR0 = 0005`

## Current Limitations

- maximum three `int` arguments
- no stack arguments
- no stack-frame locals
- no recursion
- no function overloads
- no forward declarations
- no complex arguments
- no function calls inside binary expressions

## Future Work

- stack arguments after the Call Stack and Stack Preview can explain them clearly
- real stack-frame locals
- caller-saved / callee-saved register rules
- recursion after stack frames exist
- array and pointer-style access only after index-addressing lessons are mature
