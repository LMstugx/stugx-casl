# Phase 9F: PUSH / POP Stack Semantics

Phase 9F adds the first executable stack instructions to the teaching VM:

- `PUSH adr[,x]`
- `POP GRr`

This phase does not implement `CALL`, stack-based `RET`, `SVC`, `IN`, or `OUT`. Current `RET` semantics are unchanged.

## Supported Syntax

`PUSH` uses the address form:

```text
PUSH VALUE
PUSH VALUE,GR2
```

The optional index register follows the existing `adr,x` rule. `GR1` through `GR7` may be used as the index register. `GR0` is not a valid index register.

`POP` uses a register-only form:

```text
POP GR1
```

`POP` does not accept an address operand or an index register.

## Stack Direction

The teaching VM uses a pre-decrement push and post-increment pop:

```text
PUSH:
SP = SP - 1
Memory[SP] = effectiveAddress

POP:
GRr = Memory[SP]
SP = SP + 1
```

All SP movement wraps as a 16-bit value.

## PUSH Stores Effective Address

`PUSH adr[,x]` stores the effective address value itself. It does not read `Memory[effectiveAddress]`.

For example:

```text
     LAD   GR2,1
     PUSH  A,GR2
A    DC    10
B    DC    20
```

`PUSH A,GR2` stores the address of `B` when `GR2 = 1`. It does not store the value `20`.

## POP Reads Stack Value

`POP GRr` reads the current stack row:

```text
GRr = Memory[old SP]
SP = old SP + 1
```

The read address is the old SP value. The register write and SP update are both shown in Trace and Circuit Focus Mode.

## Machine Code

Opcodes:

| Mnemonic | Opcode | Format |
| --- | --- | --- |
| `PUSH` | `70` | instruction word plus operand word |
| `POP` | `71` | one-word register instruction |

For `PUSH adr,x`, the instruction word stores `x` and the operand word stores the base address. Runtime computes the effective address with the current index register value.

For `POP GRr`, the instruction word stores the target register in the `r` field and has no operand word.

## Circuit Path

`PUSH` uses the stack write path:

```text
effective address -> stack value
SP decrement -> MAR
MDR -> Memory[SP]
```

The active row in Memory is the new SP after decrement.

`POP` uses the stack read path:

```text
SP -> MAR
Memory[SP] -> MDR -> GRr
SP increment
```

The active row in Memory is the old SP before increment.

Neither instruction uses the ALU or updates FR.

## Stack Preview

Stack Preview shows:

- current `SP`
- nearby stack memory rows
- the written row after `PUSH`
- the read row after `POP`

It remains a read-only UI surface. It does not edit stack memory and does not assume `CALL` or stack-based `RET`.

## Why CALL / RET Are Not Implemented Here

`CALL` and stack-based `RET` require return-address ordering, PR update rules, interaction with current `RET` behavior, and additional visual paths. Keeping them out of Phase 9F lets `PUSH` / `POP` stabilize first without changing the existing program-finish semantics.

## Current Limitations

- No `CALL`.
- Current `RET` still finishes execution and does not pop from the stack.
- No `PUSH GRr` register-to-register form.
- No `SVC`, `IN`, or `OUT`.
- C++ subset code does not generate `PUSH` or `POP`.

## Future Work

- Add `CALL` with return-address push.
- Add a separate stack-aware return path without breaking current `RET` tests.
- Expand Stack Preview for call frames if subroutine support is added.
