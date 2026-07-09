# Phase 9E: SP / Stack Address Path Foundation

Phase 9E did not add stack instructions. It prepared the visual and documentation foundation for later stack-related work.

At the time of Phase 9E, the project did not implement `PUSH`, `POP`, `CALL`, stack-based `RET`, `SVC`, `IN`, or `OUT`. Later Phase 9F adds `PUSH` / `POP`; `CALL` and stack-based `RET` remain out of scope.

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

## Future CALL Return-Address Path

A future `CALL` path will likely need:

```text
PR next -> Memory[SP]
target address -> PR
SP adjustment
```

This should be visualized as control/address flow, not as ALU data computation unless an explicit SP arithmetic stage is added.

## Future RET Stack Path

Current `RET` semantics are unchanged and simply finish execution.

A later stack-aware return path could use:

```text
SP -> MAR
Memory[SP] -> PR
SP adjustment
```

That future behavior should use a separate template such as `RET_STACK`, so current `RET` tests remain stable.

## Current Limitations

- In Phase 9E itself, no stack instruction was implemented.
- This document is a historical foundation note. Phase 9F implements `PUSH` / `POP`.
- `CALL` and stack-based `RET` remain future work.
- Current `RET` semantics are unchanged.
