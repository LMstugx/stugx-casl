# Production Build Contract

## Pipeline

`pnpm build` runs `scripts/build-production.ps1`: clean the repository `dist/`, build WASM, require non-empty glue and binary outputs, build Vite with the WASM backend, generate size/metadata/manifests, then verify the public artifact. Missing WASM, Mock selection in production, invalid base path, budget violation, or manifest mismatch exits nonzero. Production never silently substitutes `MockCoreAdapter`.

## Configuration And Metadata

- `VITE_BASE_PATH`: absolute URL path ending in `/`; default `/`.
- `STUGX_BUILD_VERSION`: optional safe override; default `package.json` version `0.1.0`.
- `STUGX_BUILD_COMMIT`: CI-injected hexadecimal commit; fallback `local`.
- `VITE_CORE_BACKEND`: forced to `wasm` by the production script.

Metadata has no timestamp, username, hostname, branch path, token, or local directory. It is informational and cannot change document, diagnostic, persistence, or backend identity.

## Artifacts And Maps

`dist/deployment-manifest.json` contains sorted relative files, byte counts, SHA-256 hashes, base, version, commit, backend, WASM pair, and source-map status. Runtime startup does not depend on it. Public source maps, fixtures, screenshots, coverage, environment files, and absolute machine paths are prohibited. `dist/` and `release/` are ignored.

## Size And Package

`docs/production-size-budget.json` is the reviewed hard budget based on the self-hosted Monaco build. `scripts/report-production-size.ps1` emits deterministic `dist/production-size-report.json`; an excess fails. The main-chunk warning is below the hard budget but is a documented initial-load risk.

`pnpm package:production` verifies `dist/`, creates a sorted local ZIP with fixed timestamps, and writes SHA-256. It includes only deployable files and performs no upload.
