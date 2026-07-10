# v1.0 Scope Freeze

This document freezes the stugx.CASL v1.0 release scope. It is a documentation and QA gate only. It does not add features, change runtime behavior, change emitted CASL, or alter the VM, assembler, WASM bridge, mock core, or C++ transpiler.

## 1. v1.0 Positioning

stugx.CASL v1.0 is a CASL II / COMET II learning studio.

The core learning chain is:

```text
C++ subset
-> Generated CASL II
-> COMET II Machine Code
-> Register / Memory / Stack / Trace
-> Circuit Focus Mode
-> Guided Lessons
```

The release is meant to help students inspect translation and execution step by step. It is not a full C++ compiler, a complete CASL macro assembler, or a custom hardware simulator.

## 2. v1.0 Included Features

### CASL / COMET

- CASL direct execution.
- Assembler diagnostics.
- COMET VM step / run / reset.
- Registers `GR0`-`GR7`, `PR`, `SP`, and `FR`.
- Memory Viewer.
- Stack Preview.
- Trace.

### Instruction Coverage

- `LD`, `ST`, `LAD`.
- `ADDA`, `SUBA`, `ADDL`, `SUBL`.
- `AND`, `OR`, `XOR`.
- `CPA`, `CPL`.
- `JUMP`, `JZE`, `JNZ`, `JPL`, `JMI`, `JOV`.
- `NOP`.
- `SLA`, `SRA`, `SLL`, `SRL`.
- `PUSH`, `POP`.
- `CALL` and stack-aware `RET`.
- `DC`, `DS`, `START`, `END`.

### Machine / Visualization

- Generated CASL II Assembly.
- Machine Code tab.
- Opcode / operand explanation.
- Control Flow visualization.
- Circuit Focus Mode.
- Observation Modes:
  - CPU Flow.
  - Register / Stack.
  - Code / Machine.
- Effective Address Unit and index addressing visualization.
- Stack Preview and Call Stack.
- Signal Probe.
- FramePlan design preview.

### C++ Subset

- `int` variables.
- Assignment.
- `+` and `-`.
- `return`.
- `if` / `else`.
- `while`.
- `for`.
- `break` / `continue`.
- `i++`, `i--`, `+=`, `-=`.
- No-argument functions.
- One to three `int` register arguments.
- `GR0` return value convention.
- `GR1`-`GR3` argument convention.
- C++ function call lowering to CASL `CALL` / stack-aware `RET`.

### Learning Features

- Built-in demos.
- Guided Lessons.
- Study Mode checklist.
- Practice tasks.
- Learning guide.
- Visual review tooling.
- Manual QA checklist.

### Quality

- WASM backend.
- Mock backend.
- Boundary tests.
- Stress tests.
- Visual review.
- Release candidate docs.

## 3. v1.0 Excluded Features

v1.0 explicitly does not include:

- full C++ compiler support.
- arrays, pointers, or references.
- recursion.
- stack-frame locals.
- stack arguments.
- real FP runtime state.
- live stack-frame slot values.
- Monaco semantic hover provider.
- custom circuit editor.
- drag-and-drop circuit builder.
- full CASL macro system.
- `SVC` / `IN` / `OUT` macros.
- full screen-reader audit.
- true micro-cycle hardware simulation.
- formal performance benchmark.
- production deployment.

## 4. v1.1 Candidates

Possible v1.1 work should stay incremental:

- better diagnostics.
- more practice tasks.
- saved lesson progress.
- additional CASL polish.
- parser fuzzing extension.
- optional Monaco hover.
- small UX improvements.

## 5. v1.2 Candidates

Possible v1.2 work can start preparing deeper teaching examples:

- C++ array-like addressing.
- array -> index addressing visualization.
- simple stack-frame locals experiment.
- improved function call teaching views.

## 6. v2.0 Candidates

Possible v2.0 work can explore larger product directions:

- configurable circuit display.
- circuit templates.
- Signal Evolution graph.
- custom circuit sandbox foundation.

## 7. Release Baseline Commits / Tags

- Visual RC baseline tag: `visual-rc-phase10l`.
- FramePlan design baseline tag: `frameplan-design-baseline-phase11j`.
- Latest Phase 11J commit: `18c112eaaf888c7bf02f5862dd6718f85857b9f3`.
- Current release scope freeze commit: this Phase 12A commit after it is created.

## 8. Release QA Gate

Before v1.0 final, the release candidate should pass:

```powershell
pnpm test
pnpm build
pnpm test:e2e
pnpm build:wasm
pnpm test:wasm
pnpm test:e2e:wasm
cmake --build cpp-core/build
ctest --test-dir cpp-core/build -C Debug --output-on-failure
powershell -ExecutionPolicy Bypass -File scripts/validate-all.ps1
powershell -ExecutionPolicy Bypass -File scripts/stress-check.ps1
```

Manual gates:

- manual QA checklist.
- visual review.
- no visual-review screenshots or artifacts committed.
- no scope creep into v1.1 / v1.2 / v2.0 features.
