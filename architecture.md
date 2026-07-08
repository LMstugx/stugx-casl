# CASLStudioNext Architecture

## Clean-Room Boundary

CASLStudioNext is a new project. Old Avalonia, Qt, WCASL clone, QPainter circuit drawing, temporary wire path experiments, overlay experiments, and diff experiments are not code inputs.

The current sources are based only on the uploaded UI/UX and product requirements.

## Global State Principles

- VM state is not a global singleton.
- UI components do not mutate VM state directly.
- Parser, assembler, VM, SourceMap, and visual path resolution are separated.
- Module-level values are limited to immutable configuration, such as `circuitLayout` and `wirePaths`.
- Mutable application state is owned by the frontend store and updated only through actions.

Frontend application services will later be grouped under an `AppContext` / service registry:

- `CoreService`
- `ProjectService`
- `SettingsService`
- `LanguageService`
- `ThemeService`
- `LoggerService`

The current milestone implements the state ownership pattern with `src/store/useAppStore.tsx`.

## Singleton Rules

No Singleton class is currently used.

Allowed future Singleton use is limited to stateless or truly global services, such as settings or logging. VM state, parser state, assembler state, and visual state must not become Singletons.

If a future C++ Singleton is needed, it must use a thread-safe Meyers Singleton and delete copy/move operations.

## C++ RAII Memory Management

The C++ core follows RAII:

- No `malloc` / `free`.
- No owning raw `new` / `delete`.
- COMET memory is stored in `std::array<uint16_t, 65536>`.
- General registers are stored in `std::array<uint16_t, 8>`.
- Source maps, diagnostics, and parsed lines use `std::vector`.
- Labels use `std::unordered_map` for O(1) average lookup.
- APIs return values, const references, `std::optional`, or result structs.

No internal mutable memory reference is exposed across modules in the first milestone.

## Parser / Assembler / VM Layers

`CaslParser`

- Stateless parser object.
- Converts source text into parsed lines.
- Reports unsupported or malformed input as diagnostics.

`Assembler`

- Ordinary short-lived object.
- Uses two passes:
  - Pass 1 parses source lines, computes addresses, builds symbol table, and detects duplicate labels.
  - Pass 2 resolves operands, emits machine code, fills memory, and builds SourceMap.
- Target complexity is O(n) for n source lines.

`CometVm`

- Ordinary object owned by a service or caller.
- Owns its own `CometState`.
- Provides `load`, `step`, `run(maxSteps)`, `reset`, and `state`.
- `run(maxSteps)` stops with an error instead of looping forever.

## Frontend Store Rules

`src/store/useAppStore.tsx` is the only owner of the current `CometState` in the React app.

Components must use actions:

- `setSourceText`
- `assemble`
- `step`
- `reset`
- `clearOutput`

Component restrictions:

- `SourceEditor` edits source text only.
- `CometCircuitSvg` renders props only.
- `visualPathResolver` is a pure function.
- `circuitLayout` and `wirePaths` are immutable configuration.
- Memory UI displays a bounded window instead of 65536 rows.

## Visual Regression Testing

The COMET-II circuit is a primary product surface, so SVG regressions must be testable without relying only on manual inspection.

Phase 1 uses SVG DOM structure tests in `src/visual/__tests__/cometCircuitSvg.snapshot.test.tsx`. These tests render the SVG and verify:

- The root SVG exists.
- Key modules exist: PR, GR, Memory, MDR, ALU, FR, and SourceMap.
- Ready state activates only `pr-to-mar`.
- LD activates Memory -> MDR -> GR.
- ADDA activates GR/MDR -> ALU -> GR.
- ST activates GR -> MDR -> Memory.
- Finished has no active data path.
- SourceMap line, Memory row, and GR row active markers are present for the expected state.

Stable `data-testid`, `data-active`, and `data-path-id` attributes are allowed on SVG elements specifically for regression tests. These attributes are not state owners.

Later visual tests can use Playwright screenshot comparison:

- Render Ready, LD, ADDA, ST, and Finished states.
- Export PNG files to `artifacts/visual/`.
- Compare against a checked baseline.
- Fail when the difference exceeds a documented threshold.

## Typed EventBus

`src/app/eventBus.ts` defines a small typed EventBus. `src/app/events.ts` defines all allowed event names and payloads.

EventBus is for notification only:

- UI notifications.
- Logs and toast messages.
- Theme or language changes.
- Assemble completed / failed events.
- Step completed / runtime error events.
- Visual benchmark completed events.

EventBus is not for state ownership:

- It must not own `CometState`.
- It must not mutate VM memory.
- It must not replace the store.
- It must not carry large mutable state snapshots.
- It must not be used from the C++ core.

Every subscription returns an unsubscribe function. React components that subscribe in `useEffect` must return that unsubscribe function to avoid leaks.

