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
- `LAD`
- `ADDA`
- `SUBA`
- `CPA`
- `ST`
- `JUMP`
- `JZE`
- `JNZ`
- `JPL`
- `JMI`
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

The default browser UI currently calls `MockCoreAdapter` through `src/core/coreBridge.ts`. This adapter wraps `src/core/mockCaslCore.ts`, implements the first supported instruction subset, and exports the same DTO contract used by the C++/WASM bridge.

The active backend is shown in the bottom status bar as `Mock Core`, `WASM Core`, or `WASM Error`.

## C++ Core

`cpp-core/` contains a C++20 parser, assembler, VM, source map model, instruction set helpers, JSON dump tooling, and smoke tests for the same vertical slice. The default frontend backend remains `MockCoreAdapter`, and the experimental WASM backend can opt into the C++ core through the same CoreAdapter contract.

The next bridge milestone is:

```text
C++ Core -> Emscripten WASM -> TypeScript State Adapter -> React + SVG UI
```

## Experimental WASM Backend

Phase 4 adds an experimental Emscripten build path and opt-in `WasmCoreAdapter`. The default frontend still uses `MockCoreAdapter`; WASM is enabled only when explicitly selected.

```powershell
pnpm build:wasm
```

Equivalent direct command:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\build-wasm.ps1
```

The script requires an activated Emscripten SDK with `emcc` and `emcmake` on `PATH`. It writes:

```text
public/wasm/stugx_casl_core.js
public/wasm/stugx_casl_core.wasm
```

These generated files are ignored by Git. See [docs/phase4a-wasm-plan.md](docs/phase4a-wasm-plan.md).

To opt into the experimental WASM backend after generating the files:

```powershell
pnpm dev:wasm
```

Run `pnpm dev` to return to the default mock backend. WASM-specific parity tests can be run with:

```powershell
pnpm test:wasm
```

If `public/wasm/stugx_casl_core.js` or `.wasm` is missing, the app reports a `WASM Error` status and instructs you to run `scripts/build-wasm.ps1`.

## Experimental C++ Subset Mode

The editor can switch between `CASL` and `C++ subset` mode. C++ subset mode is a small teaching-oriented transpiler, not a complete C++ compiler.

Currently supported:

- `int main() { ... }`
- local `int` variables
- integer literals
- identifier expressions
- assignment
- binary `+` and `-`
- `if` / `else` with `==`, `!=`, `<`, `<=`, `>`, `>=`
- `while` with `==`, `!=`, `<`, `<=`, `>`, `>=`
- `return 0;`
- `return variable;`

The frontend transpiles C++ subset source to CASL first, shows the generated CASL in the Output dock, and then sends that CASL through the existing `coreBridge` to Mock or WASM backend.

Example:

```cpp
int main() {
    int a = 10;
    int b = 20;
    int c;
    c = a + b;
    return c;
}
```

Generates CASL shaped like:

```text
MAIN START
     LD    GR1,A
     ADDA  GR1,B
     ST    GR1,C
     LD    GR0,C
     RET
A DC    10
B DC    20
C DS    1
     END
```

Unsupported C++ features include classes, structs, pointers, references, templates, arrays, function calls, `std::cout`, strings, floats, `for`, `do while`, `break`, `continue`, complex boolean expressions, and full scope rules. See [docs/phase5b-cpp-subset-transpiler.md](docs/phase5b-cpp-subset-transpiler.md), [docs/phase5c-if-else-lowering.md](docs/phase5c-if-else-lowering.md), [docs/phase5d-while-lowering.md](docs/phase5d-while-lowering.md), and [docs/phase5f-run-stop-trace.md](docs/phase5f-run-stop-trace.md).

## Run / Stop

Run is enabled after a successful Assemble. The UI executes in small batches with a default `maxSteps` limit of `1000`, so loop programs can finish without freezing the browser and accidental infinite loops stop with:

```text
Max steps reached. Possible infinite loop.
```

Stop interrupts an active Run between batches. A manual stop can continue with Step or Run; a max-step safety stop disables Step/Run until Reset reloads the current assembled program.

The Trace tab stores the detailed instruction history for Step and Run. Output intentionally stays as a summary log so long while programs do not flood the bottom dock.

While example:

```cpp
int main() {
    int i = 3;
    int sum = 0;
    while (i > 0) {
        sum = sum + i;
        i = i - 1;
    }
    return sum;
}
```

The program finishes with `GR0 = 0006`.

## Main Memory Viewer

The COMET circuit keeps a compact Memory module for the current execution neighborhood. The Inspector `Memory` tab is the detailed memory viewer:

- Defaults to the current program start address with 64 rows.
- Supports custom hexadecimal start address and row counts of `32`, `64`, `128`, or `256`.
- Provides jumps to Program, PR, MAR, last read, and last write.
- Highlights PR, MAR, last read, last write, labels, and changed memory values.

The viewer generates a bounded window from `CometState` and does not render all 65536 memory words. See [docs/phase-memory-viewer.md](docs/phase-memory-viewer.md).

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

Default backend:

```powershell
pnpm dev
```

Experimental WASM backend:

```powershell
pnpm build:wasm
pnpm dev:wasm
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

WASM-only adapter tests:

```powershell
pnpm test:wasm
```

## Browser E2E Smoke Tests

Install the Playwright browser once on a development machine:

```powershell
pnpm exec playwright install chromium
```

Mock and WASM browser smoke tests:

```powershell
pnpm build:wasm
pnpm test:e2e
```

WASM-only browser smoke test:

```powershell
pnpm build:wasm
pnpm test:e2e:wasm
```

The WASM E2E test writes success screenshots to:

```text
artifacts/e2e/wasm-ready.png
artifacts/e2e/wasm-step1.png
artifacts/e2e/wasm-edited.png
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

- Default frontend backend is `MockCoreAdapter`; C++/WASM is opt-in.
- WASM backend is experimental and uses a single runtime plus JSON string bridge.
- WASM generated files are local build artifacts and are not committed.
- New / Open / Save / language / theme controls are placeholders or disabled.
- C++ subset mode is experimental and intentionally small.
- No full CASL II instruction set.
- No desktop packaging.

See [docs/phase1-status.md](docs/phase1-status.md) for the Phase 1 checkpoint.
See [docs/phase4c-wasm-runtime.md](docs/phase4c-wasm-runtime.md) for the current WASM runtime workflow.
See [docs/phase5a-instruction-expansion.md](docs/phase5a-instruction-expansion.md) for the Phase 5A instruction subset.
See [docs/phase5b-cpp-subset-transpiler.md](docs/phase5b-cpp-subset-transpiler.md) for the C++ subset transpiler MVP.
See [docs/phase5c-if-else-lowering.md](docs/phase5c-if-else-lowering.md) for if / else lowering and source mapping.
See [docs/phase5d-while-lowering.md](docs/phase5d-while-lowering.md) for while lowering.
See [docs/phase5e-run-stop-trace.md](docs/phase5e-run-stop-trace.md) for the initial Run / Stop UX.
See [docs/phase5f-run-stop-trace.md](docs/phase5f-run-stop-trace.md) for stabilized Run / Stop / maxSteps behavior.
See [docs/phase5h-run-stop-trace.md](docs/phase5h-run-stop-trace.md) for the current Run / Stop / Trace stabilization checkpoint.
See [docs/phase-memory-viewer.md](docs/phase-memory-viewer.md) for the detailed Inspector Memory viewer.

## Suggested Next Phase

1. Add `for` only after the while lowering remains stable.
2. Consider `break` / `continue` with explicit mapping and max-step protection.
3. Expand C++ / generated CASL dual highlighting interactions.
