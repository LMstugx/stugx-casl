# Release Candidate Notes

These notes describe the current stable learning build after Phase 10I. They are meant for local review, teacher or senior-student demos, and future release-candidate checks.

## 1. Current Stable Capabilities

- CASL II direct execution through the teaching VM.
- C++ subset lowering to Generated CASL II Assembly.
- COMET II Machine Code view with opcode, register, index, operand, effective-address, stack, and CALL / RET explanation.
- Circuit Focus Mode with row-level register and memory anchors, bus lanes, Effective Address Unit, stack path, Signal Probe, Call Stack, Stack Preview, and lightweight signal-flow animation.
- Trace, Memory Viewer, Control Flow hints, Learning Flow, Guided Lesson, and Study Mode checklist.
- Mock backend and WASM backend using the same CoreAdapter surface.
- C++ core parity through CTest and WASM adapter tests.

## 2. Current Demos

CASL demos:

- `CASL: GR2 Addition`
- `CASL: Logic Operations`
- `CASL: Logical Add Compare`
- `CASL: Shift Operations`
- `CASL: Index Addressing`
- `CASL: Push Pop Stack`
- `CASL: Call Return`
- `CASL: Nested Call Return`

C++ demos:

- `C++: Addition`
- `C++: If Else`
- `C++: While Sum`
- `C++: For Sum`
- `C++: For Sum Sugar`
- `C++: Break Continue`
- `C++: Function Call`
- `C++: Function Argument`
- `C++: Function Arguments`

Recommended release-candidate demo path:

1. `CASL: GR2 Addition` for LD / ADDA / ST and circuit basics.
2. `CASL: Index Addressing` for EAU and effective address.
3. `CASL: Push Pop Stack` for SP and stack memory.
4. `CASL: Call Return` for CALL / RET and return edge explanation.
5. `C++: Function Arguments` for GR1-GR3 argument registers and GR0 return value.

## 3. Supported CASL Subset

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

Addressing and stack behavior:

- `adr,x` is supported for the current address-form instruction subset.
- `GR1` through `GR7` are valid index registers; `GR0` is rejected as an index register.
- Effective address is `(base address + GRx) & 0xFFFF`.
- `PUSH` stores the effective address value itself.
- `POP` reads `Memory[SP]` into a register.
- `CALL` stores the return address on stack and jumps to the effective target.
- `RET` performs a stack return when `callDepth > 0`; otherwise it finishes the program as a top-level `RET`.

## 4. Supported C++ Subset

Supported:

- `int main()`
- no-argument and up to three-argument `int` functions
- `GR0` return value convention
- `GR1`, `GR2`, `GR3` register argument convention
- `int` variables
- integer literals and identifiers
- assignment
- `+` and `-`
- `return`
- `if` / `else`
- `while`
- `for`
- comparisons
- `i++`, `i--`, `+=`, `-=`
- `break` / `continue`

Not supported:

- full C++
- more than three parameters
- recursion
- stack-frame locals
- stack arguments
- arrays, pointers, references
- classes, templates, overloads, function pointers
- function calls inside larger expressions such as `foo(1) + 2`
- standard library and I/O

## 5. Testing Status

The expected release-candidate validation set is:

```powershell
pnpm test
pnpm build
pnpm visual:review
pnpm visual:capture
pnpm test:e2e
pnpm build:wasm
pnpm test:wasm
pnpm test:e2e:wasm
cmake --build cpp-core/build
ctest --test-dir cpp-core/build -C Debug --output-on-failure
powershell -ExecutionPolicy Bypass -File scripts/validate-all.ps1
powershell -ExecutionPolicy Bypass -File scripts/stress-check.ps1
```

Phase 10I completed with all automated tests passing, plus deterministic malformed-input corpus tests, bounded large-source stress tests, and repeated WASM lifecycle checks. Visual review screenshots are generated locally under `artifacts/visual-review/` and are intentionally ignored by Git.

Manual QA should also follow `docs/manual-qa-checklist.md`, especially the keyboard walkthrough and the Focus Mode path checks for LD, ADDA, ST, index addressing, PUSH / POP, CALL / RET, and C++ function arguments.

## 6. Known Limitations

- The project is a learning studio, not a production compiler or complete CASL II toolchain.
- CASL support is broad enough for current lessons but not a full macro assembler.
- C++ function support uses static namespaced labels for locals and parameters.
- Stack-frame locals, stack arguments, recursion, arrays, pointers, and references are not implemented.
- Circuit Focus Mode is a fixed teaching schematic, not a custom circuit editor.
- Accessibility has basic keyboard and focus support, but no full screen-reader audit.
- Native `title` is used for ellipsis details; there is no custom tooltip system.
- No sanitizer pass is part of the normal Windows validation path yet; see `docs/phase10i-release-hardening-stress-audit.md`.

## 7. Next Recommended Phases

- Manual keyboard-only QA pass using `docs/manual-qa-checklist.md`.
- Release-candidate visual review using `pnpm visual:capture`.
- Future C++ stack-frame design and stack arguments; Phase 11A records the design-only stack-frame locals plan.
- Future function-call expressions inside larger expressions.
- Future custom circuit display controls or schematic/lab style toggle.
- Optional full accessibility audit after the learning UI stabilizes.
- Optional sanitizer or CI hardening pass in a known-good Visual Studio developer shell or CI image.
