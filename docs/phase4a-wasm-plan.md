# Phase 4A WASM Bridge Plan

Phase 4A prepares the C++ core for Emscripten output without switching the frontend runtime. The default adapter remains `MockCoreAdapter`.

## Bridge Choice

The first WASM bridge uses a C ABI plus JSON strings.

Reasons:

- Phase 3B already defines a JSON Core DTO contract.
- `core_dump` and golden fixtures already validate the JSON shape.
- C ABI exports are simple to call from JavaScript with `cwrap`.
- The first bridge can prioritize correctness and lifecycle clarity over maximum throughput.

This is not the final performance design. If JSON becomes a hotspot, a later phase can move memory windows and register state to typed memory.

## Lifecycle

Phase 4A uses a single runtime instance inside the WASM module:

```cpp
static std::unique_ptr<WasmRuntime> runtime;
static std::string lastJsonBuffer;
static std::string lastError;
```

`stugx_casl_create()` initializes the runtime. `stugx_casl_destroy()` releases it. JSON return values are backed by `lastJsonBuffer` and remain valid until the next exported API call.

This is a controlled Phase 4A simplification. A later handle-based API can support multiple independent runtime instances if the UI needs it.

## Exported API

```cpp
extern "C" {
const char* stugx_casl_create();
void stugx_casl_destroy();
const char* stugx_casl_assemble(const char* sourceText);
const char* stugx_casl_step();
const char* stugx_casl_reset();
const char* stugx_casl_run(int maxSteps);
const char* stugx_casl_get_state();
const char* stugx_casl_get_last_error();
}
```

DTO return rules:

- `stugx_casl_assemble` returns `AssembleResultDto` JSON.
- `stugx_casl_step` returns `StepResultDto` JSON.
- `stugx_casl_reset`, `stugx_casl_run`, and `stugx_casl_get_state` return `CometStateDto` JSON.
- Errors are represented as diagnostics and `lastError`; exported functions should not throw across the JS boundary.

## Build Script

PowerShell:

```powershell
.\scripts\build-wasm.ps1
```

The script checks for `emcc` and `emcmake`, configures `cpp-core/build-wasm` with `STUGX_CASL_BUILD_WASM=ON`, and writes:

```text
public/wasm/stugx_casl_core.js
public/wasm/stugx_casl_core.wasm
```

The generated files are ignored by Git. The default `pnpm build` and native C++ build do not require Emscripten.

## TypeScript Loading Plan

`src/core/wasmLoader.ts` reserves the module loading boundary. Phase 4B should:

1. Import or fetch `/wasm/stugx_casl_core.js`.
2. Call `stugx_casl_create`.
3. Wrap exported functions with `cwrap`.
4. Convert returned `char*` values with `UTF8ToString`.
5. Parse JSON into existing Core DTOs.
6. Implement `WasmCoreAdapter` without changing React components.

## Current Limits

- Default runtime remains `MockCoreAdapter`.
- WASM output is not part of the normal build.
- The WASM bridge is single-instance.
- JSON string transfer is intentionally simple and not final-performance optimized.
- No C++ subset transpiler or full CASL II instruction set is added in this phase.

