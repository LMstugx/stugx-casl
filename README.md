# stugx.CASL

A CASL II / COMET II learning studio for understanding how source code, assembly, machine code, memory, trace, control flow, and circuit state connect.

## What This Tool Is

stugx.CASL is a study-oriented environment for CASL II and COMET II. It lets you write CASL directly, or write a small C++ subset and inspect how it is lowered into CASL II, assembled into COMET II machine words, and executed step by step.

The goal is practical learning:

- see how C++ subset statements become CASL II assembly
- see how CASL II rows become COMET II machine words
- inspect opcode, register, operand, and resolved label meaning
- observe PR, GR, memory, trace, control flow, and circuit state together

It is not a full C++ compiler and not a full CASL II development environment. It is a focused learning tool.

## Main Learning Pipeline

```text
C++ subset source
-> Generated CASL II Assembly
-> COMET II Machine Code
-> Opcode / operand explanation
-> Control Flow targets
-> Memory / Trace / Circuit visualization
```

CASL mode starts from CASL II source and then uses the same machine-code, runtime, memory, trace, and circuit views.

## Recommended Learning Order

Each built-in example includes a collapsible `Guided Lesson` in the Demo Guide. Study Mode turns the lesson into a manual per-example checklist: read the concepts, assemble the example, open the recommended tab, confirm each checkpoint, and reset session-only progress when you want to repeat the lesson.

1. `CASL: GR2 Addition`
   Learn direct CASL execution, `LD`, `ADDA`, `ST`, `RET`, GR changes, and memory write.

2. `CASL: Logic Operations`
   Learn `AND`, `OR`, `XOR`, bitwise ALU behavior, and a memory write.

3. `CASL: Logical Add Compare`
   Learn `ADDL`, `CPL`, `JOV`, unsigned comparison, and overflow-flag jumps.

4. `CASL: Shift Operations`
   Learn `SLL`, `SRL`, `SLA`, `SRA`, shift counts, GR updates, and FR / OF behavior.

5. `CASL: Index Addressing`
   Learn `adr,x`, x-field encoding, base address, index register, and effective address.

6. `CASL: Push Pop Stack`
   Learn `SP`, stack memory, `PUSH` storing an effective address, and `POP` reading `Memory[SP]`.

7. `CASL: Call Return`
   Learn `CALL`, return-address stack writes, stack-aware `RET`, and top-level `RET` finish compatibility.

8. `CASL: Nested Call Return`
   Learn nested `CALL`, last-in-first-out return order, and how `callDepth` explains stack-aware `RET`.

9. `C++: Addition`
   Learn how assignment and arithmetic become `LD`, `ADDA`, `ST`, and return through `GR0`.

10. `C++: If Else`
   Learn `CPA`, conditional jumps, labels, and branch targets.

11. `C++: While Sum`
   Learn loop labels, loop-back jumps, Trace, and Memory Viewer.

12. `C++: For Sum Sugar`
   Learn for-loop initializer, condition, increment, `i++`, and `+=` lowering.

13. `C++: Break Continue`
   Learn why `continue` jumps to the increment block and `break` jumps to the loop end.

