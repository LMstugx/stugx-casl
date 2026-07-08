# Phase 5C If Else Lowering

Phase 5C extends the TypeScript C++ subset transpiler with minimal `if` / `else` support and improves C++ to generated CASL source mapping.

This phase does not change CASL VM semantics, Mock/WASM CoreAdapter, C++ Core, or the WASM bridge.

## Supported Syntax

Supported forms:

```cpp
if (a == b) {
    c = 1;
}
```

```cpp
if (a == b) {
    c = 1;
} else {
    c = 0;
}
```

Supported comparison operators:

- `==`
- `!=`
- `<`
- `<=`
- `>`
- `>=`

Supported operands:

- identifier vs identifier
- identifier vs integer literal
- integer literal vs identifier
- integer literal vs integer literal

## Unsupported Forms

The transpiler still rejects:

- `while` / `for`
- `else if`
- complex boolean expressions
- `&&`
- `||`
- unary `!`
- function calls
- arrays, pointers, references, classes, structs, templates

Nested `if` statements are represented recursively by the AST and generator, but complex C++ scoping is not implemented.

## Lowering Table

All conditions load the left operand into `GR1`, compare against the right operand with `CPA`, then branch to the true label.

| C++ condition | CASL true branch |
| --- | --- |
| `a == b` | `JZE IF_TRUE_n` |
| `a != b` | `JNZ IF_TRUE_n` |
| `a < b` | `JMI IF_TRUE_n` |
| `a > b` | `JPL IF_TRUE_n` |
| `a <= b` | `JMI IF_TRUE_n`, `JZE IF_TRUE_n` |
| `a >= b` | `JPL IF_TRUE_n`, `JZE IF_TRUE_n` |

Example:

```cpp
if (a == b) {
    c = 1;
} else {
    c = 0;
}
```

Generates CASL shaped like:

```text
     LD    GR1,A
     CPA   GR1,B
     JZE   IF_TRUE_0
     LAD   GR1,0
     ST    GR1,C
     JUMP  IF_END_0
IF_TRUE_0 LAD   GR1,1
     ST    GR1,C
IF_END_0 LD    GR0,C
     RET
```

The exact position of `IF_END_n` depends on the following generated statement. Labels are attached to real CASL instructions because the current assembler does not support label-only rows.

## Literal Constant Lowering

The CASL assembler does not support immediate operands for `CPA`, so literal comparisons use generated constants.

```cpp
if (a == 10) {
    c = 1;
}
```

Generates:

```text
     LD    GR1,A
     CPA   GR1,CONST_10
     JZE   IF_TRUE_0
...
CONST_10 DC    10
```

Constant labels are unique and avoid variable label collisions.

## Generated Label Rules

The generator allocates labels from monotonic ids:

- `IF_TRUE_0`
- `IF_END_0`
- `IF_TRUE_1`
- `IF_END_1`

Labels are registered in the same used-label set as variable and constant labels to prevent collisions.

## Mapping Rules

`CppToCaslMap` includes `kind`:

```ts
type CppToCaslMap = {
  cppLine: number;
  caslLines: number[];
  reason: string;
  kind:
    | "declaration"
    | "assignment"
    | "return"
    | "if-condition"
    | "if-then"
    | "if-else"
    | "generated-label"
    | "constant";
};
```

Mapping behavior:

- if condition line maps to `LD`, `CPA`, and conditional jump rows.
- then body lines map to generated assignment / return rows.
- else body lines map to generated assignment / return rows.
- return lines map to `LD` or `LAD` plus `RET`.
- generated labels are marked as `generated-label`.
- generated constants are marked as `constant`.

## UI Highlighting

When source mode is `C++ subset`:

- The C++ editor highlights the C++ source line corresponding to the currently executing generated CASL row.
- The Generated CASL tab shows line numbers.
- The currently executing generated CASL row is highlighted strongly.
- All generated CASL rows mapped to the active C++ line are highlighted softly.
- SourceMapPanel remains CASL-based and continues to show the generated CASL SourceMap.

CASL mode behavior is unchanged.

## Current Limits

- No loops.
- No `else if`.
- No logical operators.
- No full C++ scope model.
- No source-level stepping or breakpoint model.
- Generated CASL is direct and not optimized.

## Next Phase

Next candidates:

1. Add `while` lowering with explicit loop labels.
2. Add richer C++ and generated CASL dual highlighting interactions.
3. Add source-level step controls after mapping is stable.
