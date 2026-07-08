# Phase 7F Control Flow Visualization

Phase 7F adds a UI-derived control-flow layer for the generated CASL and COMET machine-code views. It does not add C++ syntax, CASL instructions, VM behavior, WASM behavior, or machine-code encoding.

## Why This Exists

After `if`, `while`, `for`, `break`, and `continue` lowering, students need to see more than raw labels:

```text
C++ control flow
-> Generated CASL labels and jumps
-> Machine Code addresses
-> Runtime PR movement
```

The first version uses compact badges and target text rather than a full graph drawing. This keeps the UI stable while making jump relationships visible.

## Derived Control-Flow Data

`src/core/controlFlowGraph.ts` derives control-flow labels and edges from existing UI data:

- Generated CASL rows.
- C++ to CASL mapping.
- Machine Code rows.
- Optional current `CometState`.

It does not change the Core DTO contract.

Derived label kinds:

- `if-label`
- `loop-label`
- `for-label`
- `continue-label`
- `end-label`
- `user-label`

Derived edge kinds:

- `unconditional-jump`
- `conditional-true`
- `conditional-false`
- `fallthrough`
- `loop-back`
- `break`
- `continue`

Unresolved labels are kept as safe unresolved edges instead of throwing.

## Generated CASL View

The `Generated CASL II Assembly` table now shows:

- Label badges such as `IF`, `LOOP`, `FOR`, `CONTINUE`, `END`, and `USER`.
- Jump target information.
- Target CASL line and machine address when available.
- Special mapping for `break` and `continue` jumps.

Example:

```text
JUMP FOR_CONTINUE_0
continue -> FOR_CONTINUE_0 / line 24 / addr 0048
```

## Machine Code View

The Machine Code table now marks jump rows with control-flow target text. The selected word explanation panel includes:

- Control-flow target.
- Edge kind.
- Human-readable control-flow meaning.

Example:

```text
Control Flow Target: FOR_END_0 / line 26 / addr 0050
Edge Kind: break
Meaning: Break statement jumps to loop exit.
```

The machine-code word and opcode explanation still come from the existing Phase 7B metadata.

## Learning Flow

The center Learning Flow adds a compact `Control Flow` card:

- Shows the current jump source when the current instruction is a jump.
- Shows target label, CASL line, and address.
- Shows `Sequential execution` for non-jump instructions.

This card is intentionally small so it does not compete with the circuit view.

## Trace

Trace rows for jump instructions now include target text:

- `continue -> FOR_CONTINUE_0`
- `break / loop exit -> FOR_END_0`
- `loop back -> FOR_BEGIN_0`
- conditional target labels for `JZE`, `JNZ`, `JPL`, and `JMI`

Trace remains capped at 1000 rows.

## Current Limitations

- This is not a full graph layout.
- Conditional true and false edges are shown as text, not drawn arcs.
- `break` and `continue` are inferred from generated CASL mapping in the output views. Trace uses source text and target labels, so loop-exit jumps are described as `break / loop exit`.
- Full CFG visualization can be added later if the text view becomes insufficient.

## Next Steps

- Consider an optional compact CFG graph for Generated CASL.
- Consider highlighting both current jump and target machine-code row during Step.
- Consider grouping generated labels into collapsible control-flow regions.
