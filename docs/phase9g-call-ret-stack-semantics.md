# Phase 9G: CALL and Stack-Aware RET Semantics

Phase 9G adds the first subroutine-control instruction to the teaching VM:

- `CALL adr[,x]`
- stack-aware `RET`

The important compatibility rule is that a top-level `RET` still finishes the program. Existing CASL and C++ subset demos keep working because only `RET` executed while `callDepth > 0` performs a stack return.

## CALL Syntax

Supported form:

```casl
CALL SUB
CALL SUB,GR2
```

`CALL` accepts the same `adr[,x]` addressing foundation as memory and jump instructions. `GR1` to `GR7` can be used as index registers; `GR0` is not an index register.

## CALL Return Address Rule

`CALL` is a two-word instruction. The return address is therefore:

```text
returnAddress = current CALL address + 2
```

Execution:

```text
target = adr + GRx
SP = SP - 1
Memory[SP] = returnAddress
PR = target
callDepth = callDepth + 1
```

`CALL` stores the return address, not the target address and not memory data.

## Stack-Aware RET Compatibility Rule

`RET` has two runtime meanings:

```text
if callDepth > 0:
    returnAddress = Memory[SP]
    PR = returnAddress
    SP = SP + 1
    callDepth = callDepth - 1
else:
    finish program
```

Manual `PUSH` / `POP` does not change `callDepth`. If a program changes `SP` manually while inside a call frame, stack-aware `RET` still reads the return address from the current `SP` because `callDepth` only decides whether `RET` should return or finish.

## Machine Code

Opcode table:

| Instruction | Opcode | Words |
| --- | --- | --- |
| `CALL adr[,x]` | `80` | 2 |
| `RET` | `81` | 1 |

For `CALL`, word 0 contains opcode `80` and the x field. Word 1 contains the base address. The Machine Code explanation shows base address, index register/value, effective target address, return address, and stack write address when runtime state is available.

## Circuit Visualization

`CALL` shows two related flows:

1. Return address path:
   `PR + 2 -> MDR -> Memory[SP]`
2. Target path:
   `EAU -> PR`

The stack write row is highlighted, `SP` is active, and the Effective Address Unit provides the target address.

Stack-aware `RET` shows:

```text
SP -> MAR -> Memory[SP] -> MDR -> PR
SP increments
```

Top-level `RET` keeps the finish path and does not activate `SP` or Memory.

## Stack Preview and Signal Probe

Stack Preview marks the written return-address row on `CALL` and the read return-address row on stack `RET`.

Signal Probe stays compact and adds:

- return address
- target address where relevant
- `SP` before / after
- stack memory row
- `callDepth`

## Phase 9H Teaching Layer

Phase 9H keeps the same execution semantics and adds clearer subroutine teaching views:

- a compact Call Stack card for `callDepth`, top return address, stored stack row, and `RET` mode
- explicit return-edge text such as `CALL -> SUB; return 0024` and `RET -> 0024 from MEM[FFFD]`
- Machine Code explanation fields for return address, stack address, and call-depth transition
- Trace wording that distinguishes stack `RET` from top-level finish
- `CASL: Nested Call Return` for last-in-first-out return order

## Current Limitations

- No `SVC`, `IN`, or `OUT`.
- Phase 10A adds no-argument C++ function-call lowering on top of this `CALL` / `RET` model.
- No call-frame locals, arguments, recursion, or parameter passing.
- Return-edge explanation is runtime-oriented and compact; there is still no full static call graph.

## Future Work

- Optional call-depth timeline for deeper subroutine lessons.
- C++ parameter and stack-frame lowering.
- More detailed static call graph visualization in Control Flow.
