# Screenshots Guide

This guide lists useful screenshots for explaining stugx.CASL to a teacher, senior student, or study group. It is not a media kit; it is a checklist for showing the learning workflow clearly.

## 1. Project Overview

- Example: any demo
- View: left-side Demo Guide, open `Project Overview`
- Show: title, learning pipeline, supported C++ subset, current limitations
- Why it helps: a first-time viewer can understand the purpose before seeing execution.

## 2. C++ Addition -> Generated CASL

- Example: `C++: Addition`
- View: Source Editor and `Generated CASL`
- Show: `c = a + b;` and generated `LD`, `ADDA`, `ST`, `LD GR0,C`, `RET`
- Why it helps: shows the core C++ subset to CASL translation.

## 3. Machine Code Explanation

- Example: `C++: Addition`
- View: `Machine Code`
- Show: address `0020`, word `1010`, source `LD GR1,A`, and selected word explanation
- Why it helps: connects CASL source to opcode, register field, operand word, and resolved label.

## 4. For Sum Sugar -> Control Flow

- Example: `C++: For Sum Sugar`
- View: `Generated CASL` and Learning Flow
- Show: `FOR_BEGIN`, `FOR_BODY`, `FOR_CONTINUE`, `FOR_END`, and jump target hints
- Why it helps: demonstrates how natural loop syntax becomes labels and jumps.

## 5. Break Continue -> Trace

- Example: `C++: Break Continue`
- View: `Trace`
- Show: entries containing `FOR_CONTINUE_0` and `FOR_END_0`
- Why it helps: shows that `break` and `continue` are runtime PR movements, not hidden behavior.

## 6. Memory Viewer

- Example: `C++: While Sum` or `C++: Break Continue`
- View: Inspector `Memory`
- Show: labels such as `SUM`, `I`, generated constants, and last write highlighting
- Why it helps: students can inspect data-area changes after Step or Run.

## Practical Notes

- Use `pnpm dev` for default Mock backend demos.
- Use `pnpm build:wasm` and `pnpm dev:wasm` only when you specifically want to show the WASM backend.
- Keep Output as a summary and use Trace for detailed step history.
- For screenshots, use 1280x720 or wider so Source, Circuit, Inspector, and Output are visible together.
