# Core Alignment

Phase 3A aligns the independent C++ core with the current TypeScript mock core. The frontend still calls `src/core/mockCaslCore.ts`; no WASM bridge is connected in this phase.

## Behavior Matrix

| Area | TypeScript mock | C++ core |
| --- | --- | --- |
| Source input | `assemble(sourceText)` from the store | `Assembler::assemble(source)` |
| Parser lifetime | short-lived pure functions | short-lived `CaslParser` object |
| Assembler design | two-pass scan | two-pass `Assembler::pass1` / `pass2` |
| Memory model | emitted cells in `Record<number, number>` | full `std::array<uint16_t, 65536>` |
| Registers | `number[8]` | `std::array<uint16_t, 8>` |
| Labels | uppercase symbol keys | uppercase symbol keys |
| SourceMap | source rows with line, address, words, label, instruction | `SourceMapEntry` rows with line, address, words, label, instruction |
| VM lifecycle | immutable state copy per step | `CometVm` owns ordinary value state |
| Trace limit | 1000 records | 1000 records |

## Supported Instructions

Both implementations currently support only the Phase 1 subset:

- `START`
- `END`
- `DC`
- `DS`
- `LD`
- `ADDA`
- `ST`
- `RET`

No other CASL II instruction is part of the current compatibility contract.

## Unsupported Instructions

Unsupported instructions include, but are not limited to:

- `SUBA`
- `ADDL`
- `SUBL`
- `AND`
- `OR`
- `XOR`
- `CPA`
- `CPL`
- `JUMP`
- `JPL`
- `JMI`
- `JNZ`
- `JZE`
- `PUSH`
- `POP`
- `CALL`
- `SVC`

These must continue to produce diagnostics until a later phase explicitly expands the supported subset.

## Memory Initialization

The program starts at address `0x0020`.

Assembled machine words are written at computed addresses from the two-pass scan. Unspecified C++ memory cells remain zero because `CometState.memory` is value-initialized as `std::array<uint16_t, 65536>{}`. The TypeScript mock stores emitted cells only and reads missing cells as zero.

`DS` reserves zero-initialized words. `DS 1` emits one zero word. `DS 0` emits no words and advances by zero.

## Machine Encoding

Current encodings match the TypeScript mock:

- `LD GRn,label`: `0x1000 | (n << 4)`, followed by the label address.
- `ADDA GRn,label`: `0x2000 | (n << 4)`, followed by the label address.
- `ST GRn,label`: `0x1100 | (n << 4)`, followed by the label address.
- `RET`: `0x8100`.

Labels are not hard-coded. The assembler computes label addresses from instruction and data sizes.

## VM Step Semantics

`CometVm::load(result)` copies the assembled state and instruction metadata into an ordinary VM object. The VM is not a Singleton and does not use global mutable state.

`step()` supports:

- `LD`: reads memory at operand address into `MDR`, writes `GRn`, advances `PR` by 2.
- `ADDA`: reads memory at operand address into `MDR`, adds it to `GRn`, writes the 16-bit result back to `GRn`, advances `PR` by 2.
- `ST`: writes `GRn` through `MDR` to the operand address, advances `PR` by 2.
- `RET`: sets `RunState::Finished` and does not jump to an arbitrary address.

C++ state records the latest execution facts used for future visual bridge mapping:

- `lastInstructionKind`
- `lastMemoryReadAddress`
- `lastMemoryWriteAddress`
- `lastRegisterWriteIndex`

## FR Rules

For `ADDA`, both implementations currently set:

- `z`: true when the 16-bit result is zero.
- `c`: true when the unsigned result exceeds `0xFFFF`.
- `n`: true when bit 15 of the 16-bit result is set.
- `o`: false in the Phase 1/Phase 3A compatibility contract.

The sample `10 + 20` produces `FR = 000`.

## Label And SourceMap Rules

Labels are normalized to uppercase for lookup. SourceMap entries keep the original label text and source row text.

SourceMap maps each emitted source row to:

- source line number
- address
- emitted machine words
- original source text
- optional label
- instruction kind

The C++ `SourceMap` also maintains an address index for O(1) average `lineForAddress` / `entryForAddress` lookup.

## Diagnostics

Both cores reject invalid input instead of crashing. C++ tests lock the following diagnostics:

- duplicate label
- undefined label
- invalid register
- unknown opcode
- invalid numeric literal
- memory address overflow

The exact message wording can differ between TypeScript and C++, but the error category must remain aligned.

## Current Known Differences

- The frontend still uses the TypeScript mock; the C++ core is independent.
- TypeScript stores sparse emitted memory, while C++ stores the complete 65536-word memory array.
- Dirty source invalidation is a frontend store responsibility and is not implemented inside C++ `CometVm`.
- The TypeScript UI derives register rows, memory rows, and visual state for React rendering. C++ currently exposes core execution state only.

## WASM Bridge Plan

The next bridge phase should:

1. Define a stable C++ export surface for `assemble`, `load`, `step`, `reset`, and state serialization.
2. Compile `cpp-core` with Emscripten.
3. Add a TypeScript adapter that maps C++ state into the existing `CometState` shape.
4. Keep `coreBridge.ts` as the frontend boundary so UI components do not know whether the core is mock or WASM.
5. Reuse the Phase 1 and Phase 3A regression tests to compare TypeScript mock and C++/WASM behavior before replacing the mock.
