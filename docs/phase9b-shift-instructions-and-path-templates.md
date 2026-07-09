# Phase 9B: Shift Instructions and Path Templates

Phase 9B adds the CASL II shift instruction family and the first reusable path-template layer for more complex circuit visualization. It does not change the C++ subset, index addressing, stack behavior, or existing instruction semantics.

## Added Shift Instructions

This batch adds address-form shift instructions:

- `SLA GRr,addr`
- `SRA GRr,addr`
- `SLL GRr,addr`
- `SRL GRr,addr`

Only the address form is supported. Register-to-register shift counts and index addressing are still not supported.

## Shift Semantics

The operand word is treated as the shift count / effective address value. It is not a memory data read.

```casl
SLL   GR1,1
```

means:

```text
GR1 = logical-left-shift(GR1, 1)
```

It does not mean:

```text
GR1 = logical-left-shift(GR1, memory[0001])
```

Instruction behavior:

| Mnemonic | Meaning |
| --- | --- |
| `SLA` | arithmetic left shift, preserving the sign bit lane |
| `SRA` | arithmetic right shift, preserving the sign bit |
| `SLL` | logical left shift with zero fill |
| `SRL` | logical right shift with zero fill |

The result is written back to the target GR register.

## FR / OF Behavior

The current teaching VM uses `ZF`, `CF`, `SF`, and `OF`.

- `ZF` is set when the shifted result is `0000`.
- `SF` is set when bit 15 of the result is set.
- `OF` is set from the last bit shifted out when the count makes that bit well-defined.
- `CF` remains clear for shift instructions in this simplified model.

This keeps TS mock core, C++ core, and WASM behavior stable and consistent. It is a documented teaching model rather than a full hardware compatibility claim.

## Shift Count Behavior

The shift count is interpreted as a 16-bit value. Large counts are handled explicitly so JavaScript and C++ do not diverge:

- `SLL` / `SRL` with count `>= 16` produce `0000`.
- `SRA` with count `>= 16` produces `FFFF` for negative inputs and `0000` for non-negative inputs.
- `SLA` preserves the sign bit and clears the shifted low 15-bit field for count `>= 15`.
- Count `0` leaves the value unchanged and updates flags from the unchanged result with `OF = 0`.

## Machine Code Opcodes

| Mnemonic | Opcode | Length |
| --- | ---: | ---: |
| `SLA` | `50` | 2 words |
| `SRA` | `51` | 2 words |
| `SLL` | `52` | 2 words |
| `SRL` | `53` | 2 words |

For address-form instructions, word 0 stores opcode/register/index fields and word 1 stores the resolved shift count / effective address.

## Machine Code Explanation

The Machine Code tab explains shift rows as:

- opcode field
- register field
- index field as `0` / none
- operand word
- shift count / effective address
- readable meaning

For example:

```text
SLL GR1,1
```

is explained as a logical left shift of `GR1` by one bit. The operand word is described as the shift count / effective address, not as a memory data fetch.

## Circuit Path Template

Phase 9B introduces an `InstructionPathTemplate` layer for visual path categories.

Templates describe:

- instruction category
- pipeline stages
- active modules
- active anchors
- route segment ids
- whether the instruction uses ALU, MDR, Memory, FR, or control path

The shift template uses:

```text
GRr -> ALU/Shifter input
shift count / effective address -> ALU/Shifter count input
ALU/Shifter output -> GRr
ALU/Shifter flag output -> FR
```

It intentionally does not use Memory as data input.

## Why Shift Count Is Not Memory Data

CASL address-form syntax reuses the operand word field. For this first shift implementation, the operand word is the shift count / effective address value. Showing `Memory[addr] -> MDR` for shift instructions would make the circuit teach the wrong model, so Circuit Focus Mode uses a direct count input into the ALU/Shifter path.

## Demo Example

New demo:

- `CASL: Shift Operations`

It steps through `SLL`, `SRL`, `SLA`, and `SRA`, then stores the result.

Study checkpoints:

- Generated CASL contains all four shift mnemonics.
- Machine Code contains opcodes `50`, `51`, `52`, and `53`.
- Circuit Focus Mode shows a shifter/ALU path.
- Memory is not highlighted as the data source for the shift count.

## Current Limitations

- No index addressing.
- No register-to-register shift count.
- No stack / `CALL` / `PUSH` / `POP`.
- No micro-cycle simulation for shift internals.
- C++ subset does not generate shift instructions.
- The path-template layer is used for visualization structure, not for VM semantics.

## Future Direction

The path-template layer is preparation for:

- index-addressing path templates
- stack path templates
- `CALL`, `PUSH`, and `POP` visualization
- signal evolution graph
- configurable circuit display
- future custom circuit routing experiments
