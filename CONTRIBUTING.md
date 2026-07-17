# Contributing

stugx.CASL is currently maintained as a focused CASL II / COMET II learning studio. Discuss substantial behavior or architecture changes before implementation.

## Development Setup

- Node.js 20 through 24 and pnpm 11
- CMake and a C++20 toolchain
- Emscripten for WASM builds
- Rust stable MSVC, Visual Studio Build Tools, Windows SDK, and WebView2 for the Windows demo

Install JavaScript dependencies with `pnpm install --frozen-lockfile`.

## Change Boundaries

- Keep parser, assembler, lowering, emitted CASL, diagnostics, and VM behavior covered by focused tests.
- Preserve the single-document lifecycle and the four independent persistence contracts.
- Do not add broad Tauri filesystem, shell, HTTP, updater, or process permissions without a reviewed phase contract.
- Do not commit generated bundles, executables, installers, source maps, visual artifacts, storage dumps, credentials, or environment files.
- Do not add analytics, telemetry, or network dependencies without explicit approval.

## Validation

Run the checks appropriate to the change. The full local gate is:

```powershell
pnpm test
pnpm build
pnpm test:e2e
pnpm build:wasm
pnpm test:wasm
pnpm test:e2e:wasm
pnpm docs:verify
powershell -ExecutionPolicy Bypass -File scripts/validate-all.ps1
powershell -ExecutionPolicy Bypass -File scripts/stress-check.ps1
pnpm audit
```

For Tauri changes, also run `pnpm tauri:build` and `pnpm tauri:verify` from an MSVC developer environment.

## Pull Requests

Keep commits scoped, explain contract changes, identify manual checks, and never weaken a regression test to hide a failure. Generated screenshots belong in local review artifacts, not Git history.
