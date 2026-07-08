# CASL Studio Next

Clean-room CASL II / COMET II learning IDE prototype.

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

The browser UI currently calls `src/core/mockCaslCore.ts` through `src/core/coreBridge.ts`. This mock implements the first supported instruction subset and exports the same state shape expected from the future C++/WASM bridge.

## C++ Core

`cpp-core/` contains a C++20 parser, assembler, VM, source map model, instruction set helpers, and smoke tests for the same vertical slice. The frontend is not yet linked to this C++ core.

The next bridge milestone is:

```text
C++ Core -> Emscripten WASM -> TypeScript State Adapter -> React + SVG UI
```

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

- Frontend still uses `src/core/mockCaslCore.ts`; C++ core is not yet connected to the UI.
- Run is not implemented in Phase 1 and remains disabled.
- New / Open / Save / Stop / language / theme controls are placeholders or disabled.
- No WASM bridge yet.
- No C++ subset transpiler.
- No full CASL II instruction set.
- No desktop packaging.

See [docs/phase1-status.md](docs/phase1-status.md) for the Phase 1 checkpoint.

## Suggested Next Phase

1. Add a stable C ABI / embind surface for the C++ core.
2. Compile `cpp-core` with Emscripten and replace the mock bridge behind `coreBridge.ts`.
3. Expand diagnostics, file operations, and SourceMap interaction.
4. Add Playwright UI tests for assemble/step/highlight behavior.
