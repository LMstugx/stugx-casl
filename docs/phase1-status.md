# Phase 1 Status

## Completed Scope

Phase 1 is a working clean-room CASL II / COMET II learning IDE slice:

- Monaco source editor.
- Assemble, Step, and Reset loop.
- Register, Memory, SourceMap, Trace, Timeline, Output, and Status UI.
- SVG COMET-II circuit driven by `CometState`.
- TypeScript mock core for the current UI loop.
- C++20 core skeleton and independent smoke tests.
- Visual DOM regression tests for the SVG circuit.
- Typed EventBus for notification only.

## Current Real Data Flow

The UI now uses the current editor text, not a fixed template:

```text
SourceEditor current text
-> useAppStore.sourceText
-> assemble(sourceText)
-> CometState
-> Memory / Register / SourceMap / Circuit UI
```

`assemble(sourceText)` generates memory, symbols, SourceMap entries, diagnostics, and executable instruction metadata from the current source text.

`step()` executes the currently assembled `CometState`. It does not continue from a stale assembled program after the source has changed.

## Dirty State Rules

When source text changes:

- `isSourceDirty` becomes `true`.
- `assembleResult` is cleared.
- `cometState.assembled` becomes `false`.
- `cometState.runState` becomes `Dirty`.
- Step is disabled.
- Reset is disabled.
- The UI shows "Modified / Not assembled".

After a successful Assemble:

- `isSourceDirty` becomes `false`.
- `assembleResult` stores the new assembled state.
- `cometState` is replaced with the fresh assembled result.
- `runState` becomes `Ready`.
- Step and Reset are enabled.

After a failed Assemble:

- diagnostics are stored in the store and current `CometState`.
- `runState` becomes `Error`.
- Step remains disabled.

## VM Invalidation Rule

Editing source invalidates the old VM state. The old memory, SourceMap, program metadata, and current instruction are not allowed to continue executing.

Reset uses the current `assembleResult`. It does not reassemble or restore the default sample template.

## Verified Real Source Cases

`assemble_changed_constants`:

- Source can change constants such as `A DC 1` and `B DC 2`.
- Memory at the generated label addresses reflects the edited values.

Manual validation:

- Changing `A DC 10` to `A DC 100` produced `Memory[A] = 0064`.
- Step 1 loaded `GR1 = 0064`.

`execute_gr2_program`:

- Source can use `GR2` instead of `GR1`.
- Step 1 loads `GR2`.
- Step 2 adds into `GR2`.
- Step 3 stores from `GR2`.

Manual validation:

- `LD GR2,X` loaded `GR2 = 0003`.
- `GR1` stayed `0000`.

## Current Mock Parts

- The browser UI still calls the TypeScript mock core through `src/core/coreBridge.ts`.
- C++ core is built and tested independently, but not connected to the frontend.
- Run button remains disabled in Phase 1.
- New / Open / Save / Stop / language switch / theme switch are UI placeholders or disabled controls.
- No file system integration.
- No WASM bridge.
- No C++ subset transpiler.
- No full CASL II instruction set.

## Supported CASL Subset

- `START`
- `END`
- `DC`
- `DS`
- `LD`
- `ADDA`
- `ST`
- `RET`

## Key Regression Tests

Frontend:

- `assemble_changed_constants`
- `assemble_changed_labels`
- `execute_gr2_program`
- `source_edit_invalidates_vm`
- `assemble_invalid_source`
- Step LD / ADDA / ST / RET
- Visual path LD / ADDA / ST
- SVG visual DOM structure tests

C++:

- `CoreSmokeTest`
- assemble sample program
- duplicate label error
- undefined label error
- invalid register error
- step LD / ADDA / ST
- max step guard
- memory out-of-range guard

## Last Checkpoint Verification

Commands used in this environment:

```powershell
pnpm test
pnpm build
cmake --build cpp-core/build
ctest --test-dir cpp-core/build -C Debug --output-on-failure
```

Result:

- Frontend tests passed: 9 files, 32 tests.
- Frontend build passed.
- C++ build passed.
- C++ tests passed: 1/1.

## Next Stage Plan

1. Keep Phase 1 source loop tests as regression gates before UI/UX changes.
2. Improve diagnostics and editor markers without changing VM semantics.
3. Add Playwright UI regression tests for edited-source assemble/step.
4. Design the C++ / WASM bridge contract.
5. Replace the TypeScript mock core with the C++ WASM bridge behind `coreBridge.ts`.
