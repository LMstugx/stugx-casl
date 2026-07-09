# Phase 9E: SP / Stack Address Path Foundation

Phase 9E did not add stack instructions. It prepared the visual and documentation foundation for later stack-related work.

At the time of Phase 9E, the project did not implement `PUSH`, `POP`, `CALL`, stack-based `RET`, `SVC`, `IN`, or `OUT`. Later Phase 9F adds `PUSH` / `POP`; Phase 9G adds `CALL` and stack-aware `RET` while preserving top-level `RET` finish behavior.

## Why Stack Path Foundation Is Needed

COMET II stack operations will eventually need a clear address path:

```text
SP -> MAR -> Memory[SP]
```

Before implementing stack instructions, the UI should make `SP` understandable as an independent address-source register. This avoids visual ambiguity where `SP` could look like part of the ordinary `PR -> MAR` fetch path.

## SP As An Independent Address Register

In Circuit Focus Mode:

- `SP` remains in the top control/address layer.
- `SP` has stable output and adjust anchors.
- Ordinary `LD`, `ST`, arithmetic, logic, compare, shift, and jump instructions do not activate `SP`.
- The preview stack guide stays inactive for ordinary instructions. Later `PUSH` / `POP` semantics may activate the stack route explicitly.

`SP` is reserved for future stack operations. It is not part of the current fetch path.

## Stack Preview UI

Focus Mode includes a compact Stack Preview card.

It shows:

- current `SP`
- a small memory window from `SP - 2` through `SP + 4`
- a marker on the current `SP` row
- a preview note when no stack instruction is involved
- read/write markers once a real stack instruction updates stack memory

The preview does not infer stack direction and does not render full memory.

## SP -> MAR -> Memory Path Rule

The circuit contains a faint preview guide:

```text
SP -> MAR -> Memory[SP]
```

This guide is rendered as inactive infrastructure for non-stack instructions. It becomes an active route only for later stack instructions that explicitly use `SP`.

Future stack instructions can reuse:

- `sp-to-mar-preview`
- `mar-to-stack-memory-preview`
- `sp.output`
- `mar.stackInput`
- `memory.spPreview`

## Why Phase 9E Did Not Implement PUSH / POP / CALL

Phase 9E intentionally avoided execution semantics. Adding stack instructions requires assembler opcode support, VM state transitions, SP adjustment rules, memory ordering, Machine Code explanation updates, trace changes, and parity tests.

Those belong in a later instruction-semantics phase.

## Later PUSH Path

Phase 9F turns this into an active path for `PUSH`:

```text
effective address -> stack value
SP -> MAR
Memory[SP] write
SP pre-decrement
```

The Phase 9F teaching rule is pre-decrement: `SP = SP - 1`, then `Memory[SP] = effectiveAddress`.

## Later POP Path

Phase 9F turns this into an active path for `POP`:

```text
SP -> MAR
Memory[SP] -> MDR -> GR
SP post-increment
```

The preview card becomes the first place to observe top-of-stack movement.

## Later CALL Return-Address Path

Phase 9G turns this into an active `CALL` path:

```text
PR next -> Memory[SP]
target address -> PR
SP adjustment
```

It is visualized as control/address flow, not as ALU data computation.

## Later RET Stack Path

Top-level `RET` still finishes execution when no call frame exists.

Phase 9G adds a stack-aware return path when `callDepth > 0`:

```text
SP -> MAR
Memory[SP] -> PR
SP adjustment
```

That behavior uses a separate runtime path, so existing top-level `RET` tests remain stable.

## Current Limitations

- In Phase 9E itself, no stack instruction was implemented.
- This document is a historical foundation note. Phase 9F implements `PUSH` / `POP`.
- Phase 9G implements `CALL` and stack-aware `RET`.
- Top-level `RET` finish semantics remain compatible.
