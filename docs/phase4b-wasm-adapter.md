# Phase 4B WASM Adapter

Phase 4B wires the generated C++/WASM bridge into the existing `CoreAdapter` boundary without changing the default runtime.

## Prerequisites

Install and activate Emscripten SDK:

```powershell
cd F:\tools
git clone https://github.com/emscripten-core/emsdk.git
cd $env:EMSDK
.\emsdk.bat install latest
.\emsdk.bat activate latest
.\emsdk_env.bat
emcc --version
where emcmake
```

If PowerShell script execution is blocked, use the `.bat` entrypoints above. The project does not require administrator privileges or permanent environment changes.

## Build WASM

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\build-wasm.ps1
```

Expected generated files:

```text
public/wasm/stugx_casl_core.js
public/wasm/stugx_casl_core.wasm
```

These files are ignored by Git and should be regenerated locally.

## Backend Selection

The default backend is still mock:

```text
VITE_CORE_BACKEND unset -> MockCoreAdapter
VITE_CORE_BACKEND=mock -> MockCoreAdapter
VITE_CORE_BACKEND=wasm -> WasmCoreAdapter
```

`coreBridge.ts` remains the only frontend entry point. React components and the store do not know whether the active backend is mock or WASM.

## Adapter Implementation

`WasmCoreAdapter` lazy-loads `/wasm/stugx_casl_core.js` through `wasmLoader.ts`, calls `stugx_casl_create` once, and wraps C ABI functions that return JSON strings.

The adapter parses:

- `stugx_casl_assemble` as `AssembleResultDto`
- `stugx_casl_step` as `StepResultDto`
- `stugx_casl_reset`, `stugx_casl_run`, and `stugx_casl_get_state` as `CometStateDto`

`dispose()` calls `stugx_casl_destroy`.

## WASM Parity Tests

`src/tests/wasmCoreAdapter.test.ts` runs only when both generated WASM files exist. It compares WASM output with the Phase 3B golden fixtures for:

- simple ready
- simple step1
- simple step2
- simple step3
- GR2 step1

When WASM files are absent, these tests are skipped and normal `pnpm test` remains usable.

## Current Limits

- Single WASM runtime instance.
- JSON string bridge, not typed memory.
- WASM artifacts are not committed.
- Default runtime remains `MockCoreAdapter`.
- No expanded CASL II instruction set or C++ subset transpiler.
