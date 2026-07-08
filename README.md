# stugx.CASL

A modern CASL II / COMET II learning studio that connects C++ subset code, CASL assembly, machine code, memory, trace, control flow, and circuit visualization.

## Why This Project Exists

CASL II and COMET II are useful for learning how software becomes machine behavior, but many tools around them feel dated or show only one layer at a time. Students can write a program and get a result, yet still miss the relationship between:

- high-level code
- generated CASL II assembly
- COMET II machine words
- opcode and operand fields
- registers, memory, PR movement, trace, and circuit data paths

stugx.CASL puts those layers in one learning interface. It is not only an editor and not only an emulator; it is a visual bridge between programming language concepts and CPU execution.

日本語要約: stugx.CASL は、C++ subset、CASL II、COMET II 機械語、メモリ、トレース、制御フロー、回路図を同じ画面で結びつける学習用ツールです。

## Key Features

- CASL II direct execution for the supported instruction subset.
- C++ subset transpilation into Generated CASL II Assembly.
- Machine Code view with address, word, source, label, meaning, and related C++ line.
- Opcode / operand explanation for selected COMET II words.
- Control Flow visualization for labels, conditional jumps, loop-back jumps, break, and continue.
- Register, Memory Viewer, Source Map, Trace, and Output panels.
- SVG COMET II circuit visualization driven by runtime state.
- Mock TypeScript backend for fast UI development.
- Experimental C++20 core compiled to WASM through Emscripten.
- Golden parity, WASM parity, browser E2E, Vitest, and CTest coverage.

## Main Learning Flow

```text
C++ subset source
-> Generated CASL II Assembly
-> COMET II Machine Code
-> Opcode / operand explanation
-> Control Flow targets
-> Memory / Trace / Circuit visualization
```

CASL mode starts at CASL II source and uses the same assembler, VM state, memory, trace, machine-code, and circuit views.

## Demo Flow

Recommended 3-minute walkthrough:

1. Load `CASL: GR2 Addition`, assemble, and step through `LD`, `ADDA`, and `ST`.
2. Load `C++: Addition`, assemble, then open `Generated CASL` and `Machine Code`.
3. Click a machine-code row to show opcode, register, operand, resolved label, and meaning.
4. Load `C++: For Sum Sugar`, assemble, and show how `i++` and `sum += i` become CASL.
5. Load `C++: Break Continue`, assemble, show `FOR_CONTINUE` / `FOR_END`, then Run.
6. Open Trace and Memory to show PR movement, jump targets, and the final result.

For a scripted Japanese walkthrough, see [docs/demo-script.md](docs/demo-script.md).

## Demo Programs

- `CASL: GR2 Addition`: direct CASL execution with GR2 and Memory[C].
- `C++: Addition`: C++ subset arithmetic lowered to CASL load/add/store.
- `C++: If Else`: `CPA`, `JZE`, and `JUMP` branch lowering.
- `C++: While Sum`: loop labels, Trace, Memory Viewer, and max-step-safe Run.
- `C++: For Sum`: explicit assignment increment lowering.
- `C++: For Sum Sugar`: `i++` and `+=` syntax sugar lowering.
- `C++: Break Continue`: loop-control statements lowered into CASL `JUMP`.

## Supported CASL II Subset

Directives:

- `START`
- `END`
- `DC`
- `DS`

Instructions:

- `LAD`
- `LD`
- `ST`
- `ADDA`
- `SUBA`
- `CPA`
- `JUMP`
- `JZE`
- `JNZ`
- `JPL`
- `JMI`
- `RET`

## Supported C++ Subset

Supported:

- `int main() { ... }`
- `int` variables
- integer literals
- assignment
- binary `+` and `-`
- `return 0;` and `return variable;`
- `if` / `else`
- `while`
- `for`
- comparisons: `==`, `!=`, `<`, `<=`, `>`, `>=`
- loop syntax sugar: `i++`, `++i`, `i--`, `--i`, `i += expr`, `i -= expr`
- `break;` and `continue;` inside `while` / `for`

Not supported:

- full C++ parsing
- classes, structs, templates
- arrays, pointers, references
- functions other than `main`
- strings, characters, floats, doubles
- `std::cout`, iostreams, vectors
- `switch`, `do while`, `&&`, `||`, `!`
- complete scope and type system

## Tech Stack

- Core: C++20, CMake, CTest
- Frontend: TypeScript, React, Vite, SVG, Monaco Editor
- Bridge: CoreAdapter abstraction, Mock backend, experimental WASM backend
- WASM: Emscripten, C ABI + JSON DTO bridge
- Tests: Vitest, Playwright, CTest, golden parity fixtures

## Development Commands

Install dependencies:

```powershell
pnpm install
```

Start the default Mock backend:

```powershell
pnpm dev
```

Build and run the experimental WASM backend:

```powershell
pnpm build:wasm
pnpm dev:wasm
```

Run unit tests and build:

```powershell
pnpm test
pnpm build
```

Run WASM adapter tests:

```powershell
pnpm build:wasm
pnpm test:wasm
```

Run browser smoke tests:

```powershell
pnpm test:e2e
pnpm test:e2e:wasm
```

Run the C++ core tests:

```powershell
cmake -S cpp-core -B cpp-core/build
cmake --build cpp-core/build
ctest --test-dir cpp-core/build -C Debug --output-on-failure
```

Run the full local validation script:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/validate-all.ps1
```

The validation script is optional and intended for final local checks before a demo or contest submission.

## WASM Backend

The default app uses `MockCoreAdapter`. The experimental WASM backend uses the same CoreAdapter contract and C++ core behavior in browser form.

Generated WASM files are local build artifacts:

```text
public/wasm/stugx_casl_core.js
public/wasm/stugx_casl_core.wasm
```

They are intentionally ignored by Git. Build them with:

```powershell
pnpm build:wasm
```

Then start:

```powershell
pnpm dev:wasm
```

The current backend is shown in the status bar as `Mock Core`, `WASM Core`, or `WASM Error`.

## Current Limitations

- This is a learning-oriented C++ subset transpiler, not a complete C++ compiler.
- The CASL II assembler supports the current teaching subset, not the full instruction set.
- Index addressing is not fully implemented.
- The WASM bridge currently uses a single runtime and JSON strings.
- The control-flow view is text and badge based; there is no full CFG graph yet.
- New / Open / Save, language switching, and theme controls are placeholders or limited.
- There is no desktop packaging or deployment target in this milestone.

## Contest / Demo Note

stugx.CASL is built as an educational visualization tool. The main point of the demo is not that it runs small programs; it is that it shows how each layer maps to the next:

```text
C++ subset -> CASL II -> COMET II words -> runtime state -> circuit and trace
```

For a submission-oriented overview, see [docs/submission-overview.md](docs/submission-overview.md).
