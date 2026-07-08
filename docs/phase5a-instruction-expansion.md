# Phase 5A Instruction Expansion

Phase 5A expands the clean-room stugx.CASL core from the Phase 1 arithmetic demo into a minimal practical CASL II subset for later C++ subset translation. This is not a full CASL II implementation.

## Added Instructions

Phase 5A adds:

- `LAD`
- `SUBA`
- `CPA`
- `JUMP`
- `JZE`
- `JNZ`
- `JPL`
- `JMI`

Existing supported instructions remain:

- `START`
- `END`
- `DC`
- `DS`
- `LD`
- `ADDA`
- `ST`
- `RET`

## Machine Encoding

The TypeScript mock, C++ core, `core_dump`, and WASM backend use the same encodings:

| Instruction | Encoding |
| --- | --- |
| `LD GRn,addr` | `0x1000 | (n << 4)`, followed by address |
| `ST GRn,addr` | `0x1100 | (n << 4)`, followed by address |
| `LAD GRn,addr` | `0x1200 | (n << 4)`, followed by address |
| `ADDA GRn,addr` | `0x2000 | (n << 4)`, followed by address |
| `SUBA GRn,addr` | `0x2100 | (n << 4)`, followed by address |
| `CPA GRn,addr` | `0x4000 | (n << 4)`, followed by address |
| `JMI addr` | `0x6100`, followed by address |
| `JNZ addr` | `0x6200`, followed by address |
| `JZE addr` | `0x6300`, followed by address |
| `JUMP addr` | `0x6400`, followed by address |
| `JPL addr` | `0x6500`, followed by address |
| `RET` | `0x8100` |

## Execution Semantics

`LAD GRx,addr`

- Writes the resolved effective address into `GRx`.
- Advances `PR` by 2.
- Does not read memory.
- Does not update FR in Phase 5A.

`SUBA GRx,addr`

- Reads `Memory[addr]` into `MDR`.
- Computes `GRx - MDR`.
- Writes the 16-bit result to `GRx`.
- Advances `PR` by 2.
- Updates FR.

`CPA GRx,addr`

- Reads `Memory[addr]` into `MDR`.
- Compares signed `GRx` with signed `MDR`.
- Does not modify `GRx`.
- Advances `PR` by 2.
- Updates FR.

`JUMP addr`

- Sets `PR` to the resolved address.

Conditional jumps:

- `JZE addr`: jump when ZF is true.
- `JNZ addr`: jump when ZF is false.
- `JPL addr`: jump when SF and ZF are both false.
- `JMI addr`: jump when SF is true.
- If the condition is false, `PR` advances by 2.

`RET` keeps the existing Phase 1 behavior: set run state to `Finished` and do not jump to an arbitrary address.

## FR Rules

`ADDA` and `SUBA` update:

- `ZF`: true when the 16-bit result is zero.
- `SF`: true when bit 15 of the 16-bit result is set.
- `CF`: true when the unsigned arithmetic result is outside `0x0000..0xFFFF`.
- `OF`: true when signed 16-bit addition/subtraction overflows.

`CPA` updates:

- `ZF`: true when signed `GRx` equals signed `Memory[addr]`.
- `SF`: true when signed `GRx` is less than signed `Memory[addr]`.
- `CF`: false.
- `OF`: false.

`LAD`, `ST`, jumps, and `RET` do not update FR in the current contract.

## VisualPathKind Mapping

Phase 5A adds these visual paths:

| Instruction | VisualPathKind |
| --- | --- |
| `LAD` | `LAD_AddressToGr` |
| `SUBA` | `SUBA_GrMdrToAluToGr` |
| `CPA` | `CPA_GrMdrToAluToFr` |
| `JUMP` | `Jump_AddressToPr` |
| conditional jump taken | `ConditionalJump_AddressToPr` |
| conditional jump not taken | `ConditionalJump_NotTaken` |

Existing `LD`, `ADDA`, `ST`, and `RET` visual paths are unchanged.

## Golden Fixtures

New golden fixtures live in `tests/golden/`:

- `lada.step1.json`
- `suba.step1.json`
- `cpa.equal.json`
- `jump.taken.json`
- `jze.taken.json`
- `jze.not-taken.json`
- `jmi.taken.json`

They are checked by:

- TypeScript mock golden parity tests.
- C++ `core_dump` golden parity tests.
- WASM adapter parity tests when `public/wasm/stugx_casl_core.js` and `.wasm` exist.

## Still Unsupported

The project still does not support the full CASL II instruction set. Unsupported instructions include:

- `ADDL`
- `SUBL`
- `AND`
- `OR`
- `XOR`
- `CPL`
- `PUSH`
- `POP`
- `CALL`
- `SVC`

These should produce diagnostics until explicitly added in a later phase.

## Why This Subset

The added instructions cover the minimum control-flow and arithmetic building blocks needed for a later C++ subset translator:

- `LAD` supports loading constants and addresses.
- `SUBA` supports subtraction.
- `CPA` plus conditional jumps supports `if` and `while`.
- `JUMP` supports unconditional branch lowering.

Phase 5A deliberately avoids broader CASL II coverage so Mock, C++ Core, WASM, golden fixtures, and browser E2E can remain aligned.
