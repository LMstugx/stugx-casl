# Phase 9A: CASL II Instruction Coverage Batch 1

Phase 9A expands the CASL II teaching subset without changing the C++ subset, VM architecture, WASM bridge contract, or UI layout.

## Added Instructions

This batch adds:

- `NOP`
- `ADDL GRr,addr`
- `SUBL GRr,addr`
- `AND GRr,addr`
- `OR GRr,addr`
- `XOR GRr,addr`
- `CPL GRr,addr`
- `JOV label`

The existing subset still includes:

- `LAD`, `LD`, `ST`
- `ADDA`, `SUBA`, `CPA`
- `JUMP`, `JZE`, `JNZ`, `JPL`, `JMI`
- `RET`
- `START`, `END`, `DC`, `DS`

## Supported Forms

Only the address form is supported in this batch:

```casl
ADDL GR1,VALUE
AND  GR1,MASK
CPL  GR1,LIMIT
JOV  OVER
```

Register-to-register form, index addressing, stack instructions, `CALL`, `SVC`, `IN`, and `OUT` are intentionally not part of this phase.

## Opcode Table

| Mnemonic | Opcode | Length | Notes |
| --- | ---: | ---: | --- |
| `NOP` | `00` | 1 word | no operation |
| `LD` | `10` | 2 words | existing |
| `ST` | `11` | 2 words | existing |
| `LAD` | `12` | 2 words | existing |
| `ADDA` | `20` | 2 words | existing signed arithmetic |
| `SUBA` | `21` | 2 words | existing signed arithmetic |
| `ADDL` | `22` | 2 words | unsigned add |
| `SUBL` | `23` | 2 words | unsigned subtract |
| `AND` | `30` | 2 words | bitwise AND |
| `OR` | `31` | 2 words | bitwise OR |
| `XOR` | `32` | 2 words | bitwise XOR |
| `CPA` | `40` | 2 words | existing signed compare |
| `CPL` | `41` | 2 words | unsigned compare |
| `JMI` | `61` | 2 words | existing |
| `JNZ` | `62` | 2 words | existing |
| `JZE` | `63` | 2 words | existing |
| `JUMP` | `64` | 2 words | existing |
| `JPL` | `65` | 2 words | existing |
| `JOV` | `66` | 2 words | jump when OF is set |
| `RET` | `81` | 1 word | finish in this learning VM |

For address-form instructions, word 0 stores opcode/register/index fields and word 1 stores the resolved address.

## FR and Overflow Notes

The current FR model has `ZF`, `CF`, `SF`, and `OF`.

- `ADDL` performs unsigned 16-bit addition. The result wraps to 16 bits. Carry out of bit 15 sets both `CF` and `OF` in this teaching VM so `JOV` can demonstrate the overflow/carry path.
- `SUBL` performs unsigned 16-bit subtraction. Borrow sets both `CF` and `OF`.
- `AND`, `OR`, and `XOR` update `ZF` and `SF`, and clear `CF` / `OF`.
- `CPL` compares operands as unsigned 16-bit values. It updates `ZF` and `SF`; it does not write a GR register.
- `NOP` does not change FR.

This is documented as a simplified learning model. A later phase can refine exact COMET II flag compatibility if needed.

## Visual Path Reuse

Phase 9A does not redraw the circuit.

- `ADDL` reuses the `ADDA` ALU path.
- `SUBL` reuses the `SUBA` ALU path.
- `AND`, `OR`, and `XOR` reuse the ALU data path.
- `CPL` reuses the compare-to-FR path.
- `JOV` reuses the conditional jump path.
- `NOP` uses no active data path.

Trace and Machine Code explanation still show the actual mnemonic.

## Demo Examples

New examples:

- `CASL: Logic Operations`
  - shows `AND`, `OR`, `XOR`
  - expected final result: `GR1 = 0002`, `RESULT = 0002`

- `CASL: Logical Add Compare`
  - shows `ADDL`, `CPL`, `JOV`
  - expected final result: `RESULT = 0003`

Both examples have Guided Lesson metadata and Study Mode checkpoints.

## Current Limits

- No index addressing.
- No register-to-register form.
- No `CALL`, `PUSH`, `POP`, or `SVC`.
- No `IN` / `OUT` macro support.
- No shift instructions yet.
- C++ subset generation is unchanged and does not emit the new instructions.

## Phase 9B Candidates

Possible next coverage batch:

- shift instructions
- register-to-register form
- index addressing
- stack instructions
- `CALL` / subroutine behavior
- I/O macros after lifecycle and memory semantics are documented
