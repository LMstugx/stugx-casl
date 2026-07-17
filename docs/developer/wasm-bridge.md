# WASM Bridge

- Audience: Core bridge and production-build maintainers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Architecture Overview](architecture-overview.md), [Build, Test, and Release](build-test-release.md)

The C++ core exposes a C ABI with JSON DTOs. Emscripten produces local JavaScript glue and a `.wasm` binary, and the TypeScript `CoreAdapter` converts those DTOs into application types.

Development and selected tests may use the Mock adapter. Production Web and Tauri builds require the WASM adapter; missing or invalid WASM assets fail build or startup instead of silently selecting Mock.

Asset URLs use the centralized Vite base policy. Web defaults to `/` and supports a configured subpath. Tauri uses relative packaged assets. No loader is duplicated for desktop.

Initialization is shared and guarded to avoid duplicate runtime instances. WASM startup failure uses application-level safe error handling, not a source diagnostic.

The bridge currently uses one runtime and stringified JSON transfer. DTO validation and Mock/WASM golden parity are required when the bridge changes.
