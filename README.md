# stugx.CASL

Clean-room CASL II / COMET II Learning Studio prototype.

This project intentionally does not reuse the old Avalonia, Qt, WCASL clone, QPainter circuit, wire path experiments, overlay experiments, or diff experiments. The first milestone is a small, testable vertical slice:

- Monaco-based CASL II source editor
- Assemble, Step, and Reset controls
- TypeScript mock CASL core for the first UI loop
- SVG COMET-II circuit rendered from `CometState`
- Register, memory, source map, trace, output, and status panels
- C++20 core skeleton with an independently tested parser, assembler, VM, source map, and state model

## Current Milestone

The supported CASL II subset is deliberately small:

- `START`
- `END`
- `DC`
- `DS`
- `LD`
- `ADDA`
- `ST`
- `RET`

The sample program assembles at address `0020` and produces:

```text
0020: 1010
0021: 0027
0022: 2010
0023: 0028
0024: 1110
0025: 0029
0026: 8100
0027: 000A
0028: 0014
0029: 0000
```

## What Is Mocked

The browser UI currently calls `MockCoreAdapter` through `src/core/coreBridge.ts`. This adapter wraps `src/core/mockCaslCore.ts`, implements the first supported instruction subset, and exports the same DTO contract expected from the future C++/WASM bridge.

## C++ Core

`cpp-core/` contains a C++20 parser, assembler, VM, source map model, instruction set helpers, and smoke tests for the same vertical slice. The frontend is not yet linked to this C++ core.

The next bridge milestone is:

```text
C++ Core -> Emscripten WASM -> TypeScript State Adapter -> React + SVG UI
```

## Experimental WASM Build

Phase 4A adds an experimental Emscripten build path. It is not used by the default app runtime yet; the default frontend still uses `MockCoreAdapter`.

```powershell
.\scripts\build-wasm.ps1
```

The script requires an activated Emscripten SDK with `emcc` and `emcmake` on `PATH`. If available, it writes:

```text
public/wasm/stugx_casl_core.js
public/wasm/stugx_casl_core.wasm
```

These generated files are ignored by Git. See [docs/phase4a-wasm-plan.md](docs/phase4a-wasm-plan.md).

## Install

```bash
npm install
```

If `npm` is not available in the current Windows PATH, use the bundled package runner available in this Codex environment:

```powershell
$env:Path='C:\Users\LMSTUGX\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;' + $env:Path
& 'C:\Users\LMSTUGX\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\pnpm.cmd' install
```

## Run The App

```bash
npm run dev
```

Equivalent bundled command:

```powershell
$env:Path='C:\Users\LMSTUGX\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;' + $env:Path
& 'C:\Users\LMSTUGX\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\pnpm.cmd' dev
```

## Frontend Tests

```bash
npm test
```

Equivalent bundled command:

```powershell
$env:Path='C:\Users\LMSTUGX\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;' + $env:Path
& 'C:\Users\LMSTUGX\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\pnpm.cmd' test
```

## Frontend Build

```bash
npm run build
```

Equivalent bundled command:

```powershell
$env:Path='C:\Users\LMSTUGX\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;' + $env:Path
& 'C:\Users\LMSTUGX\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\pnpm.cmd' build
```

## C++ Tests

```bash
cmake -S cpp-core -B cpp-core/build
cmake --build cpp-core/build
ctest --test-dir cpp-core/build -C Debug --output-on-failure
```

## Current Real Source Loop

The Phase 1 UI now assembles the current Monaco editor text:

```text
SourceEditor current text
-> useAppStore.sourceText
-> assemble(sourceText)
-> CometState
-> Memory / Register / SourceMap / Circuit UI
```

When source changes, the VM becomes `Dirty`, the old assembled state is invalidated, and Step / Reset are disabled until Assemble succeeds again.

## Current Limitations

- Frontend still uses `MockCoreAdapter`; C++/WASM is not yet the default adapter.
- Run is not implemented in Phase 1 and remains disabled.
- New / Open / Save / Stop / language / theme controls are placeholders or disabled.
- WASM bridge output is experimental and not enabled by default.
- No C++ subset transpiler.
- No full CASL II instruction set.
- No desktop packaging.

See [docs/phase1-status.md](docs/phase1-status.md) for the Phase 1 checkpoint.

## Suggested Next Phase

1. Add a stable C ABI / embind surface for the C++ core.
2. Compile `cpp-core` with Emscripten and replace the mock bridge behind `coreBridge.ts`.
3. Expand diagnostics, file operations, and SourceMap interaction.
4. Add Playwright UI tests for assemble/step/highlight behavior.
