# Production Build Contract

## Pipeline

`pnpm build` runs the platform dispatcher in `scripts/build-production.mjs`. Windows retains `scripts/build-production.ps1`; Linux x86_64 uses the pinned Cloudflare Pages path in `scripts/build-cloudflare-pages.sh`. Both clean `dist/`, build WASM, require non-empty glue and binary outputs, build Vite with the WASM backend, generate size/metadata/manifests, then verify the public artifact. Missing WASM, Mock selection in production, invalid base path, budget violation, or manifest mismatch exits nonzero. Production never silently substitutes `MockCoreAdapter`.

The Pages build pins the official Emscripten SDK `6.0.2` source tag and Kitware CMake `3.31.12` binary in the build-user cache. The CMake archive must match its fixed SHA-256 before extraction. The build does not depend on a checked-in binary or a machine-specific SDK path. Windows callers activate Emscripten normally or set `EMSDK` to the SDK directory.

## Configuration And Metadata

- `VITE_BASE_PATH`: absolute URL path ending in `/`; default `/`.
- `STUGX_BUILD_VERSION`: optional safe override; default `package.json` version `0.1.0`.
- `STUGX_BUILD_COMMIT`: CI-injected hexadecimal commit; fallback `local`.
- `VITE_CORE_BACKEND`: forced to `wasm` by the production script.

Metadata has no timestamp, username, hostname, branch path, token, or local directory. It is informational and cannot change document, diagnostic, persistence, or backend identity.

`package.json` is also the current-version source for `src/content/releases.ts`. The production `prebuild` hook runs `pnpm changelog:verify`, so a release registry/`CHANGELOG.md` mismatch fails before the WASM-first build. Changelog validation does not fetch GitHub or Cloudflare data and does not affect runtime backend selection.

## Artifacts And Maps

`dist/deployment-manifest.json` contains sorted relative files, byte counts, SHA-256 hashes, base, version, commit, backend, WASM pair, and source-map status. Runtime startup does not depend on it. Public source maps, fixtures, screenshots, coverage, environment files, and absolute machine paths are prohibited. `dist/` and `release/` are ignored.

## Size And Package

`docs/production-size-budget.json` is the reviewed hard budget based on the self-hosted Monaco build. `scripts/report-production-size.ps1` emits deterministic `dist/production-size-report.json`; an excess fails. The main-chunk warning is below the hard budget but is a documented initial-load risk.

`pnpm package:production` verifies `dist/`, creates a sorted local ZIP with fixed timestamps, and writes SHA-256. It includes only deployable files and performs no upload.

## Phase 18A Desktop Reference

The static-host pipeline remains unchanged. Tauri uses the separate `build:tauri:frontend` entry with `STUGX_RUNTIME=tauri`, relative asset base, the same WASM backend, and the same `dist/` directory. Desktop artifacts are embedded by Tauri and are never accepted as static deployment artifacts or committed to Git.

## Cloudflare Pages Reference

The Git-integrated Pages project builds the repository root with `pnpm build` and publishes `dist`. The build environment pins Node `22.16.0` and pnpm `11.7.0`; no token, Functions binding, database, KV, R2, analytics, or server runtime is required. `public/_headers` is copied into the artifact and freezes CSP, MIME hardening, no-cache metadata/WASM, and immutable hashed assets.
