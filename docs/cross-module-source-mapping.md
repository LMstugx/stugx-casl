# Cross-module Source Mapping

- Audience: Runtime, debugger, and UI developers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Linker Runtime](linker-runtime-contract.md), [Source Mapping Guide](user/generated-casl-machine-code.md)

The mapping chain is:

`Project -> Module -> Source Range -> Module-relative Word -> Linked Address -> Runtime Microcycle`

Every linked word records module ownership and module-relative offset. Instruction mappings additionally retain `SourceUnitId` and stable mapping identity. Machine Code, Source Mapping, Trace, and debugger context display the owning module without using the active editor as an inference source.

A cross-module `CALL` moves runtime mapping to the callee module. `RET` returns it to the caller. Macro-expanded instructions keep their original module and macro-source mapping. Reverse Microstep and Reverse Instruction restore the retained mapping transaction; they do not reparse source.

Runtime machine-word override may reduce mapping confidence but cannot transfer ownership to another module. Unmapped words remain inspectable without a fabricated source location.
