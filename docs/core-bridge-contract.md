# Core Bridge Contract

Phase 3B defines the JSON contract that the future C++/WASM bridge will expose to the TypeScript frontend. Phase 3C adds the `CoreAdapter` abstraction so the store and UI depend on the contract rather than on the TypeScript mock implementation.

The contract uses camelCase fields and transports 16-bit values as numbers. UI formatting such as `0020` belongs in the TypeScript UI layer through `formatHex16`.

## Core API

The bridge boundary will expose these operations:

```ts
assemble(sourceText: string): Promise<AssembleResultDto>
reset(): Promise<CometStateDto>
step(): Promise<StepResultDto>
run(maxSteps: number): Promise<CometStateDto>
getState(): Promise<CometStateDto>
```

`assemble(sourceText)` parses, assembles, initializes state, and returns diagnostics. `step()` executes one instruction from the currently loaded state. `reset()` restores the current assembled program to its initial state. `run(maxSteps)` must stop when finished, on error, or when `maxSteps` is reached. `getState()` returns the current state without mutating it.

The API is Promise-based even while the current mock implementation is synchronous. This keeps the UI stable when the core moves to WASM, a worker, or another asynchronous native bridge.

## CoreAdapter Architecture

`src/core/coreAdapter.ts` defines the only interface that core implementations must satisfy:

```ts
export interface CoreAdapter {
  assemble(sourceText: string): Promise<AssembleResultDto>;
  reset(): Promise<CometStateDto>;
  step(): Promise<StepResultDto>;
  run(maxSteps: number): Promise<CometStateDto>;
  getState(): Promise<CometStateDto>;
}
```

`src/core/coreBridge.ts` owns the active adapter:

```ts
getCoreAdapter(): CoreAdapter
setCoreAdapter(adapter: CoreAdapter): void
coreBridge.assemble(sourceText)
coreBridge.reset()
coreBridge.step()
coreBridge.run(maxSteps)
coreBridge.getState()
```

`setCoreAdapter` exists for tests and for the future WASM switchover. Runtime UI code should use `coreBridge` and should not import `MockCoreAdapter` or `mockCaslCore`.

## MockCoreAdapter

`src/core/mockCoreAdapter.ts` wraps the existing TypeScript mock core. It does not duplicate assembler or VM execution logic. It calls `mockCaslCore`, converts the resulting internal `CometState` through `src/core/coreDto.ts`, and returns DTOs.

The mock adapter keeps the current core state internally so `step()`, `reset()`, and `getState()` match the future bridge shape.

## WasmCoreAdapter Planned

`src/core/wasmCoreAdapter.ts` implements `CoreAdapter` as a Phase 4 stub. Every method currently throws `WASM core adapter is not implemented yet`.

The stub intentionally does not import Emscripten, load a `.wasm` file, or expose C++ internals. It only reserves the replacement point.

## UI Dependency Rule

The frontend store depends on `coreBridge` only. React components never call `mockCaslCore` directly. The current store converts DTOs into the UI `CometState` projection through `src/core/coreStateAdapter.ts`; Dirty source invalidation remains in the store because it is editor/session state, not VM execution state.

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

The frontend UI still reads the existing `CometState` shape. `src/core/coreStateAdapter.ts` is the only DTO-to-UI-state projection used by the store.

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

Phase 4A prepares a C ABI plus JSON string bridge. The JSON DTO contract in this document remains the source of truth for both TypeScript mock and C++/WASM output.

Planned adapter chain:

```text
C++ Core
-> WASM export
-> WasmCoreAdapter
-> Core DTO JSON or typed memory adapter
-> coreBridge.ts
-> frontend store actions
-> React / SVG UI
```

`coreBridge.ts` should remain the only frontend boundary. UI components should not care whether the core implementation is TypeScript mock or C++/WASM.

The Phase 4A C ABI exports are:

```cpp
const char* stugx_casl_create();
void stugx_casl_destroy();
const char* stugx_casl_assemble(const char* sourceText);
const char* stugx_casl_step();
const char* stugx_casl_reset();
const char* stugx_casl_run(int maxSteps);
const char* stugx_casl_get_state();
const char* stugx_casl_get_last_error();
```

`WasmCoreAdapter` will implement `CoreAdapter` by loading these exports, converting returned `char*` values to strings, parsing JSON into DTOs, and keeping `coreBridge.ts` unchanged.
