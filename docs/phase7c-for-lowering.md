# Phase 7C For Loop Lowering

Phase 7C adds minimal `for` support to the TypeScript C++ subset transpiler. It does not add CASL instructions, change VM semantics, change the WASM bridge, or alter machine-code encoding.

## Supported For Syntax

Declaration initializer:

```cpp
for (int i = 1; i <= 3; i = i + 1) {
    sum = sum + i;
}
```

Assignment initializer:

```cpp
int i;
for (i = 1; i <= 3; i = i + 1) {
    sum = sum + i;
}
```

Supported conditions reuse the existing comparison subset:

- `==`
- `!=`
- `<`
- `<=`
- `>`
- `>=`

Supported increment forms:

- `i = i + 1`
- `i = i - 1`
- `i = i + step`
- `i = i - step`
- Phase 7D also accepts `i++`, `++i`, `i--`, `--i`, `i += step`, and `i -= step` as loop syntax sugar.

`step` can be an integer literal or a declared variable.

## Unsupported Forms

The current subset still rejects:

- `for` without condition
- multiple initializer expressions
- multiple increment expressions
- `break` / `continue`
- `do while`
- `&&`, `||`, unary `!`
- arrays, pointers, references, function calls, classes, structs, templates
- full C++ block scope rules

## Lowering Template

The for loop is lowered as syntax sugar over labels, condition checks, body code, increment code, and a back jump:

```text
initializer
FOR_BEGIN_n
condition
false -> FOR_END_n
FOR_BODY_n
body
increment
JUMP FOR_BEGIN_n
FOR_END_n
```

Example:

```cpp
int main() {
    int sum = 0;
    for (int i = 1; i <= 3; i = i + 1) {
        sum = sum + i;
    }
    return sum;
}
```

Generates CASL shaped like:

```text
MAIN START
     LAD   GR1,1
     ST    GR1,I
FOR_BEGIN_0 LD    GR1,I
     CPA   GR1,CONST_3
     JMI   FOR_BODY_0
     JZE   FOR_BODY_0
     JUMP  FOR_END_0
FOR_BODY_0 LD    GR1,SUM
     ADDA  GR1,I
     ST    GR1,SUM
     LD    GR1,I
     ADDA  GR1,CONST_1
     ST    GR1,I
     JUMP  FOR_BEGIN_0
FOR_END_0 LD    GR0,SUM
     RET
SUM DC    0
I DS    1
CONST_3 DC    3
CONST_1 DC    1
     END
```

## Mapping Rules

New mapping kinds:

- `for-initializer`
- `for-condition`
- `for-body`
- `for-increment`
- `for-label`
- `for-back-jump`

The for source line maps to initializer, condition, increment, generated labels, and the back jump. Body statements map to their own C++ source lines. The Generated CASL panel marks generated labels and back jumps as low-emphasis metadata. Machine Code rows use the same mapping to show related C++ lines.

## Machine Code Observation

After assembly, the Machine Code tab shows the words generated for:

- initializer `LAD` / `ST`
- condition `LD` / `CPA` / conditional jumps
- body `LD` / `ADDA` / `ST`
- increment `LD` / `ADDA` or `SUBA` / `ST`
- `JUMP FOR_BEGIN_n`

The Phase 7B explanation panel continues to decode opcode, register, operand word, and resolved labels for these generated instructions.

## Current Limits

- `for` is syntax sugar only; no new VM behavior was added.
- For declaration initializer variables are statically allocated and initialized by generated CASL before `FOR_BEGIN_n`.
- No nested scope model is implemented.
- `break` and `continue` remain unsupported.

## Next Steps

- Add `break` / `continue` only after mapping and max-step behavior remain stable.
- Consider a compact control-flow graph view if generated label flow becomes hard to follow.