For detailed study guidance, see [docs/learning-guide.md](docs/learning-guide.md).
For circuit layout semantics, see [docs/phase8e-circuit-focus-final-layout.md](docs/phase8e-circuit-focus-final-layout.md).
For the Circuit Focus presentation layout, see [docs/phase8g-circuit-focus-visual-convergence.md](docs/phase8g-circuit-focus-visual-convergence.md).
For the latest Circuit Focus UI semantics cleanup, see [docs/phase8i-focus-mode-ui-refinement.md](docs/phase8i-focus-mode-ui-refinement.md).
For the lab-style schematic bus lane polish, see [docs/phase8j-lab-style-schematic-polish.md](docs/phase8j-lab-style-schematic-polish.md).
For the layered study-mode density pass and Signal Probe foundation, see [docs/phase8k-layered-study-mode-density-refinement.md](docs/phase8k-layered-study-mode-density-refinement.md).
For the circuit arrow routing pass, see [docs/phase8l-circuit-arrow-routing.md](docs/phase8l-circuit-arrow-routing.md).
For future custom-circuit design notes, see [docs/future-custom-circuit-design.md](docs/future-custom-circuit-design.md).
For the latest CASL instruction coverage batch, see [docs/phase9a-casl-instruction-coverage.md](docs/phase9a-casl-instruction-coverage.md).
For shift instruction coverage and path templates, see [docs/phase9b-shift-instructions-and-path-templates.md](docs/phase9b-shift-instructions-and-path-templates.md).
For index addressing, see [docs/phase9c-index-addressing.md](docs/phase9c-index-addressing.md).
For the stack address path preview foundation, see [docs/phase9e-stack-address-path-foundation.md](docs/phase9e-stack-address-path-foundation.md).
For `PUSH` / `POP` stack semantics, see [docs/phase9f-push-pop-stack.md](docs/phase9f-push-pop-stack.md).
For `CALL` and stack-aware `RET`, see [docs/phase9g-call-ret-stack-semantics.md](docs/phase9g-call-ret-stack-semantics.md).
For subroutine teaching polish and return-edge explanation, see [docs/phase9h-subroutine-teaching-polish.md](docs/phase9h-subroutine-teaching-polish.md).

## Key Views

- Source Editor: CASL or C++ subset source.
- Generated CASL: structured CASL II generated from C++ subset source.
- Machine Code: COMET II address/word rows with source, labels, and meaning.
- Machine Code Explanation: opcode, register, index, base operand, effective address, resolved label, and readable meaning.
- Control Flow: label and jump target hints for if/else, while, for, break, and continue.
- Memory Viewer: bounded memory windows with label, PR, MAR, read, write, and range controls.
- Trace: recent execution history for Step and Run.
- Circuit Focus Mode: a presentation layout with Program, OUT Display, Current Instruction, large COMET II circuit, compact Signal Probe, Stack Preview, Registers, Trace, and Timeline panels. It highlights the last executed instruction as the teaching target, while PR and next instruction remain secondary hints. The circuit uses DATA / ADDR / CTRL bus lanes, row-level anchors, and lightweight signal indicators for a lab-style teaching schematic.
- Circuit: SVG COMET II visualization driven by the current runtime state, with row-level GR/Memory targeting for active data paths.

## Demo Examples

- `CASL: GR2 Addition`
- `CASL: Logic Operations`
- `CASL: Logical Add Compare`
- `CASL: Shift Operations`
- `CASL: Index Addressing`
- `CASL: Push Pop Stack`
- `CASL: Call Return`
- `CASL: Nested Call Return`
- `C++: Addition`
- `C++: If Else`
- `C++: While Sum`
- `C++: For Sum`
- `C++: For Sum Sugar`
- `C++: Break Continue`

Use the Demo selector above the Source Editor. Loading an example marks the current runtime as Dirty; click `Assemble` to load it into the backend.

## Supported CASL II Subset

Directives:

- `START`
- `END`
- `DC`
- `DS`

Instructions:

- `NOP`
- `LAD`
- `LD`
- `ST`
- `ADDA`
- `SUBA`
- `ADDL`
- `SUBL`
- `AND`
- `OR`
- `XOR`
- `CPA`
- `CPL`
- `SLA`
- `SRA`
- `SLL`
- `SRL`
- `PUSH`
- `POP`
- `CALL`
- `JUMP`
- `JZE`
- `JNZ`
- `JPL`
- `JMI`
- `JOV`
- `RET`

Index addressing:

- `adr,x` is supported for the register/address and jump instruction forms listed above.
- x may be `GR1` through `GR7`.
- `GR0` is rejected as an index register.
- Effective address is `(base address + GRx) & 0xFFFF`.

Stack subset:

- `PUSH adr[,x]` decrements `SP` and stores the effective address value itself at `Memory[SP]`.
- `POP GRr` reads `Memory[SP]` into the target register, then increments `SP`.
- `CALL adr[,x]` pushes the return address to `Memory[SP]`, then jumps to the effective address.
- `RET` performs a stack return when a call frame exists; otherwise it preserves the original top-level program-finish behavior.

