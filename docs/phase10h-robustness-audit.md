# Phase 10H: Robustness, Boundary, and Code Safety Audit

This audit checked boundary behavior and code safety after the Phase 10G release-candidate documentation pass. It did not add language features, CASL instructions, VM behavior, or Circuit Focus Mode visual changes.

## Audit Scope

- CASL assembler diagnostics and parser boundaries.
- COMET II VM runtime boundaries for PR, address wrap, shifts, stack, CALL, RET, reset, and re-assemble flows.
- C++ subset parser, semantic analyzer, and transpiler unsupported syntax boundaries.
- WASM adapter JSON parsing and empty-source diagnostics.
- Focus Mode derived selectors and empty-state rendering.
- C++ core safety patterns around memory ownership, numeric parsing, shift behavior, stack pointer arithmetic, and callDepth.
- TypeScript safety around nullable UI state, JSON parsing, and missing visual data.

## Boundary Tests Added

- `assemblerBoundary.test.ts` covers empty source, comments-only source, missing START / END, malformed operands, invalid numeric values, DS boundaries, lowercase / whitespace variants, inline comments, and duplicate labels.
- `vmBoundary.test.ts` covers PR outside program range, effective address wrap, shift count boundaries, arithmetic / logical wrap flags, SP wrap for PUSH / POP / CALL, reset callDepth clearing, and assemble-after-run state replacement.
- `cppTranspilerBoundary.test.ts` covers empty C++ source, unsupported types, pointers, arrays, references, complex function-call arguments, call-inside-binary-expression diagnostics, standalone call rejection, generated-label collision prevention, and nested loop break / continue target generation.
- `wasmCoreAdapter.test.ts` covers invalid JSON from the WASM bridge and empty source diagnostics when WASM artifacts are available.
- `uiRegressionBoundary.test.tsx` covers Focus Mode empty source state, Signal Probe and Call Stack without active instruction, Stack Preview near `0000` / `FFFF`, and dirty-source guidance.
- `CoreSmokeTest.cpp` adds matching C++ assembler boundary checks for required directives, malformed operands, and storage boundary diagnostics.

## Bugs Found

- Empty or comments-only CASL source could fail unclearly or leave directive requirements implicit.
- CASL source missing START or END did not have an explicit cross-core required-directive diagnostic.
- Empty C++ source could return `ok: false` with no diagnostic because parser and semantic diagnostics were both empty.
- A malformed top-level C++ function declaration could leave the parser at the same `}` token during recovery, causing an infinite recovery loop and possible JavaScript heap exhaustion.
- WASM JSON parse failure behavior was not directly testable without going through a real broken bridge response.

No critical runtime bug found.

## Bugs Fixed

- TS mock assembler now reports `CASL source must contain START directive` and `CASL source must contain END directive`.
- C++ assembler now reports the same required-directive diagnostics before pass1 / pass2.
- C++ subset semantic analysis now reports `C++ subset program must define int main().` for empty source.
- C++ parser top-level recovery now guarantees forward progress after malformed function declarations.
- WASM JSON parsing is exported as `parseWasmJson` so invalid bridge JSON remains covered without fabricating a broken WASM binary.

## Code Safety Checks

Commands used during the audit included targeted `git grep` checks for:

- `new `
- `delete`
- `malloc`
- `free`
- `reinterpret_cast`
- `const_cast`
- `string_view`
- `stoi`
- `<<`
- `>>`

The scan was reviewed manually. Operators such as `<<` and `>>` appear in expected stream output and controlled shift code; they are not removed because they are legitimate in this codebase.

## C++ Memory Safety Notes

- No raw `new`, raw `delete`, `malloc`, or `free` were found in the C++ core.
- The WASM bridge owns its runtime object through `std::unique_ptr`, which keeps ownership explicit and RAII-based.
- Numeric parsing uses `std::from_chars` instead of exception-throwing `stoi`.
- Shift execution uses widened integer values and explicit count handling so large counts do not rely on undefined behavior.
- Stack pointer arithmetic and effective addresses are masked through 16-bit behavior rather than signed overflow.
- No sanitizer build was added in this phase. A separate sanitizer or `/fsanitize=address` pass can be evaluated later if the Windows toolchain supports it cleanly.

## TypeScript Safety Notes

- WASM JSON parsing is wrapped in try / catch and includes the operation name, compact raw response, and bridge last-error text.
- UI boundary tests cover empty trace, no active instruction, callDepth 0, and SP edge rendering.
- Existing non-null assertions are mostly in tests or in instruction branches already guarded by opcode / operand checks.
- The audit did not introduce a lint configuration. Current available verification remains TypeScript build plus Vitest coverage.
- Visual-path missing-anchor behavior remains covered by existing routing and Focus Mode regression tests; this phase added empty-state UI coverage rather than changing rendering.

## WASM Bridge Notes

- Empty source through WASM should return diagnostics, not crash, once the WASM artifact is rebuilt from the updated C++ assembler.
- Invalid JSON from the bridge now has a direct parser regression test.
- Existing parity coverage continues to cover GR2 Addition, Shift Operations, Call Return, C++ Function Call, C++ Function Argument, and C++ Function Arguments when WASM artifacts are current.
- The bridge allocation/free path was inspected at the C++ source level; no manual `malloc` / `free` appears in the project-owned C++ code.

## Remaining Risks

- The C++ subset still intentionally rejects full C++, including arrays, pointers, references, stack-frame locals, recursion, forward declarations, and complex function-call expressions.
- UI checks are regression-oriented and do not replace a full screen-reader audit.
- WASM parity tests are skipped when artifacts are stale; full validation should run `pnpm build:wasm` before `pnpm test:wasm`.
- Extremely large source files are not performance-stress tested beyond parser and diagnostics behavior.
- Sanitizer coverage is not part of the normal Windows validation chain yet.

## Recommended Future Checks

- Add an optional sanitizer job if the local or CI C++ toolchain supports it without disrupting the normal Windows workflow.
- Add performance smoke tests for very large CASL and C++ inputs.
- Add fuzz-style parser tests for malformed operands and malformed C++ expressions.
- Add a deeper WASM bridge stress test for repeated create / destroy / assemble cycles.
- Add a future accessibility audit with real keyboard and screen-reader review after the teaching UI stabilizes further.
