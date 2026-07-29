# Linker Runtime Contract

- Audience: Runtime and frontend developers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Linker Profile](casl-multi-program-linker-profile.md), [Cross-module Mapping](cross-module-source-mapping.md), [History Barriers](debugger-history-barrier-contract.md)

## Transaction

A Link operation captures `ProjectId`, ordered module identities, Main, each `SourceUnitId`, and each `ModuleAssemblyId`. It validates all assemblies, computes placement, builds the exported-symbol table, resolves relocations into a candidate image, verifies the ownership snapshot again, and atomically commits a new `LinkId` and `LinkRevision`.

A failed link does not partially write VM memory. The previous successful link remains available as stale project output, while its runtime is not presented as a newly successful link.

## Runtime Ownership

The VM loads one immutable linked image. Runtime overrides remain separate. Runtime state, microcycle history, reverse transactions, Trace, and mappings carry `ProjectId`, `LinkId`, and `LinkRevision`; ordinary execution additionally carries the active module and source-mapping identity.

Relink, module add/remove/reorder, Main change, source replacement, and successful link commit are hard history ownership boundaries. Reset and Reload use the current linked image; Full Clear unloads it. No project, link result, or history is written to localStorage.

Cross-module `CALL` and `RET` use the existing COMET II opcode, Memory, SP, and return-address behavior. There is no host call stack or linker-specific VM.
