# Repository Structure

- Audience: Contributors navigating the repository
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Architecture Overview](architecture-overview.md), [Build Commands](../reference/build-commands.md)

- `src/`: React UI, application state, TypeScript transpiler, adapters, i18n, content registries, and unit tests.
- `cpp-core/`: C++20 CASL assembler and COMET II core with CMake/CTest coverage.
- `public/`: static public assets, Cloudflare `_headers`, and generated local WASM output location.
- `src-tauri/`: Tauri 2 Rust shell, configuration, capabilities, and icon assets.
- `scripts/`: deterministic build, verification, packaging, deployment smoke, changelog, and documentation tools.
- `tests/e2e/`: Playwright browser, production, WASM, deployment, and visual-review scenarios.
- `docs/`: canonical guides, technical contracts, ADRs, historical Phase records, and frozen manifests.

Generated directories such as `dist/`, `release/`, `artifacts/`, `coverage/`, and `src-tauri/target/` are ignored and must not be committed.

`package.json` is the canonical application version source. `pnpm-lock.yaml` and `src-tauri/Cargo.lock` are tracked reproducibility inputs.
