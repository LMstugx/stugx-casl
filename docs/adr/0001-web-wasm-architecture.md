# ADR 0001: Web WASM Architecture

- Audience: Core, bridge, and build maintainers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [WASM Bridge](../developer/wasm-bridge.md), [Build, Test, and Release](../developer/build-test-release.md)

## Context

The Web application must use the same C++ CASL assembler and COMET II runtime that are validated outside the browser.

## Decision

Production Web builds require the Emscripten WASM glue and binary behind the typed CoreAdapter boundary. Mock remains limited to development and designated tests. Production build or startup fails safely when WASM is unavailable; it never silently changes backend semantics.

## Consequences

- C++/WASM DTO parity is tested.
- WASM assets and base-aware URLs are production requirements.
- Startup failure is an application error, not a source diagnostic.
- A new backend requires an explicit adapter and parity contract.
