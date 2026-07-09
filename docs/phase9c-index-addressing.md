# Phase 9C: Index Addressing Foundation

Phase 9C adds the first CASL II index-addressing support to the teaching pipeline.

## Supported Syntax

The assembler accepts `adr,x` operands for register/address and jump-style instructions:

```casl
     LD    GR1,A,GR2
     ST    GR1,A,GR2
     ADDA  GR1,A,GR2
     LAD   GR1,A,GR2
     SLL   GR1,1,GR2
     JUMP  LABEL,GR2
```

`GR1` through `GR7` are valid index registers. `GR0` is rejected as an index register because COMET II uses x-field value `0` to mean "no index register".

`DC`, `DS`, `START`, and `END` do not support index operands.

## Machine Word Encoding

The instruction word already has opcode, register, and index fields:

```text
high byte: opcode
low nibble high: r field
low nibble low: x field
```

Example:

```casl
     LD    GR1,A,GR2
```

The instruction word is `1012`:

- opcode `10` = `LD`
- r = `1` = `GR1`
- x = `2` = `GR2`

The operand word still stores the base address of `A`.

## Effective Address

At runtime:

```text
effective address = (base address + GRx) & 0xFFFF
```

When no index register is present, x = 0 and the effective address is just the base address.

Address wrap is explicitly 16-bit in both the TypeScript mock core and the C++ core.

## VM Semantics

- `LD`: reads `Memory[effective]`.
- `ST`: writes `Memory[effective]`.
- `ADDA`, `SUBA`, `ADDL`, `SUBL`: read `Memory[effective]`.
- `AND`, `OR`, `XOR`: read `Memory[effective]`.
- `CPA`, `CPL`: compare with `Memory[effective]`.
- `LAD`: writes the effective address value to the target GR and does not read memory.
- `SLA`, `SRA`, `SLL`, `SRL`: use the effective address as the shift count and do not read memory data.
- `JUMP`, `JZE`, `JNZ`, `JPL`, `JMI`, `JOV`: jump to the effective address when taken.

Trace and UI state expose base address, index register, index value, and effective address.

## Circuit Visualization

Circuit Focus Mode keeps the same layout. For indexed instructions it adds:

- an `IDX` badge on the index GR row
- an Effective Address Unit in the address layer
- an address route from base operand and index GR to EAU, then from EAU to MAR / Memory row
- Memory row highlighting at the effective address, not the base address

For `LAD` and shift instructions, the circuit does not show a fake memory data read. For memory instructions, the Memory row corresponds to the effective address.

## Demo

`CASL: Index Addressing` demonstrates:

```casl
     LAD   GR2,1
     LD    GR1,A,GR2
```

`A + GR2` resolves to `B`, so `LD` reads `B` and `GR1` becomes `0014`.

## Current Limitations

- The C++ subset does not generate index addressing yet.
- Register-to-register instruction forms are still not implemented.
- Stack instructions, `CALL`, `PUSH`, `POP`, `SVC`, `IN`, and `OUT` are still out of scope.
- No full macro assembler is implemented.

## Future Work

Index addressing is the base for later study topics:

- C++ subset arrays
- pointer-like addressing lessons
- stack / `CALL` / `PUSH` / `POP`
- richer EAU animation and stack-related address paths
