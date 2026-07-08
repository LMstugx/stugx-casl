# Phase 5H Run Stop Trace Stabilization

Phase 5H keeps language lowering, CASL instruction semantics, Mock Core, C++ Core, WASM, and visual path semantics unchanged. The stabilization layer lives in the frontend store and UI controls.

## Run Design

The `Run` toolbar action starts from the current VM state and repeatedly calls `coreBridge.step()`. It does not use a separate VM execution path, so Step and Run share the same observable state updates.

Defaults:

- `maxSteps`: `1000`
- batch size: `20`
- browser yield: `setTimeout(0)` between batches

The batch boundary gives React and the browser event loop a chance to update the UI and handle Stop requests. Finite loop programs can reach `Finished`; runaway programs stop at `maxSteps`.

## Stop Design

`Stop` is enabled only while the projected UI state is `Running`.

When the user presses Stop:

- the store marks the current run as stop-requested
- no further batches are scheduled
- the state becomes `Stopped`
- Output records `Run stopped after N steps.`
- Reset is enabled
- Step and Run may continue from the manually stopped VM state

Manual stop is frontend control state. It is not a new COMET VM semantic.

## maxSteps

If `Run` executes `maxSteps` instructions before `RET`, the frontend stops the run and appends:

```text
Max steps reached. Possible infinite loop.
```

The state is represented as `Stopped` with a frontend `runStopReason` of `maxSteps`.

Button behavior after max-step stop:

- Run disabled
- Step disabled
- Stop disabled
- Reset enabled

Reset reloads the current assembled program and returns to `Ready`.

## Trace

Trace entries are generated from step results projected into `CometState`. Each entry contains:

- step index
- instruction address
- instruction kind
- source text or detail text
- PR after the step
- visual path kind
- changed register
- changed memory address
- run state

Trace is capped to the newest `1000` entries. The Trace tab is the detailed execution history; Output stays as a summary log.

## Output Summary Rules

Output records coarse-grained events:

- Assemble succeeded.
- Step executed.
- Run started.
- Run finished after N steps.
- Run stopped.
- Max steps reached.
- Runtime error.

Run does not append one Output line for every executed instruction.

## Mock / WASM Consistency

The frontend store drives both backends through `coreBridge` and `CoreAdapter`. Because Run is implemented as repeated adapter `step()` calls, Mock and WASM share the same button, max-step, Output, and Trace behavior.

## Current Limits

- Run speed is fixed.
- Stop interrupts between step calls and batches, not inside a single CASL instruction.
- `maxSteps` is not a core VM run state; it is frontend safety state.
- Trace is CASL-instruction based. C++ source correlation continues to use the generated CASL mapping.
