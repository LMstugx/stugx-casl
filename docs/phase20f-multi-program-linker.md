# Phase 20F: Multi-program Linker

- Audience: Maintainers and QA reviewers
- Status: Implementation record
- Last reviewed version: 0.1.0
- Classification: Historical
- Related: [Linker Profile](casl-multi-program-linker-profile.md), [CASL Linker](developer/casl-linker.md)

Phase 20F implements a deterministic independent CASL linker without source concatenation. Each module retains source/file ownership, assembles into relative words and relocation records, and participates in one atomic linked image with cross-module Source Mapping.

The v1 export policy exposes only each module's `START` program label. Cross-module `CALL` and `RET` execute through the existing COMET II VM, stack, microcycle runtime, and reverse-history contracts. Project and linked-image identities are session-only and introduce no storage key or network access.

The feature does not parse a proprietary WCASL project format, perform dynamic linking, accept C/C++ object files, or claim binary/project-format equivalence. The final validation report records Mock, C++ Core, WASM, Web, and Tauri results.

The production-size review retained the existing JavaScript, WASM, and total-distribution limits. Link-time optimization and `-Oz` reduced the generated WASM from 352,234 to 196,135 bytes. The project/linker workspace increased production CSS to 176,679 bytes, so the reviewed CSS ceiling moved narrowly from 175,000 to 180,000 bytes in production budget baseline v2.
