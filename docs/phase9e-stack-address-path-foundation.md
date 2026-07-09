# Phase 9E: SP / Stack Address Path Foundation

Phase 9E does not add stack instructions. It prepares the visual and documentation foundation for later stack-related work.

The current project still does not implement `PUSH`, `POP`, `CALL`, stack-based `RET`, `SVC`, `IN`, or `OUT`. The VM, assembler, WASM bridge, mock core, Step, Run, and Reset semantics are unchanged.

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
- The preview stack guide is always inactive until real stack semantics exist.

`SP` is reserved for future stack operations. It is not part of the current fetch path.

## Stack Preview UI

Focus Mode includes a compact, read-only Stack Preview card.

It shows:

- current `SP`
- a small memory window from `SP - 2` through `SP + 4`
- a marker on the current `SP` row
- the note `Stack path preview only.`

The preview does not infer stack direction and does not render full memory.

## SP -> MAR -> Memory Path Rule

The circuit contains a faint preview guide:

```text
SP -> MAR -> Memory[SP]
```

This guide is rendered as inactive infrastructure. It is not an active signal path for current instructions.

Future stack instructions can reuse:

- `sp-to-mar-preview`
- `mar-to-stack-memory-preview`
- `sp.output`
- `mar.stackInput`
- `memory.spPreview`

## Why This Phase Does Not Implement PUSH / POP / CALL

This phase intentionally avoids execution semantics. Adding stack instructions requires assembler opcode support, VM state transitions, SP adjustment rules, memory ordering, Machine Code explanation updates, trace changes, and parity tests.

Those belong in a later instruction-semantics phase.

## Future PUSH Path

A future `PUSH` path should use:

```text
GR -> MDR
SP -> MAR
MDR -> Memory[SP]
SP adjustment
```

The exact pre-decrement or post-decrement rule must be defined with the instruction implementation.

## Future POP Path

A future `POP` path should use:

```text
SP -> MAR
Memory[SP] -> MDR -> GR
SP adjustment
```

The preview card can become the first place to observe top-of-stack movement.

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

- No stack instruction is implemented.
- No stack direction is assumed.
- The Stack Preview is read-only.
- The stack guide is inactive and does not represent current execution.
- `SP` remains constant in existing programs unless future instructions change it.
