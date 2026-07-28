# ADR 0014: Debugger Runtime Mutation

- Audience: Maintainers and compatibility reviewers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Debugger Mutation Contract](../debugger-mutation-contract.md), [Document Ownership ADR](0005-document-source-ownership.md)

## Decision

Manual register and memory editing is a controller-owned runtime transaction. It never edits source, Generated CASL, assembler output, document Dirty, or persisted settings.

Every request is owned by `SourceUnitId`, assembly ID, and execution epoch. The core bridge serializes mutations with Step, Run, Reset, Reload, and Full Clear. A manual mutation advances execution and history epochs so stale asynchronous completion cannot overwrite the result.

Program-image edits are allowed for debugger compatibility but remain explicit runtime overrides. The original word and current runtime word are presented separately. Reset reapplies overrides; Reload restores the assembly image; Full Clear discards all machine ownership.

## Rationale

Direct component writes would bypass WASM parity, ownership checks, and future Reverse Step safety. Writing edits back to source would conflate debugger experiments with the document lifecycle and could cause accidental Save behavior. A runtime override model preserves both accurate execution and honest source mapping.

## Consequences

- Mock, native C++ Core, WASM, Web, and Tauri share one target/value contract
- mutation does not increment instruction count or pretend to be a CASL instruction
- Trace records manual events with source, assembly, epoch, and runtime revision ownership
- invalid runtime opcodes fail during VM execution rather than assembly
- Reverse Step cannot cross a mutation history barrier
- no new persistence key, network request, broad Tauri permission, or microcycle state is introduced
- exact WCASL Full Clear parity is not claimed without stronger public evidence
