# Phase 5E Run Stop Trace UX

Phase 5E stabilizes execution controls for loop-heavy programs. It does not add new C++ syntax, change CASL VM instruction semantics, change while lowering, or alter the CoreAdapter contract.

## Run / Stop Design

The UI-level `Run` action executes the current assembled program in small batches of `step()` calls through `coreBridge`.

Default settings:

- `maxSteps`: `1000`
- batch size: `20`
- the run loop yields to the browser event loop between batches

This keeps the browser responsive and allows `Stop` to interrupt a running loop. The lower-level CoreAdapter `run(maxSteps)` remains available for adapter and parity tests, but the UI uses batched `step()` calls so trace can accumulate and controls can update.

## Button States

Before assemble:

- Run disabled
- Step disabled
- Stop disabled
- Reset disabled

Ready:

- Run enabled
- Step enabled
- Stop disabled
- Reset enabled

Running:

- Run disabled
- Step disabled
- Stop enabled
- Reset disabled

Finished:

- Run disabled
- Step disabled
- Stop disabled
- Reset enabled

Dirty:

- Run disabled
- Step disabled
- Reset disabled
- Assemble enabled

Stopped:

- Run disabled
- Step disabled
- Stop disabled
- Reset enabled

## Max Steps

Every UI run has a bounded step count. If the program does not finish before the limit, the UI state becomes `Stopped` and Output records:

```text
Max steps reached. Possible infinite loop.
```

The VM instruction semantics are not changed. Reset reloads the current assembled program and returns the UI to `Ready`.

## Trace

Trace records the latest execution events and is capped at `1000` entries.

Each trace event contains:

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

Run uses the same trace path as Step, but Output writes only summary entries to avoid flooding the UI.

## While Program Execution

C++ subset `while` programs are transpiled to CASL and then executed through the same Mock or WASM backend. A countdown sum loop such as:

```cpp
int main() {
    int i = 3;
    int sum = 0;
    while (i > 0) {
        sum = sum + i;
        i = i - 1;
    }
    return sum;
}
```

runs to `Finished` with `GR0 = 0006`.

## Mock / WASM Consistency

The UI still depends only on `coreBridge`. Mock and WASM adapters both support `step()` and `run(maxSteps)`. Browser E2E covers Run in Mock and WASM modes.

## Current Limits

- Run speed is fixed; there is no user-facing speed slider yet.
- Stop is checked between batched steps, not in the middle of a single instruction.
- Source-level stepping remains CASL-line driven through the existing C++ to CASL mapping.
- Max-steps state is represented as UI `Stopped`, not a VM instruction error.
