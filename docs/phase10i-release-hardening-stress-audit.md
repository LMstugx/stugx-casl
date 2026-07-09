# Phase 10I: Release Hardening and Stress Audit

This phase adds deterministic release-hardening coverage after the Phase 10H robustness audit. It does not add CASL instructions, C++ syntax, VM semantics, or Circuit Focus Mode visual changes.

## 1. Scope

- Deterministic malformed-input corpus tests for the C++ subset parser and semantic pipeline.
- Deterministic malformed-input corpus tests for the CASL assembler.
- Bounded large-source stress tests for many C++ declarations, functions, CASL labels, and near-boundary data allocation.
- Repeated WASM create / assemble / run / reset / dispose lifecycle checks.
- Store-level run / stop / reset stress regressions.
- Static C++ and TypeScript safety search update.
- Toolchain capability check for optional sanitizer work.
- Local stress-check script for targeted release hardening.

## 2. Parser Malformed Corpus

The C++ corpus covers:

- empty source, whitespace-only source, and comments-only source
- incomplete declarations such as `int`, `int main(`, `int main()`, and `int main() {`
- incomplete variable initializers, `if`, `while`, and `for` headers
- unsupported `for (;;)`, `break`, and `continue` outside a loop
- malformed calls such as `foo(1,)` and `foo(,1)`
- unsupported arrays, pointers, and broken parentheses
- missing and duplicate braces
- very long identifiers
- repeated invalid tokens
- malformed function declarations
- nested broken control blocks

The expected result is not a specific single diagnostic for every case. The release-hardening rule is:

- no hang
- no uncaught exception
- no memory exhaustion
- non-empty diagnostics for unsupported or malformed input

## 3. CASL Malformed Corpus

The CASL corpus covers:

- empty source and comments-only source
- missing `START` and missing `END`
- invalid mnemonic
- malformed register and invalid index register
- `GR0` as index register
- undefined and duplicate labels
- too many operands and missing operands
- malformed `DC` / `DS`
- huge `DS` memory overflow
- negative numeric values and over-16-bit numeric values
- trailing comma
- bad hex literal
- very long labels
- generated-style duplicate labels

Valid boundary cases also cover lower-case mnemonic behavior, mixed whitespace, inline comments, and a program whose data allocation reaches the memory boundary.

## 4. Large-Source Stress Coverage

The stress suite intentionally stays bounded so normal local validation remains practical.

C++ stress coverage:

- 200 local declarations
- 120 simple assignments
- 30 small functions
- parameter save lowering under larger function tables
- Generated CASL length bounded below a practical ceiling

CASL stress coverage:

- 400 labeled `NOP` rows
- source map validity for many labels
- safe assembly near `FFFF`
- near-boundary `DS` allocation

The goal is to catch accidental quadratic blowups, parser recovery loops, and memory-boundary mistakes without turning normal CI into a benchmark run.

## 5. WASM Lifecycle Stress

The WASM lifecycle stress tests run only when current WASM artifacts are present.

Coverage:

- repeated adapter create / assemble / step / dispose
- repeated invalid source assembly
- repeated Call Return run / reset cycles
- no stale `GR` or `callDepth` state across adapter instances
- reset clears `callDepth` and step count

The loop counts are intentionally modest: high enough to catch stale state and lifecycle mistakes, low enough to keep local validation usable.

## 6. Run / Stop / Reset Stress

Store-level stress coverage includes:

- repeated Assemble / Run / Reset cycles
- maxSteps stop followed by Reset and Step
- Stop during batched Run followed by loading another demo and re-assembling
- dirty source preventing Step and Run until re-assembled

These tests avoid arbitrary long waits and keep the same AppStoreProvider / MockCoreAdapter surface used by the app.

## 7. Sanitizer / Toolchain Check

The current ordinary PowerShell session reports:

- `cmake` is available.
- `cl` is not directly available in PATH.
- `clang++` is not directly available in PATH.

Because the compiler frontends are not directly available from the current shell, no sanitizer pass was added or run in this phase. The existing CMake / MSBuild path remains the supported local C++ validation path.

Future sanitizer work should use a deliberate Visual Studio developer shell or CI image rather than modifying the project build around the current interactive shell.

## 8. C++ Safety Findings

Static search covered:

- `new `
- `delete`
- `malloc`
- `free`
- `reinterpret_cast`
- `const_cast`
- `string_view`
- `stoi`
- shift operators `<<` / `>>`

Findings:

- No project-owned raw `new`, `delete`, `malloc`, or `free` were found.
- `std::string_view` use in the parser is localized to source-line tokenization and copied into owned strings where needed.
- Numeric parsing continues to avoid `stoi`.
- Shift operations remain explicitly guarded for large counts.
- Stream operators and bit shifts are present where expected.
- A Debug C++ test stack-pressure issue was found in the malformed operand boundary test, where many by-value `AssembleResult` temporaries in one test frame could overflow the stack before the assembler body executed. The test now assembles through a small helper so only one large result is live in that frame.

No production C++ memory-safety bug was found in this phase.

## 9. TypeScript Safety Findings

Static search covered:

- `any`
- non-null assertions
- `JSON.parse`
- unchecked casts
- empty catch
- TODO / FIXME near parser recovery, WASM, and routing

Findings:

- Existing non-null assertions are concentrated in tests and instruction branches that are already opcode-guarded.
- WASM JSON parsing remains centralized in `parseWasmJson`.
- Empty catches are limited to defensive error handling paths.
- No new TODO / FIXME risk was found around parser recovery or visual routing.

No new TypeScript safety bug was found in this phase.

## 10. Bugs Found / Fixed

No critical runtime bug was found in Phase 10I.

The malformed parser corpus confirmed the Phase 10H parser recovery fix remains stable.

The CASL malformed corpus found one parser diagnostics bug:

- `LD GR1,A,` was accepted because the tokenizer treated comma as whitespace and filtered the empty trailing operand.

Fix:

- TS mock parser and C++ assembler pre-scan now report `Malformed operand list near comma` for trailing or repeated comma separators.
- Normal `adr,x` syntax remains unchanged.
- C++ CoreSmokeTest now covers the same trailing-comma diagnostic.
- C++ CoreSmokeTest now avoids accumulating many large `AssembleResult` temporaries in the malformed operand boundary test frame.
- `scripts/stress-check.ps1` now checks native command exit codes so `ctest` or other external-command failures stop the script immediately.

## 11. Stress Check Script

Added:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/stress-check.ps1
```

The script runs:

- `pnpm build:wasm`
- selected stress/fuzz-style Vitest files
- `pnpm test:wasm`
- C++ build
- C++ `ctest`

It does not replace `scripts/validate-all.ps1`; it is a targeted hardening pass.

## 12. Remaining Risks

- No sanitizer pass is currently part of the normal Windows validation path.
- No random fuzzing is used; the corpus is deterministic.
- Large-source tests are bounded and do not measure production-scale performance.
- WASM lifecycle stress checks repeated create / destroy behavior, but they are not leak detectors.
- No full screen-reader audit has been completed.

## 13. Future Hardening Work

- Add an optional sanitizer job in a known-good Visual Studio developer shell or CI image.
- Add a deeper malformed-input corpus if new syntax is introduced.
- Add repeated browser-level run/stop stress if future async behavior becomes more complex.
- Add memory profiling for WASM only if lifecycle tests start exposing instability.
- Add a full accessibility audit after the teaching UI remains stable for a few more phases.
