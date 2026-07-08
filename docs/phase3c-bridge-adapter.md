# Phase 3C Bridge Adapter

Phase 3C adds a stable adapter boundary between the React store and the active core implementation. The frontend still uses the TypeScript mock core; WASM is not connected in this phase.

## Why the Adapter Is Async

`CoreAdapter` returns `Promise` values even though `MockCoreAdapter` can compute synchronously. The future C++/WASM bridge may need async initialization, worker messaging, or module loading. Keeping the boundary async now prevents UI and store rewrites later.

## Current Mock Adapter

`MockCoreAdapter` wraps `mockCaslCore` and delegates all assembler and VM behavior to it. The adapter owns the current mock state, calls `assemble`, `step`, `reset`, `run`, and `getState`, then converts results to DTOs through `coreDto.ts`.

It does not copy instruction execution logic and does not alter Phase 1 behavior.

## Planned WASM Adapter

`WasmCoreAdapter` is a stub that implements `CoreAdapter` and throws `WASM core adapter is not implemented yet`. Phase 4 can replace the active adapter with a real WASM-backed implementation without changing React components.

## Store and UI Boundaries

The store imports `coreBridge` and does not import `mockCaslCore`. React components only call store actions. `coreBridge` owns the active adapter and exposes the operations used by the store.

DTO-to-UI projection is centralized in `coreStateAdapter.ts`. This keeps React components on the existing `CometState` rendering shape while the bridge contract stays numeric and implementation-neutral.

## Dirty Invalidation

Dirty invalidation remains in the frontend store. Editing source text marks the VM projection as `Dirty`, clears the active assembled result, and disables step/run until a new successful assemble. This is UI/editor session state, not a core execution concern.

## Current Limits

- The active adapter is still `MockCoreAdapter`.
- `WasmCoreAdapter` is only a Phase 4 placeholder.
- Golden fixtures are unchanged from Phase 3B.
- The supported instruction subset remains `START`, `END`, `DC`, `DS`, `LD`, `ADDA`, `ST`, and `RET`.

