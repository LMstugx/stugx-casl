# Phase 4C WASM Runtime Stabilization

Phase 4C keeps the product runtime conservative: the default backend remains the TypeScript mock, while the C++/WASM backend is available as an explicit development option.

## Backend Status

The bottom status bar shows the active core backend:

- `Mock Core`: default `MockCoreAdapter`
- `WASM Core`: opt-in `WasmCoreAdapter`
- `WASM Error`: WASM was selected but loading or execution failed

Errors are routed through the store into diagnostics, Messages, and Output state instead of only using `console.error`.

## Mock vs WASM

`MockCoreAdapter` remains the default because it is fast to start, does not require generated local artifacts, and keeps Phase 1 UI development stable.

`WasmCoreAdapter` is selected only when `VITE_CORE_BACKEND=wasm` is present. It loads the generated Emscripten module, calls the C ABI functions, parses JSON DTOs, and returns the same `CoreAdapter` contract used by the mock adapter.

React components and the app store still depend on `coreBridge` only. They do not import `MockCoreAdapter`, `WasmCoreAdapter`, or the WASM loader directly.

## Generate WASM

Install and activate Emscripten first, then run:

```powershell
pnpm build:wasm
```

Direct script form:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\build-wasm.ps1
```

Expected generated files:

```text
public/wasm/stugx_casl_core.js
public/wasm/stugx_casl_core.wasm
```

These files are ignored by Git and should be regenerated locally.

## Enable WASM

```powershell
pnpm dev:wasm
```

The package script sets `VITE_CORE_BACKEND=wasm` for that process only. The regular command keeps the default mock backend:

```powershell
pnpm dev
```

## Test WASM

```powershell
pnpm test:wasm
```

The general test suite still works without WASM artifacts:

```powershell
pnpm test
```

WASM parity tests compare the adapter output against the Phase 3B golden fixtures. If the generated WASM files are absent in the normal test run, those parity tests skip instead of failing.

## Error Handling

The loader reports clear failures for:

- Missing `public/wasm/stugx_casl_core.js`
- Missing `public/wasm/stugx_casl_core.wasm`
- Emscripten module import or initialization failure
- C ABI functions returning null or empty JSON strings
- Invalid JSON returned by the bridge

Errors include a `scripts/build-wasm.ps1` hint when the local WASM artifacts are missing or invalid. `WasmCoreAdapter` also consults `stugx_casl_get_last_error()` when JSON parsing fails.

## Current Limits

- Single WASM runtime instance.
- JSON string bridge, not typed shared memory.
- WASM artifacts are not committed.
- Development and ordinary non-production tests default to Mock; Phase 17A production builds require WASM and fail when its artifacts are absent.
- Performance is not optimized yet.
- No expanded CASL II instruction set.
- No C++ subset transpiler.

## Phase 17A Production Reference

Production URL resolution is now base-aware through `import.meta.env.BASE_URL`, native dynamic import replaces the former runtime function constructor, and root/subpath static smoke tests reject silent Mock fallback. See `production-build-contract.md` and `phase17a-production-deployment-readiness.md`.
