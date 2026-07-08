# stugx.CASL Submission Overview

## 1. Project Summary

stugx.CASL is a CASL II / COMET II learning studio. It connects C++ subset source code, Generated CASL II Assembly, COMET II machine code, opcode explanations, control-flow targets, memory, trace, register state, and circuit visualization in one interface.

The current prototype supports both direct CASL execution and C++ subset transpilation. The default browser runtime uses a TypeScript mock backend, and an experimental WASM backend runs the C++20 core through the same CoreAdapter contract.

## 2. Problem

Students learning CASL II / COMET II often see separated views:

- source code in an editor
- assembly or object code in a separate tool
- register and memory changes in an emulator
- CPU data flow only in diagrams or slides

This makes it difficult to understand how a high-level statement becomes assembly, how assembly becomes machine words, and why the COMET state changes at runtime.

## 3. Solution

stugx.CASL presents those layers together. A student can load a demo, assemble it, and step or run while seeing:

- the original C++ subset or CASL source
- the generated CASL II assembly
- the COMET II machine-code words
- opcode and operand explanation for each word
- jump labels and target addresses
- Memory Viewer, Trace, registers, Source Map, and circuit paths

The goal is to make the relationship between abstraction layers inspectable, not hidden.

## 4. Main Learning Flow

```text
C++ source
-> Generated CASL II Assembly
-> COMET II Machine Code
-> Opcode explanation
-> Control Flow
-> Memory / Trace / Circuit
```

For CASL source, the flow starts at CASL II assembly and continues into the same machine code and runtime views.

## 5. Target Users

- University students learning CASL II / COMET II.
- Students learning the relationship between programming language constructs and assembly.
- Teachers who want a visual teaching material for registers, memory, machine code, and control flow.
- Programming contest or hackathon reviewers who need to understand how the project works quickly.

## 6. Differentiation

stugx.CASL is not just an editor, and it is not just an emulator.

It connects multiple abstraction layers in one screen:

- C++ subset statements map to generated CASL rows.
- CASL rows map to COMET II machine-code words.
- Machine-code words explain opcode, register field, operand address, and resolved labels.
- Control-flow hints show where jumps go.
- Trace and Memory Viewer show what actually happened during Step or Run.
- The circuit panel shows the current COMET data path.

This is the main educational value of the project.

## 7. Current Demo Scenarios

### CASL: GR2 Addition

Direct CASL execution. Shows `LD`, `ADDA`, `ST`, GR2 changes, and Memory[C].

### C++: Addition

Transpiles arithmetic from C++ subset to CASL. Shows Generated CASL, Machine Code, opcode explanation, and return value in GR0.

### C++: If Else

Shows `CPA`, `JZE`, and `JUMP` branch lowering from C++ if/else.

### C++: While Sum

Shows loop labels, conditional jumps, Trace, Memory Viewer, and max-step-safe Run.

### C++: For Sum Sugar

Shows natural loop syntax such as `i++` and `sum += i` lowered into normal CASL instructions.

### C++: Break Continue

Shows `break` and `continue` lowered into CASL `JUMP`, with `FOR_CONTINUE` and `FOR_END` targets visible in Generated CASL, Machine Code, and Trace.

## 8. Technical Highlights

- C++20 core with parser, assembler, COMET VM, source map, and JSON dump tooling.
- TypeScript CoreAdapter boundary with Mock and experimental WASM backends.
- Emscripten WASM build using a C ABI + JSON DTO bridge.
- Golden parity tests between TypeScript mock, C++ core, and WASM.
- Machine Code explanation derived from instruction encoding metadata.
- Control-flow selector derived from generated CASL, machine-code rows, and source mapping.
- Memory Viewer with bounded windows, range control, jump shortcuts, and highlighting.
- Trace with recent-step limits to avoid unbounded growth.
- Browser E2E tests for Mock and WASM backend smoke flows.

## 9. Current Limitations

- The C++ support is a teaching subset, not a full compiler.
- The CASL II support is a practical subset, not the full instruction set.
- Index addressing is not fully implemented.
- Arrays, pointers, references, functions, classes, templates, strings, floats, and iostreams are not supported.
- Complex boolean expressions such as `&&`, `||`, and `!` are not supported.
- The control-flow view is currently textual and badge-based, not a graph layout.
- The WASM bridge uses JSON strings and a single runtime instance.
- Desktop packaging and deployment are out of scope for the current milestone.

## 10. Future Work

- Expand the CASL II instruction set.
- Improve the C++ subset only where it helps CASL / COMET teaching.
- Add a compact CFG graph view for generated labels and jumps.
- Add bit-level machine-word visualization.
- Improve side-by-side C++ / CASL / machine-code highlighting.
- Harden the WASM bridge if performance becomes a bottleneck.
- Consider packaged distribution after the learning workflow is stable.

## Japanese Summary

stugx.CASL は、C++ subset、CASL II、COMET II 機械語、オペコード説明、制御フロー、メモリ、トレース、回路図を一つの画面でつなぐ学習用ツールです。

目的は、プログラムがどのようにアセンブリへ変換され、さらに機械語として実行され、レジスタやメモリ、PR、回路上のデータ経路に反映されるかを、学生が一連の流れとして観察できるようにすることです。
