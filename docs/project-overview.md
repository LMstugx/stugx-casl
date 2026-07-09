# stugx.CASL Project Overview

## Summary

stugx.CASL is a CASL II / COMET II learning studio. It helps students observe how source code becomes assembly, how assembly becomes machine code, and how machine code changes registers, memory, trace, control flow, and circuit state.

The tool supports two entry points:

- CASL II direct execution
- C++ subset transpilation into Generated CASL II Assembly

## Learning Problem

When CASL II / COMET II is taught with separate tools or static diagrams, students often struggle to connect these layers:

- source program
- CASL assembly
- machine-code words
- opcode and operand fields
- PR movement
- register and memory changes
- control flow and circuit behavior

stugx.CASL puts these layers into one study workflow.

## Learning Solution

A student can load an example, click `Assemble`, and then inspect:

- Generated CASL II Assembly
- COMET II Machine Code
- selected word explanation
- control-flow target labels and addresses
- register state
- Memory Viewer
- Trace
- COMET II circuit visualization

The same workflow works with the TypeScript Mock backend and the experimental WASM backend.

## Recommended Study Demos

1. `CASL: GR2 Addition`
   Direct CASL execution and memory write.

2. `CASL: Logic Operations`
   Bitwise `AND` / `OR` / `XOR`, ALU path, and result memory write.

3. `CASL: Logical Add Compare`
   Unsigned `ADDL`, `CPL`, and `JOV` fallthrough based on OF.

4. `CASL: Shift Operations`
   `SLL`, `SRL`, `SLA`, and `SRA` with GR / FR updates and a shifter circuit path.

5. `C++: Addition`
   C++ assignment and addition lowered to CASL and machine code.

6. `C++: If Else`
   Compare instruction, conditional jump, and branch target.

7. `C++: While Sum`
   Loop labels, loop-back jump, Trace, and Memory Viewer.

8. `C++: For Sum Sugar`
   Natural loop syntax lowered into labels, jumps, and increment code.

9. `C++: Break Continue`
   `break` and `continue` lowered to ordinary CASL `JUMP` instructions.

## Technical Notes

- C++20 core with parser, assembler, COMET VM, source map, and JSON dump tooling.
- TypeScript frontend with React, Vite, SVG, and Monaco Editor.
- CoreAdapter boundary supports Mock and experimental WASM backends.
- Golden parity tests keep TypeScript mock, C++ core, and WASM behavior aligned.
- Shift instruction paths use reusable visual path templates so the operand word is shown as a shift count, not as Memory data.
- Browser E2E tests cover the main study flows.

## Current Limitations

- C++ support is a teaching subset, not full C++.
- CASL II support is a teaching subset, not the full instruction set.
- Index addressing is supported for CASL address operands, but C++ subset code does not generate indexed operands yet.
- No-argument C++ `int` functions are supported, but parameters, recursion, stack-frame locals, arrays, pointers, classes, templates, strings, and floats are unsupported.
- Control Flow is shown as labels, badges, and target text rather than a full graph.

## Japanese Summary

stugx.CASL は、CASL II / COMET II の学習用 Studio です。C++ subset、CASL II、COMET II machine code、opcode explanation、memory、trace、control flow、circuit を一つの画面でつなぎ、プログラムがどのように機械の状態変化になるかを観察できます。
