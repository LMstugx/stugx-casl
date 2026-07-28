# CASL Macro Expansion

- Audience: Assembler, VM, and source-mapping maintainers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [CASL Assembler](casl-assembler.md), [Directives and Macros](../reference/casl-ii-directives-macros.md)

Phase 20A supports the standard `IN`, `OUT`, `RPUSH`, and `RPOP` macros. The parser recognizes only this fixed allowlist; there is no custom macro language.

## Register Macros

`RPUSH` expands to `PUSH 0,GR1` through `PUSH 0,GR7`. `RPOP` expands to `POP GR7` through `POP GR1`. `GR0` is not included. Every expanded instruction is assembled, executed, decoded, traced, and mapped to the original macro source row.

## Input And Output Macros

`IN area,length` and `OUT area,length` expand to a register-preserving sequence around a real `SVC`. The teaching OS profile uses service `1` for input and `2` for output. `GR1` holds the area base and `GR2` holds the length-word address for the service.

Input without a record returns a successful step result in `WaitingInput` without advancing `PR`. Enqueueing a record changes the state to Ready; the same `SVC` then consumes it. Output creates one bounded plain-text record.

## Mapping Contract

- macro names have no machine opcode
- generated instructions keep the macro's source line and raw source text
- Machine Code contains only real encoded instructions
- Trace carries macro name, current expanded-step index, and total step count
- a future microcycle view operates on expanded machine instructions
- Mock, C++ Core, and WASM must expose the same DTO shape

Macro expansion must not alter existing `PUSH`, `POP`, `CALL`, or `RET` semantics. A malformed macro uses the existing structured assembler diagnostic path and emits no partial program.
