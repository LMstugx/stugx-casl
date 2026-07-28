# Phase 20B Debugger State Editing And Full Clear

- Audience: Maintainers and QA reviewers
- Status: Historical implementation record
- Last reviewed version: 0.1.0
- Classification: Historical
- Related: [Phase 20A Audit](phase20a-wcasl-parity-audit.md), [Debugger Mutation Contract](debugger-mutation-contract.md)

## Scope

Phase 20B adds atomic editing for `GR0`-`GR7`, PR, SP, current FR bits, and one Memory word at a time. It also adds a destructive Full Clear that unloads machine state without changing source or persistence.

The implementation uses one controller DTO and serialized backend boundary across Mock, native C++ Core, WASM, Web, and Tauri. Program-word changes execute from runtime memory, while source-map and assembler-output ownership remain attached to the original assembly.

## Frozen Behavior

- four input formats resolve to one 16-bit word without wrap
- mutation requires matching source unit, assembly, and execution epoch
- one mutation transaction is active at a time
- mutation does not parse, assemble, run, save, set Dirty, or write storage
- Reset preserves runtime memory overrides
- Reload discards overrides and restores the assembly image
- Full Clear clears machine ownership and preserves document-owned state
- manual edits form a future Reverse Step history barrier

## Compatibility Result

Register editing and Memory editing are `compatible`. Full Clear is `intentionally-different` because exact WCASL Clear/document-lifecycle evidence is incomplete. P0/P1 remain complete and P2 `missing` becomes zero.

Reverse Step, COMET microcycle runtime, multi-program linking, and WCASL project import remain unavailable. No opcode, assembler encoding, normal VM result, diagnostic identity, file lifecycle, persistence key, or clean-wire behavior is changed.

## Result

**PASS.** The complete Web, Mock, native C++, WASM, production, visual, stress, dependency-audit, and Tauri validation matrix passed.

- unit and contract tests: 1,507 passed
- browser E2E: 69 passed across Mock and WASM
- native C++: 71 passed
- WASM adapter: 24 passed
- production static smoke: passed with the WASM backend
- visual review and capture: passed at 1,280, 1,440, and 1,920 pixel review widths
- Tauri release executable, NSIS bundle, and offline WASM verification: passed
- dependency audit: no known vulnerabilities

The existing production main-chunk size warning remains an accepted Phase 17 limitation and is not caused by debugger state editing.
