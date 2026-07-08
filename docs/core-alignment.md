# Core Alignment

Phase 5A keeps the TypeScript mock core, C++ core, and experimental WASM backend aligned for the current minimal practical CASL II subset. The frontend still depends on `coreBridge` / `CoreAdapter`; it does not call `mockCaslCore` or WASM exports directly.

## Behavior Matrix

| Area | TypeScript mock | C++ core / WASM |
| --- | --- | --- |
| Source input | `assemble(sourceText)` from the store | `Assembler::assemble(source)` through C++ or WASM JSON bridge |
| Parser lifetime | short-lived pure functions | short-lived parser/assembler objects |
| Assembler design | two-pass scan | two-pass `Assembler::pass1` / `pass2` |
| Memory model | emitted cells in `Record<number, number>` | full `std::array<uint16_t, 65536>` |
| Registers | `number[8]` | `std::array<uint16_t, 8>` |
| Labels | uppercase symbol keys | uppercase symbol keys |
| SourceMap | source rows with line, address, words, label, instruction | `SourceMapEntry` rows with line, address, words, label, instruction |
| VM lifecycle | immutable state copy per step | `CometVm` owns ordinary value state |
| Trace limit | 1000 records | 1000 records |

## Supported Instructions

Both implementations support this Phase 5A subset:

- `START`
- `END`
- `DC`
- `DS`
- `LD`
- `LAD`
- `ADDA`
- `SUBA`
- `CPA`
- `ST`
- `JUMP`
- `JZE`
- `JNZ`
- `JPL`
- `JMI`
- `RET`

No other CASL II instruction is part of the current compatibility contract.

## Unsupported Instructions

Unsupported instructions include, but are not limited to:

- `ADDL`
- `SUBL`
- `AND`
- `OR`
- `XOR`
- `CPL`
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

Current encodings match the TypeScript mock, C++ core, core dump JSON, and WASM bridge:

| Instruction | Encoding |
| --- | --- |
| `LD GRn,addr` | `0x1000 | (n << 4)`, followed by address |
| `ST GRn,addr` | `0x1100 | (n << 4)`, followed by address |
| `LAD GRn,addr` | `0x1200 | (n << 4)`, followed by address |
| `ADDA GRn,addr` | `0x2000 | (n << 4)`, followed by address |
| `SUBA GRn,addr` | `0x2100 | (n << 4)`, followed by address |
| `CPA GRn,addr` | `0x4000 | (n << 4)`, followed by address |
| `JMI addr` | `0x6100`, followed by address |
| `JNZ addr` | `0x6200`, followed by address |
| `JZE addr` | `0x6300`, followed by address |
| `JUMP addr` | `0x6400`, followed by address |
| `JPL addr` | `0x6500`, followed by address |
| `RET` | `0x8100` |

Labels are not hard-coded. The assembler computes label addresses from instruction and data sizes.

## VM Step Semantics

`CometVm::load(result)` copies the assembled state and instruction metadata into an ordinary VM object. The VM is not a Singleton and does not use global mutable state.

`step()` supports:

- `LD`: reads memory at operand address into `MDR`, writes `GRn`, advances `PR` by 2.
- `LAD`: writes the resolved effective address into `GRn`, advances `PR` by 2, and does not read memory.
- `ADDA`: reads memory at operand address, adds it to `GRn`, writes the 16-bit result back to `GRn`, updates FR, and advances `PR` by 2.
- `SUBA`: reads memory at operand address, subtracts it from `GRn`, writes the 16-bit result back to `GRn`, updates FR, and advances `PR` by 2.
- `CPA`: compares signed `GRn` with signed memory at operand address, updates FR, does not modify `GRn`, and advances `PR` by 2.
- `ST`: writes `GRn` through `MDR` to the operand address and advances `PR` by 2.
- `JUMP`: sets `PR` to the resolved address.
- `JZE`: sets `PR` to the resolved address when ZF is true; otherwise advances by 2.
- `JNZ`: sets `PR` to the resolved address when ZF is false; otherwise advances by 2.
- `JPL`: sets `PR` to the resolved address when SF and ZF are both false; otherwise advances by 2.
- `JMI`: sets `PR` to the resolved address when SF is true; otherwise advances by 2.
- `RET`: sets `RunState::Finished` and does not jump to an arbitrary address.

C++ state records the latest execution facts used for visual bridge mapping:

- `lastInstructionKind`
- `lastMemoryReadAddress`
- `lastMemoryWriteAddress`
- `lastRegisterWriteIndex`
- `effectiveAddress` through instruction metadata in the JSON DTO

## FR Rules

`ADDA` and `SUBA` update:

- `ZF`: true when the 16-bit result is zero.
- `SF`: true when bit 15 of the 16-bit result is set.
- `CF`: true when the unsigned arithmetic result is outside `0x0000..0xFFFF`.
- `OF`: true when signed 16-bit addition/subtraction overflows.

`CPA` updates:

- `ZF`: true when signed `GRn` equals signed memory operand.
- `SF`: true when signed `GRn` is less than signed memory operand.
- `CF`: false.
- `OF`: false.

`LAD`, `JUMP`, conditional jumps, `ST`, and `RET` do not update FR in the Phase 5A contract.

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

Both cores reject invalid input instead of crashing. C++ and TypeScript tests cover:

- duplicate label
- undefined label
- invalid register
- unknown opcode
- invalid numeric literal
- memory address overflow
- invalid operand shape for register/address and jump instructions

The exact message wording can differ between TypeScript and C++, but the error category must remain aligned.

## Current Known Differences

- Default frontend runtime is still `MockCoreAdapter`; WASM is opt-in with `pnpm dev:wasm`.
- TypeScript stores sparse emitted memory, while C++ stores the complete 65536-word memory array.
- Dirty source invalidation is a frontend store responsibility and is not implemented inside C++ `CometVm`.
- The TypeScript UI derives register rows, memory rows, and visual state for React rendering. C++/WASM exposes core DTO state through the bridge.

## WASM Bridge Status

The WASM backend implements the same JSON DTO contract through a C ABI plus JSON string bridge. Phase 5A keeps the generated WASM artifacts out of Git and verifies parity through:

- TypeScript golden parity tests.
- C++ `core_dump` golden parity tests.
- WASM adapter golden parity tests when local WASM artifacts are present.
