# Supported CASL Instructions

- Audience: Users and developers checking instruction coverage
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [CASL Syntax Support](casl-syntax-support.md), [CASL Assembler](../developer/casl-assembler.md)

## Directives

`START`, `END`, `DC`, `DS`

## Machine Instructions

| Category | Instructions |
| --- | --- |
| Data | `LD`, `ST`, `LAD` |
| Arithmetic | `ADDA`, `SUBA`, `ADDL`, `SUBL` |
| Logic | `AND`, `OR`, `XOR` |
| Compare | `CPA`, `CPL` |
| Shift | `SLA`, `SRA`, `SLL`, `SRL` |
| Branch | `JUMP`, `JZE`, `JNZ`, `JPL`, `JMI`, `JOV` |
| Stack/subroutine | `PUSH`, `POP`, `CALL`, `RET` |
| System/other | `NOP`, `SVC` |

## Standard Macros

`IN`, `OUT`, `RPUSH`, `RPOP`

Macros expand to real machine instructions. No custom macro package or user-defined macro language should be inferred.

Address-bearing forms support documented labels/numbers and applicable `adr,GRx` indexing. Index registers are `GR1` through `GR7`; `GR0` is invalid as an index.

`LD`, `ADDA`, `SUBA`, `ADDL`, `SUBL`, `AND`, `OR`, `XOR`, `CPA`, and `CPL` also support the official one-word register form. See the [complete opcode matrix](comet-ii-instruction-coverage.md).
