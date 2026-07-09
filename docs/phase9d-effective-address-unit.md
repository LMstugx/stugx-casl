# Phase 9D: Effective Address Unit Visualization

Phase 9D keeps the Phase 9C index-addressing semantics unchanged and improves how the circuit explains them. The goal is to make `adr,x` visible as an address calculation:

```text
base address + index register value = effective address
```

The COMET II execution result is unchanged. This phase only changes the Circuit Focus Mode, Signal Probe, screenshots, lessons, and documentation.

## Why The EAU Is Needed

With index addressing, an instruction such as:

```casl
     LD    GR1,A,GR2
```

does not read `A` directly. The operand word stores the base address of `A`, then the VM adds `GR2` at runtime. The memory access uses the effective address.

The Effective Address Unit, or EAU, makes this runtime calculation explicit:

```text
BASE 0027 + GR2(0001) = EA 0028
```

This helps separate address computation from ALU data computation. The EAU belongs to the address/control layer, not the arithmetic data path.

## Base, Index, Effective Address

The machine instruction word stores the x field:

```text
opcode = instruction kind
r      = target or source register
x      = index register number
```

If `x = 0`, no index register is used. If `x = 1..7`, the VM computes:

```text
effective address = (base address + GRx) & 0xFFFF
```

`GR0` is not accepted as an index register because x-field value `0` means "no index".

## `adr,x` Visual Path

For indexed instructions, Circuit Focus Mode shows:

- base operand -> `EAU.BASE`
- index register row -> `EAU.INDEX`
- `EAU.SUM` -> `MAR`, `PR`, or target GR depending on instruction category
- Memory row highlight at the effective address

The old compact effective-address chip is replaced by a real address-layer module. Non-indexed instructions keep the EAU inactive and use the existing address path.

## LD / ST Memory Access

For `LD GR1,A,GR2`:

```text
BASE A + GR2 -> EAU -> MAR -> Memory[effective] -> MDR -> GR1
```

The highlighted Memory row is the effective address. The base row is not highlighted as the data source unless the effective address is the same as the base address.

For `ST GR1,A,GR2`:

```text
BASE A + GR2 -> EAU -> MAR
GR1 -> MDR -> Memory[effective]
```

The write highlight lands on the effective Memory row.

## LAD, Shift, And Jump Notes

`LAD` uses the effective address as a value:

```text
BASE + GRx -> EAU -> target GR
```

It does not read `Memory[effective]`.

Shift instructions use the effective address as the shift count:

```text
BASE + GRx -> EAU -> shift count input
GRr -> shifter/ALU -> GRr / FR
```

They do not read memory data for the shift count.

Jump instructions use the effective address as the control target:

```text
BASE label + GRx -> EAU -> PR
```

They do not use the data bus or ALU path.

## Machine Code Relation

The Machine Code explanation shows the same values as the EAU:

- x field, such as `x = GR2`
- base address from the operand word
- current index register value
- effective address
- resolved label when available

The circuit and explanation should therefore agree on the base/index/effective calculation.

## Signal Probe Relation

Signal Probe now adds compact address-computation rows for indexed instructions:

```text
BASE 0027
GR2  0001
EA   0028
MAR  0028
```

These rows only appear when the current instruction uses index addressing. Non-indexed instructions keep Signal Probe compact.

## Current Limitations

- The C++ subset does not generate index addressing yet.
- The EAU is a fixed teaching module, not a custom circuit component.
- No stack, `CALL`, `PUSH`, or `POP` path is implemented.
- No array or pointer-like C++ source syntax is implemented.
- The EAU does not model hardware timing; it explains the current instruction-level effective address.

## Future Work

- Array visualization in the C++ subset.
- Pointer-like addressing lessons.
- SP-based address path for stack instructions.
- `CALL`, `PUSH`, and `POP` path templates.
- Custom circuit modules that reuse EAU-style typed anchors.
