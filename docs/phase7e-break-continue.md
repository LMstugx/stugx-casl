# Phase 7E Break / Continue Lowering

Phase 7E adds minimal `break` and `continue` support to the TypeScript C++ subset transpiler. Both statements lower to existing CASL `JUMP` instructions. This phase does not add CASL instructions, change COMET VM behavior, change the WASM bridge, or alter machine-code encoding.

## Supported Scope

Supported:

- `break;` inside `while` bodies.
- `continue;` inside `while` bodies.
- `break;` inside `for` bodies.
- `continue;` inside `for` bodies.
- `break;` / `continue;` inside `if` or `else` blocks when the enclosing statement is inside a loop.
- Nested loops, where the statement targets the nearest enclosing loop.

Unsupported:

- `break;` outside a loop.
- `continue;` outside a loop.
- `switch`, `do while`, arrays, pointers, function calls, and complex boolean expressions.

Loop-outside diagnostics are explicit:

```text
break is only supported inside a loop
continue is only supported inside a loop
```

## While Lowering

For a `while` loop, the existing loop shape remains:

```text
LOOP_BEGIN_n
condition
false -> LOOP_END_n
LOOP_BODY_n
body
JUMP LOOP_BEGIN_n
LOOP_END_n
```

Targets:

- `break` -> `JUMP LOOP_END_n`
- `continue` -> `JUMP LOOP_BEGIN_n`

This means `continue` immediately re-evaluates the while condition.

## For Lowering

For loops now include a continue label before the increment code:

```text
initializer
FOR_BEGIN_n
condition
false -> FOR_END_n
FOR_BODY_n
body
FOR_CONTINUE_n
increment
JUMP FOR_BEGIN_n
FOR_END_n
```

Targets:

- `break` -> `JUMP FOR_END_n`
- `continue` -> `JUMP FOR_CONTINUE_n`

`continue` must jump to `FOR_CONTINUE_n`, not directly to `FOR_BEGIN_n`, because a C/C++ `for` loop executes the increment expression before checking the condition again.

## Loop Context Stack

The CASL generator keeps a loop-context stack while lowering statements:

```text
LoopContext {
  kind: "while" | "for"
  breakTarget: string
  continueTarget: string
}
```

Entering a loop pushes a context, and leaving the loop pops it. `break` and `continue` always use the top context, so nested loops target the nearest enclosing loop.

## Mapping Rules

New mapping kinds:

- `break-statement`
- `continue-statement`
- `loop-continue-label`

Generated CASL rows for `break` and `continue` point back to the original C++ source line. `FOR_CONTINUE_n` is marked as generated metadata. Machine Code rows inherit the same C++ line mapping, so generated `JUMP` instructions can still be explained and traced.

## Machine Code View

`break` and `continue` are visible in Machine Code as normal `JUMP` instructions:

```text
JUMP FOR_CONTINUE_0
JUMP FOR_END_0
```

The Phase 7B explanation panel continues to decode the `JUMP` opcode, operand address, resolved label, and human-readable target meaning.

Phase 7F adds UI control-flow hints for these jumps:

- Generated CASL rows show jump target label, CASL line, and machine address.
- Machine Code explanations show edge kind such as `break` or `continue`.
- Trace rows show target text during runtime execution.

## Current Limits

- No `break` values or labelled breaks.
- No `continue` labels.
- No `switch`.
- No full C++ block scope model.
- No `do while`, arrays, pointers, or function calls.

## Next Steps

- Keep `break` / `continue` stable across Generated CASL, Machine Code, Trace, and WASM parity.
- Consider a compact control-flow view after more branch and loop features are added.
