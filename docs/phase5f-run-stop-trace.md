# Phase 5F Run Stop Trace Stabilization

Phase 5F keeps the language, assembler, VM, WASM bridge, and visual design unchanged. The work is limited to UI-level execution control around loop-heavy programs.

## Run

The toolbar `Run` action executes from the current VM state by repeatedly calling `coreBridge.step()`.

Defaults:

- `maxSteps`: `1000`
- batch size: `20`
- browser yield: between batches

This keeps the browser responsive while still allowing loop programs to complete. A finite `while` program can run to `Finished`; an accidental infinite loop stops at the limit.

## Stop

`Stop` is enabled only while the UI state is `Running`.

When pressed:

- the current batch finishes
- no later batches are scheduled
- the UI state becomes `Stopped`
- Output records `Run stopped after N steps.`
- Reset is enabled
- Step and Run can continue from the manually stopped VM state

Manual stop is tracked separately from max-step stop in the frontend store. It is not a VM semantic change.

## maxSteps

If the run reaches the configured step limit before `RET`, the UI state becomes `Stopped` and Output records:

```text
Max steps reached. Possible infinite loop.
```

This max-step stop is treated as a safety halt:

- Run disabled
- Step disabled
- Stop disabled
- Reset enabled

Reset reloads the current assembled program and returns the UI to `Ready`.

## Trace

Trace continues to be generated from `StepResult` / projected `CometState`.

Each trace event includes:

- step index
- instruction address
- instruction kind
- source text when available
- detail text
- PR after the step
- visual path kind
- changed register when available
- changed memory address when available
- run state

Trace is capped to the most recent `1000` events. Output records run summaries rather than one line per executed instruction.

## Button State Rules

Dirty / NotLoaded:

- Assemble enabled
- Run disabled
- Step disabled
- Reset disabled
- Stop disabled

Ready:

- Assemble enabled
- Run enabled
- Step enabled
- Reset enabled
- Stop disabled

Running:

- Assemble disabled
- Run disabled
- Step disabled
- Reset disabled
- Stop enabled

Manual Stopped:

- Assemble enabled
- Run enabled
- Step enabled
- Reset enabled
- Stop disabled

MaxSteps Stopped:

- Assemble enabled
- Run disabled
- Step disabled
- Reset enabled
- Stop disabled

Finished / Error:

- Assemble enabled
- Run disabled
- Step disabled
- Reset enabled
- Stop disabled

## Current Limits

- Run speed is fixed.
- Stop interrupts between batches, not in the middle of one CASL instruction.
- MaxSteps is represented as a frontend safety halt, not as a new VM run state.
- Trace is CASL-step based; C++ source correlation still uses the existing C++ to generated CASL mapping.
