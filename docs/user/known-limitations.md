# Known Limitations

- Audience: Users evaluating current scope
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Technical Limitations](../reference/known-limitations.md), [Unsupported C++ Features](../reference/unsupported-cpp-features.md)

- CASL covers the official machine instructions, four directives, literals, and fixed standard macros. User-defined macros and multi-program linking are unavailable.
- The C++ path is a bounded teaching subset, not a native or standards-conforming compiler.
- C++ function calls use up to three register arguments; recursion, overloads, and stack arguments are unavailable.
- Stack-frame locals remain design metadata and are not runtime lowering.
- The WASM bridge uses one runtime and JSON DTOs.
- File System Access depends on browser and secure-context capability; other environments use an explicit download copy.
- External files, source, paths, handles, diagnostics, and VM state are not restored between sessions.
- The public Web version has no custom domain, service worker, PWA offline cache, server backend, or account system.
- The Windows installer is unsigned and Tauri-native file I/O is deferred.
- Circuit Focus visualizes current teaching relationships; it is not an electrical or cycle-accurate hardware simulator.
- Register/Memory editing is limited to one 16-bit target per confirmed transaction; bulk paste, fill, search-and-replace, and editing MAR/MDR are unavailable.
- COMET microcycle stepping, reverse execution, and multi-program linking are not production features.
