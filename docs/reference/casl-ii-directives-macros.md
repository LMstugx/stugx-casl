# CASL II Directives, Literals, And Macros

- Audience: CASL II source authors and assembler maintainers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [CASL Syntax Support](casl-syntax-support.md), [Macro Expansion](../developer/casl-macro-expansion.md)

## Directives

`START` begins one assembled program and may name an execution entry label. Exactly one `START` and one final `END` are required. Tokens after `END`, duplicate directives, unresolved entries, and invalid ordering are rejected.

`DS n` reserves `n` consecutive words. `DS 0` is accepted as a zero-word reservation. Negative sizes and layouts past address `FFFF` are rejected. Simulator initialization values are not a CASL II language guarantee.

`DC` accepts a comma-separated list of:

- signed decimal integers, stored as the low 16 bits
- `#` followed by exactly four hexadecimal digits
- address labels
- single-quoted character strings

Each character occupies one word and no NUL terminator is added. Two adjacent apostrophes inside a string encode one apostrophe. Empty list items and trailing commas are rejected. Values and strings are laid out contiguously and map to their source `DC` row.

## Literals

Address operands accept decimal, hexadecimal, and character forms such as `=10`, `=#1234`, and `='A'`. Each occurrence creates deterministic generated `DC` storage before the assembled end. Phase 20A deliberately does not deduplicate equal occurrences.

Generated labels use collision-safe `STLxxxxx` names and remain owned by the original operand's source mapping. A user label with the same shape is never silently overwritten. CASL literals are independent from C++ source literals and locale.

## Macros

The fixed standard macro allowlist is:

- `RPUSH`: save `GR1` through `GR7`
- `RPOP`: restore `GR7` through `GR1`
- `IN area,length`: read at most 256 characters
- `OUT area,length`: write at most 256 characters

Macros expand before machine execution. Generated CASL, Machine Code, Trace, and source mapping preserve the relation to the macro line without representing a macro as a fictional hardware opcode.
