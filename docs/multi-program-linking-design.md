# Multi-program Linking Design

Phase 20A admission result: **PARTIAL**. A design boundary exists, but implementation is deferred to Phase 20D.

The current application intentionally keeps the Phase 15 single-document model. Concatenating source text would lose `SourceUnitId` ownership, duplicate-label provenance, literal ownership, file lifecycle guards, and reliable cross-file source mapping.

## Required Model

A future linker needs immutable assembly units with:

- distinct document and source-unit ownership
- one main `START` entry and explicit subprogram metadata
- exported entry labels and unresolved external references
- deterministic assembly and link order
- duplicate-label diagnostics with both source ranges
- 16-bit relocation records
- per-unit literal pools and generated-label namespaces
- linked addresses that do not replace source identity
- source mapping that retains file and source-unit ownership

The linker must consume structured assembler output, not source strings. File opening, Dirty guards, Save, and replacement remain owned by the document layer.

## Admission Gate

Implementation remains blocked until tests prove:

1. cross-file diagnostics retain both source owners;
2. relocation overflow is rejected deterministically;
3. entry selection cannot bypass single-document replacement guards;
4. generated literals and labels cannot collide across units;
5. Mock, C++ Core, WASM, Web, and Tauri receive the same linked image;
6. no undocumented WCASL project format is inferred.

Standard `.cas` files remain compatible. Importing a WCASL-specific project or makefile format is separately `blocked-needs-spec-evidence`.
