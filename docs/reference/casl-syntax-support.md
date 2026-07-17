# CASL Syntax Support

- Audience: CASL source authors and assembler maintainers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Supported CASL Instructions](supported-casl-instructions.md), [Diagnostic Codes](diagnostic-codes.md)

Source is line-oriented. A line may contain a label, opcode/directive, operands, and a comment in the forms accepted by the current parser.

Labels are resolved within the assembled source. Registers are `GR0` through `GR7`. Numeric address/literal validation uses the assembler's 16-bit range contracts.

`START` and `END` delimit the program. `DC` defines current supported constant data, and `DS` reserves words. Consult tests and assembler diagnostics for rejected operand shapes; unsupported macros are not expanded.

Index addressing uses `adr,GRx` on supported address forms:

```text
effective address = (base address + GRx) & 0xFFFF
```

`GR0` is not accepted as an index register. `PUSH` stores the effective-address value itself, while memory-reading instructions use the effective address to access memory.

The assembler rejects unknown opcodes, symbols, malformed operands, duplicates, invalid registers/index registers, and out-of-range values with structured diagnostics.