Store vs EventBus:

- The store owns current source text, `CometState`, UI status, and actions.
- EventBus broadcasts typed facts that already happened.

Singleton vs EventBus:

- A Singleton is an object lifetime decision.
- EventBus is a message delivery mechanism.
- EventBus must not become a hidden Singleton state container.

## Memory And Trace Growth

The first mock core stores only the emitted memory cells and a memory window for UI rendering. The C++ core stores full COMET memory in a fixed-size `std::array<uint16_t, 65536>`.

Trace history is bounded. The current TypeScript mock keeps at most 1000 trace records. The C++ VM follows the same rule.

## String Handling Policy

C++:

- Parser internals may use `std::string_view` for line slices and tokens.
- `std::string_view` must not be stored in long-lived structures unless the backing source buffer lifetime is explicit.
- `ParsedLine`, `SourceMapEntry`, diagnostics, and symbol table keys own their strings.
- Opcode parsing accepts `std::string_view`, normalizes once, and returns an enum.
- Diagnostics store concise messages, not repeated full source buffers.
- Hex formatting is centralized in `formatHex16`.
- Do not scatter `sprintf`, repeated `stringstream`, or repeated `substr` allocation across parser and assembler code.

TypeScript:

- Hex formatting is centralized in `src/utils/format.ts`.
- JSX must not contain repeated expensive derived computations.
- `visualPathResolver` must stay a pure function.
- `circuitLayout` and `wirePaths` are immutable configuration.
- Large VM memory must not be rendered directly; UI receives a MemoryWindow.

## C++ Memory / Lifetime Policy

The C++ core owns resources through values and RAII containers:

- `CometVm` owns its `CometState`.
- `CometState.memory` is `std::array<uint16_t, 65536>`.
- `CometState.gr` is `std::array<uint16_t, 8>`.
- Parser and assembler return result values, not dangling references.
- No owning raw pointers are used in the current core.
- WASM export lifecycle must later be explicit through `createCore/destroyCore` or embind-managed object lifetime.

## Frontend Render Performance

Frontend rendering should keep subscriptions and props narrow:

- `SourceEditor` owns editor text changes but does not touch VM memory.
- `CometCircuitSvg` receives state as props and is memoized.
- Register and memory formatting is delegated to selectors/helpers.
- Memory tables render a bounded MemoryWindow.
- SourceMap lookup should later use an address map instead of repeated full scans for large programs.
- Path data is static; only active classes/attributes change.

Monaco source edits should not force expensive visual calculations. As the app grows, split store selectors should keep SVG, register, memory, and source map components subscribed only to the slices they need.

## Algorithm Complexity

Assembler design is two-pass:

- Pass 1 parses lines, computes addresses, builds the symbol table, checks duplicate labels, and starts SourceMap metadata.
- Pass 2 resolves operands, emits machine code, fills memory, and emits diagnostics.

Complexity targets:

- Assemble: O(n), where n is source lines.
- Label lookup: O(1) average with `std::unordered_map`.
- Memory query: O(1).
- Address to source line lookup: O(1) average with an address index, or O(log n) if later represented as sorted ranges.

Frontend derived data should follow the same principle:

- Memory label lookup should use an address map.
- SourceMap lookup should not linearly scan the full table during frequent render paths.

## Benchmark Plan

The first benchmark plan lives in `docs/performance.md`.

Initial targets:

- 1000 line CASL assemble under 100 ms.
- `step` under 1 ms.
- `visualPathResolver` under 1 ms.
- SVG render without visible lag for Ready, LD, ADDA, ST, and Finished.
- Future `run(10000)` should not freeze the UI.

These are goals for measurement and regression tracking. They are not a reason to add complex optimization before the implementation is correct and measurable.

## Safety Rules

- Parser errors produce diagnostics.
- Assembler checks unknown opcode, duplicate label, undefined label, invalid register, invalid address, and numeric range.
- VM checks illegal address and illegal opcode.
- Register indexes must be 0 through 7.
- Memory addresses must be 0x0000 through 0xFFFF.
- Run uses a max step limit.
- Frontend input is treated as untrusted; core validation is required.

## Testing Strategy

Frontend:

- Assembler output for the simple program.
- LD, ADDA, ST, and RET step behavior.
- Visual path resolution.
- SourceMap highlight behavior.
- Memory window generation.
- Register formatting.

C++:

- `AssembleSimpleProgram`
- `DuplicateLabel_ShouldError`
- `UndefinedLabel_ShouldError`
- `InvalidRegister_ShouldError`
- `StepLd_ShouldSetGR1`
- `StepAdda_ShouldSetFR`
- `StepStore_ShouldWriteMemory`
- `Run_ShouldStopAtMaxSteps`
- `MemoryAccess_OutOfRange_ShouldError`
