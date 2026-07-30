# Known Limitations Reference

- Audience: Maintainers and technical evaluators
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [User Limitations](../user/known-limitations.md), [Unsupported C++ Features](unsupported-cpp-features.md)

## Compiler and VM

- CASL covers the official machine instructions, directives, literals, and fixed standard macros, without a general macro system.
- Debugger mutation is limited to GR, PR, SP, current FR bits, and one Memory word; it has no bulk edit.
- Reverse Microstep and Reverse Instruction are limited to the current retained history epoch. There is no Redo, Reverse Run, Reverse Macro, persistent timeline, or rollback across SVC/I/O and mutation/lifecycle barriers.
- Multi-program linking supports standard `.cas` modules, deterministic placement, and cross-module `CALL` to exported `START` program labels. Ordinary cross-module data labels, dynamic linking, object files, and proprietary WCASL project files are not supported.
- C++ has no complete type system, preprocessing, standard library, native ABI, recursion, or stack-frame lowering.
- C++ `double` has binary64 storage and copy observation only; double arithmetic, comparison, conversion, parameters, returns, and arrays are unsupported.
- The bridge uses one C++/WASM runtime and JSON DTO transfer.
- Control-flow display is relationship-oriented, not a complete CFG analysis.

## Files and Persistence

- A session may contain up to 64 independently owned CASL modules. There is no persistent project file, recent-project list, autosave, or directory scan.
- Browser direct Save depends on File System Access support; fallback is a downloaded copy.
- Source, external file identity, paths, handles, diagnostics, and runtime state are deliberately session-only.

## Distribution

- Public Web hosting is static Cloudflare Pages without an application backend or offline service worker.
- The Windows demo is unsigned, requires WebView2, and does not expose native Tauri file dialogs or filesystem access.

## Visualization

- Circuit Focus is a pedagogical state visualization, not cycle-accurate hardware.
- The workspace shows one auxiliary data panel at a time. Focus Data retains a compact Circuit instead of a second or simplified runtime.
- Follow Execution is session-only and is not restored after application restart.
- FramePlan material is design metadata and does not imply live stack-frame variables.

## Evaluation Boundary

- The WCASL replacement gate is `PASS_WITH_LIMITATIONS`, not a claim of official endorsement or proprietary format compatibility.
- First-year usability currently has expert-walkthrough and automated viewport evidence; a moderated classroom cohort remains future evidence.
