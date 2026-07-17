# Supported CASL Instructions

- Audience: Users and developers checking instruction coverage
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [CASL Syntax Support](casl-syntax-support.md), [CASL Assembler](../developer/casl-assembler.md)

## Directives

`START`, `END`, `DC`, `DS`

## Instructions

| Category | Instructions |
| --- | --- |
| Data | `LD`, `ST`, `LAD` |
| Arithmetic | `ADDA`, `SUBA`, `ADDL`, `SUBL` |
| Logic | `AND`, `OR`, `XOR` |
| Compare | `CPA`, `CPL` |
| Shift | `SLA`, `SRA`, `SLL`, `SRL` |
| Branch | `JUMP`, `JZE`, `JNZ`, `JPL`, `JMI`, `JOV` |
| Stack/subroutine | `PUSH`, `POP`, `CALL`, `RET` |
| Other | `NOP` |

This is the product's current teaching subset. No macro package or unlisted instruction should be inferred.

Address-bearing forms support documented labels/numbers and applicable `adr,GRx` indexing. Index registers are `GR1` through `GR7`; `GR0` is invalid as an index.
