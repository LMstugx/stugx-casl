# ADR 0015: COMET II Three-Bit Flag Register

- Audience: Runtime, bridge, debugger, and visualization maintainers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [COMET II VM](../developer/comet-vm.md), [Debugger Mutation Contract](../debugger-mutation-contract.md)

## Decision

Public COMET II FR state contains exactly three booleans:

- `OF`
- `SF`
- `ZF`

The packed internal bridge representation uses bit 2 for `OF`, bit 1 for `SF`,
and bit 0 for `ZF`. Inputs with any other bit set are invalid. DTO and WASM JSON
use exactly `frOF`, `frSF`, and `frZF`.

Shift instructions place the final shifted-out bit in `OF`. Unsigned carry from
`ADDL` and borrow from `SUBL` set `OF`. Carry and borrow may exist as
function-local implementation intermediates, but they are not VM state,
serialized state, debugger controls, or user-facing flags.

## Context

The Phase 20B debugger review found an implementation-specific fourth carry
field in the TypeScript and C++ state models, bridge JSON, UI, and mutation
contract. The official COMET II specification defines only `OF`, `SF`, and
`ZF`. Keeping the extra field would create a false public machine model and
make debugger mutation incompatible with the specification.

## Consequences

- Mock, native C++ Core, WASM, Web, and Tauri expose the same three fields.
- FR debugger edits use an exact structured `{ of, sf, zf }` value.
- The FR editor has three checkboxes and no generic numeric input.
- `JOV` continues to read `OF`; branch behavior does not gain a carry branch.
- COMET FR remains independent from software floating-point status.
- Historical documents may retain context only when they explicitly link this
  correction; canonical documents must not describe a fourth flag.
- A future new public flag requires a specification-level ADR and compatibility
  migration rather than shape inference.
