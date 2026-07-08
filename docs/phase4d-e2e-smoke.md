# Phase 4D Browser E2E Smoke Tests

Phase 4D adds browser-level smoke coverage for the current core adapter boundary. It does not change CASL semantics, the default backend, VisualPathKind, or the UI layout.

## Tooling

The project uses Playwright with Chromium:

```powershell
pnpm exec playwright install chromium
```

Playwright artifacts are written under `artifacts/e2e-results`. Screenshots created by the WASM smoke test are written under `artifacts/e2e`.

## Test Scripts

Run both mock and WASM browser smoke tests:

```powershell
pnpm build:wasm
pnpm test:e2e
```

Run only the WASM browser smoke test:

```powershell
pnpm build:wasm
pnpm test:e2e:wasm
```

The normal unit test command does not run browser tests:

```powershell
pnpm test
```

## Backend Servers

Playwright starts Vite on separate ports:

- Mock backend: `http://127.0.0.1:5173`
- WASM backend: `http://127.0.0.1:5174`

The WASM server sets `VITE_CORE_BACKEND=wasm` for that process only. The app default remains `MockCoreAdapter`.

## WASM Smoke Coverage

`tests/e2e/wasm-smoke.spec.ts` verifies:

- Status bar shows `WASM Core`
- Default source exists
- Assemble reaches `Ready`
- PR is `0020`
- Current source row is `LD GR1,A`
- Step updates `GR1` to `000A`
- PR advances to `0022`
- Current source row becomes `ADDA GR1,B`
- Reset returns to `Ready`, PR `0020`, and GR1 `0000`
- Editing `A DC 10` to `A DC 100` marks the VM `Dirty`
- Step is disabled while dirty
- Re-assemble and Step updates `GR1` to `0064`
- Editing to the GR2 program updates `GR2` to `0064` and keeps `GR1` at `0000`

Successful screenshot outputs:

```text
artifacts/e2e/wasm-ready.png
artifacts/e2e/wasm-step1.png
artifacts/e2e/wasm-edited.png
```

## Mock Smoke Coverage

`tests/e2e/mock-smoke.spec.ts` verifies:

- Status bar shows `Mock Core`
- Assemble reaches `Ready`
- PR is `0020`
- Current source row is `LD GR1,A`
- Step updates `GR1` to `000A`
- PR advances to `0022`
- Current source row becomes `ADDA GR1,B`

## Stable Selectors

The smoke tests use `data-testid` selectors for buttons, backend status, run state, source editor, register rows, and current source rows. These selectors do not affect product behavior.

## Current Limits

- E2E requires local Playwright browser installation.
- WASM E2E requires generated `public/wasm/stugx_casl_core.js` and `.wasm`.
- Browser E2E is a smoke layer, not full UI regression coverage.
