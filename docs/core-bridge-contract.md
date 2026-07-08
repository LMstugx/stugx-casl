# Core Bridge Contract

Phase 3B defines the JSON contract that the future C++/WASM bridge will expose to the TypeScript frontend. The frontend still uses the TypeScript mock core in this phase.

The contract uses camelCase fields and transports 16-bit values as numbers. UI formatting such as `0020` belongs in the TypeScript UI layer through `formatHex16`.

## Core API

The bridge boundary will expose these operations:

```ts
assemble(sourceText: string): AssembleResultDto
reset(): CometStateDto
step(): StepResultDto
run(maxSteps: number): StepResultDto
getState(): CometStateDto
```

`assemble(sourceText)` parses, assembles, initializes state, and returns diagnostics. `step()` executes one instruction from the currently loaded state. `reset()` restores the current assembled program to its initial state. `run(maxSteps)` must stop when finished, on error, or when `maxSteps` is reached. `getState()` returns the current state without mutating it.

## DTO Types

```ts
type DiagnosticDto = {
  line: number;
  message: string;
  severity: "error" | "warning";
};

type SourceRowDto = {
  line: number;
  address: number;
  machineWords: number[];
  source: string;
  label: string | null;
  instruction: "START" | "END" | "DC" | "DS" | "LD" | "ADDA" | "ST" | "RET" | null;
  operandAddress: number | null;
  isCurrent: boolean;
};

type MemoryRowDto = {
  address: number;
  value: number;
  label: string | null;
  isCurrent: boolean;
  isChanged: boolean;
};

type CometStateDto = {
  runState: "Idle" | "Dirty" | "Ready" | "Running" | "Finished" | "Error";
  stepCount: number;
  pr: number;
  sp: number;
  ir0: number;
  ir1: number | null;
  mar: number;
  mdr: number;
  gr: number[];
  frOF: boolean;
  frSF: boolean;
  frZF: boolean;
  frCF: boolean;
  currentInstructionAddress: number | null;
  currentSourceLineIndex: number | null;
  currentInstructionText: string | null;
  lastInstructionKind: "LD" | "ADDA" | "ST" | "RET" | null;
  lastMemoryReadAddress: number | null;
  lastMemoryWriteAddress: number | null;
  lastRegisterWriteIndex: number | null;
  effectiveAddress: number | null;
  memoryWindow: MemoryRowDto[];
  sourceRows: SourceRowDto[];
  diagnostics: DiagnosticDto[];
};

type AssembleResultDto = {
  ok: boolean;
  state: CometStateDto;
  diagnostics: DiagnosticDto[];
};

type StepResultDto = {
  ok: boolean;
  state: CometStateDto;
  diagnostics: DiagnosticDto[];
};
```

## Field Rules

- `pr`, `sp`, `ir0`, `ir1`, `mar`, `mdr`, memory values, addresses, and register values are numbers.
- `ir0` is the currently latched instruction word.
- `ir1` is the second word for the current or last two-word instruction. It is `null` for one-word instructions such as `RET`.
- `gr` must contain exactly eight numbers.
- `frOF`, `frSF`, `frZF`, and `frCF` map to overflow, sign, zero, and carry.
- `currentSourceLineIndex` currently uses the 1-based source line number used by the parser and SourceMap.
- `effectiveAddress` is the resolved operand address for the last executed instruction, when present.
- `lastMemoryReadAddress` is set for `LD` and `ADDA`.
- `lastMemoryWriteAddress` is set for `ST`.
- `lastRegisterWriteIndex` is set for `LD` and `ADDA`.

## Memory Transfer Strategy

C++ owns the complete COMET memory as `std::array<uint16_t, 65536>`. The bridge should not transfer all 65536 words during normal UI updates.

Normal UI state returns a bounded `memoryWindow`. The current golden tests use address range `0x0020` through `0x002A`.

Full memory export is allowed only for explicit debugging, save files, or targeted tests.

## SourceMap Strategy

`sourceRows` is the bridge representation of SourceMap. Rows contain source line number, address, machine words, source text, optional label, instruction kind, optional operand address, and current-row state.

The frontend must treat `sourceRows` as read-only DTO data. It must not mutate core state through SourceMap rows.

## Golden Fixtures

The current golden fixtures live in `tests/golden/`:

- `simple.ready.json`
- `simple.step1.json`
- `simple.step2.json`
- `simple.step3.json`
- `simple.finished.json`
- `gr2.step1.json`

These fixtures are generated from the current TypeScript mock DTO adapter and are byte-level compatible with the C++ `core_dump` output for the same scenarios.

## TypeScript DTO Adapter

`src/core/coreDto.ts` maps the current TypeScript mock `CometState` into `CometStateDto`. This keeps parity testing separate from UI rendering state.

The frontend UI still reads the existing `CometState` shape. The DTO adapter is for bridge contract tests and future WASM integration.

## C++ JSON Dump

`cpp-core/tools/core_dump.cpp` emits a `CometStateDto` JSON document to stdout.

Example commands:

```powershell
cmake --build cpp-core/build
.\cpp-core\build\Debug\core_dump.exe --scenario simple-ready
.\cpp-core\build\Debug\core_dump.exe --scenario simple-step1
.\cpp-core\build\Debug\core_dump.exe --scenario simple-step2
.\cpp-core\build\Debug\core_dump.exe --scenario simple-step3
.\cpp-core\build\Debug\core_dump.exe --scenario simple-finished
.\cpp-core\build\Debug\core_dump.exe --scenario gr2-step1
```

Supported dump scenarios:

- `simple-ready`
- `simple-step1`
- `simple-step2`
- `simple-step3`
- `simple-finished`
- `gr2-step1`

The dump tool uses a small handwritten JSON writer to avoid adding a third-party JSON dependency in Phase 3B.

## WASM Bridge Plan

The WASM bridge should reuse this DTO contract without exposing C++ internal classes to React.

Planned adapter chain:

```text
C++ Core
-> WASM export
-> Core DTO JSON or typed memory adapter
-> coreBridge.ts
-> frontend store actions
-> React / SVG UI
```

`coreBridge.ts` should remain the only frontend boundary. UI components should not care whether the core implementation is TypeScript mock or C++/WASM.
