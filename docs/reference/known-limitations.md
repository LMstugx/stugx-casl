# Known Limitations Reference

- Audience: Maintainers and technical evaluators
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [User Limitations](../user/known-limitations.md), [Unsupported C++ Features](unsupported-cpp-features.md)

## Compiler and VM

- CASL covers the official machine instructions, directives, literals, and fixed standard macros, without a general macro system.
- Debugger mutation is limited to GR, PR, SP, current FR bits, and one Memory word; it has no bulk edit.
- Reverse is limited to one retained COMET microcycle at a time. There is no Reverse Instruction, Redo, Reverse Run, persistent timeline, or rollback across SVC/I/O and mutation/lifecycle barriers.
- Multi-program linking remains deferred. COMET microcycle stepping is available through the deterministic teaching microarchitecture, not as a physical timing simulator.
- C++ has no complete type system, preprocessing, standard library, native ABI, recursion, or stack-frame lowering.
- The bridge uses one C++/WASM runtime and JSON DTO transfer.
- Control-flow display is relationship-oriented, not a complete CFG analysis.

## Files and Persistence

- One document is open at a time.
- Browser direct Save depends on File System Access support; fallback is a downloaded copy.
- Source, external file identity, paths, handles, diagnostics, and runtime state are deliberately session-only.

## Distribution

- Public Web hosting is static Cloudflare Pages without an application backend or offline service worker.
- The Windows demo is unsigned, requires WebView2, and does not expose native Tauri file dialogs or filesystem access.

## Visualization

- Circuit Focus is a pedagogical state visualization, not cycle-accurate hardware.
- FramePlan material is design metadata and does not imply live stack-frame variables.