## Supported C++ Subset

Supported:

- `int main() { ... }`
- no-argument and single-argument `int` functions
- `int` variables
- integer literals
- assignment
- binary `+` and `-`
- `return 0;`, `return variable;`, and `return foo();`
- function call assignment: `x = foo();`
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
- multiple function parameters, recursion, overloads, and function pointers
- stack-frame locals / arguments
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

Start with the default Mock backend:

```powershell
pnpm dev
```

Build and run the experimental WASM backend:

```powershell
pnpm build:wasm
pnpm dev:wasm
```

Run frontend tests and build:

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

Capture a local visual review gallery:

```powershell
pnpm visual:capture
pnpm visual:serve
```

See [docs/visual-review.md](docs/visual-review.md) for phone/LAN review notes.

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

The validation script is optional and intended for final local checks before a study demo or handoff.

## WASM Backend

The default app uses `MockCoreAdapter`. The experimental WASM backend uses the same CoreAdapter contract and C++ core behavior in browser form.

Generated WASM files are local build artifacts and are ignored by Git:

```text
public/wasm/stugx_casl_core.js
public/wasm/stugx_casl_core.wasm
```

The current backend is shown in the status bar as `Mock Core`, `WASM Core`, or `WASM Error`.

## Documentation

- [docs/learning-guide.md](docs/learning-guide.md): recommended study order and how to read each view.
- [docs/practice-tasks.md](docs/practice-tasks.md): small exercises for checking understanding.
- [docs/demo-script.md](docs/demo-script.md): Japanese-first explanation script for teachers or senior students.
- [docs/screenshots-guide.md](docs/screenshots-guide.md): useful screenshots for explaining the tool.
- [docs/project-overview.md](docs/project-overview.md): concise project overview for learning and teaching use.
- [docs/phase9d-effective-address-unit.md](docs/phase9d-effective-address-unit.md): Effective Address Unit visualization for indexed operands.
- [docs/phase9e-stack-address-path-foundation.md](docs/phase9e-stack-address-path-foundation.md): SP, Stack Preview, and inactive stack-address path foundation for future stack instructions.
- [docs/phase9f-push-pop-stack.md](docs/phase9f-push-pop-stack.md): `PUSH` / `POP` stack semantics, Stack Preview updates, and circuit stack path.
- [docs/phase9g-call-ret-stack-semantics.md](docs/phase9g-call-ret-stack-semantics.md): `CALL`, stack-aware `RET`, and top-level `RET` compatibility.
- [docs/phase9h-subroutine-teaching-polish.md](docs/phase9h-subroutine-teaching-polish.md): Call Stack view, return edge explanation, and nested-call teaching notes.
- [docs/phase10a-cpp-function-call-lowering.md](docs/phase10a-cpp-function-call-lowering.md): no-argument C++ function-call lowering to CASL `CALL` / `RET` with `GR0` return values.
- [docs/phase10b-calling-convention-design.md](docs/phase10b-calling-convention-design.md): future C++ calling convention design for `GR0` returns, `GR1` / `GR2` register arguments, and stack-frame locals.
- [docs/phase10c-cpp-single-argument-function.md](docs/phase10c-cpp-single-argument-function.md): single-argument C++ function-call lowering with `GR1` as the first argument register.

## Current Limitations

- This is a learning-oriented C++ subset transpiler, not a complete C++ compiler.
- The CASL II assembler supports the current teaching subset, not the full instruction set.
- Index addressing is supported for CASL address operands, but C++ subset code does not generate indexed operands yet.
- C++ subset can lower no-argument and single-argument `int` function calls, but it does not support multiple parameters, recursion, stack-frame locals, or C++ function-call expressions inside larger expressions.
- The WASM bridge currently uses a single runtime and JSON strings.
- The control-flow view is text and badge based; there is no full CFG graph yet.
- New / Open / Save, language switching, and theme controls are placeholders or limited.
- There is no desktop packaging or deployment target in this milestone.
