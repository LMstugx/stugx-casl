# Phase 5D While Lowering

Phase 5D adds minimal `while` support to the TypeScript C++ subset transpiler. It does not change CASL VM semantics, C++ Core behavior, CoreAdapter, or the WASM bridge. Generated CASL still flows through the same Mock or WASM backend.

## Supported While Syntax

Supported form:

```cpp
while (condition) {
    statements
}
```

The condition uses the same comparison subset as Phase 5C:

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

- `for`
- `do while`
- `break`
- `continue`
- `else if`
- `&&`
- `||`
- unary `!`
- function calls
- arrays, pointers, references, classes, structs, templates
- full C++ block scope rules

## Lowering Template

Example:

```cpp
int main() {
    int i = 3;
    int sum = 0;
    while (i > 0) {
        sum = sum + i;
        i = i - 1;
    }
    return sum;
}
```

Generates CASL shaped like:

```text
MAIN START
LOOP_BEGIN_0 LD    GR1,I
     CPA   GR1,CONST_0
     JPL   LOOP_BODY_0
     JUMP  LOOP_END_0
LOOP_BODY_0 LD    GR1,SUM
     ADDA  GR1,I
     ST    GR1,SUM
     LD    GR1,I
     SUBA  GR1,CONST_1
     ST    GR1,I
     JUMP  LOOP_BEGIN_0
LOOP_END_0 LD    GR0,SUM
     RET
I DC    3
SUM DC    0
CONST_0 DC    0
CONST_1 DC    1
     END
```

Labels are attached to executable rows because the current CASL assembler does not support label-only rows.

## Shared Condition Helper

`if` and `while` now share the same condition lowering helper:

```text
emitConditionJump(condition, trueLabel, falseLabel)
```

The helper emits:

1. load left operand into `GR1`
2. compare with `CPA`
3. one or more conditional jumps to the true label
4. an unconditional `JUMP` to the false label

The true-jump table remains:

| C++ condition | CASL true branch |
| --- | --- |
| `a == b` | `JZE trueLabel` |
| `a != b` | `JNZ trueLabel` |
| `a < b` | `JMI trueLabel` |
| `a > b` | `JPL trueLabel` |
| `a <= b` | `JMI trueLabel`, `JZE trueLabel` |
| `a >= b` | `JPL trueLabel`, `JZE trueLabel` |

## Label Rules

Each loop uses monotonic unique labels:

- `LOOP_BEGIN_n`
- `LOOP_BODY_n`
- `LOOP_END_n`

The same used-label set also contains variable labels, constants, `MAIN`, and if labels, so generated labels avoid collisions.

## Literal Constant Lowering

`CPA` does not take immediate operands in the current CASL subset. Literal comparisons and literal arithmetic operands are lowered to generated constants:

```cpp
while (i > 0) {
    i = i - 1;
}
```

uses:

```text
     CPA   GR1,CONST_0
...
     SUBA  GR1,CONST_1
...
CONST_0 DC    0
CONST_1 DC    1
```

## Mapping Rules

`CppToCaslMap.kind` adds:

- `while-condition`
- `while-body`
- `loop-label`
- `loop-back-jump`

Mapping behavior:

- the `while` condition line maps to `LD`, `CPA`, conditional jump rows, and the false `JUMP`
- loop labels are marked as `loop-label`
- statements inside the loop body are marked as `while-body` unless nested if branches provide a more specific branch kind
- `JUMP LOOP_BEGIN_n` is marked as `loop-back-jump`
- generated constants remain marked as `constant`

The Generated CASL panel uses these mappings to keep the current CASL row and corresponding C++ row highlighted during loop execution.

## Runtime Safety

Loops can be infinite if the user writes a non-progressing condition. Tests run loops with step limits. The VM `run(maxSteps)` path remains the guard for future run-button support.

## Current Limits

- no `for`
- no `do while`
- no `break` / `continue`
- no complex boolean expressions
- no source-level loop controls
- no register allocation optimization
- no full C++ scope model

## Next Phase

Likely follow-ups:

1. Add `for` only after loop mapping remains stable.
2. Add `break` / `continue` with explicit labels and mapping kinds.
3. Improve source-level stepping once C++ to CASL mapping is stable enough.
