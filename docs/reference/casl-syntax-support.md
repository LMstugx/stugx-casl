# CASL Syntax Support

- Audience: CASL source authors and assembler maintainers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Supported CASL Instructions](supported-casl-instructions.md), [Diagnostic Codes](diagnostic-codes.md)

Source is line-oriented. A line may contain a label, opcode/directive, operands, and a comment in the forms accepted by the current parser.

Labels are resolved within the assembled source. Registers are `GR0` through `GR7`. Numeric address/literal validation uses the assembler's 16-bit range contracts.

`START` and `END` delimit one program. `START` may name an execution entry. `DC` accepts decimal, hexadecimal, address, multiple, character, and string constants; doubled apostrophes encode an apostrophe. `DS` reserves words.

CASL address literals use decimal, hexadecimal, or character forms such as `=10`, `=#1234`, and `='A'`. Each occurrence receives collision-safe generated `DC` storage. The fixed `IN`, `OUT`, `RPUSH`, and `RPOP` macros expand to real instructions; custom macros are not supported.

Index addressing uses `adr,GRx` on supported address forms:

```text
effective address = (base address + GRx) & 0xFFFF
```

`GR0` is not accepted as an index register. `PUSH` stores the effective-address value itself, while memory-reading instructions use the effective address to access memory.

The assembler rejects unknown opcodes, symbols, malformed operands, duplicates, invalid registers/index registers, and out-of-range values with structured diagnostics.

Decimal `DC` values use the low 16 bits, as required by the official profile. Hexadecimal constants use `#` plus four digits. Full-width punctuation is not silently normalized.
