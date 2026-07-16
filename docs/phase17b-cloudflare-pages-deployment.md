# Phase 17B Cloudflare Pages Deployment

## Scope

Phase 17B connects the public GitHub repository `LMstugx/stugx-casl` to a Cloudflare Pages Git Integration project. It publishes only the verified static `dist/` bundle on the free `pages.dev` host. It adds no custom domain, Pages Function, Worker, database, storage binding, analytics, telemetry, account feature, cloud source storage, parser behavior, lowering, emitted CASL, diagnostic, or VM semantic change.

## Build Contract

- Repository root: repository root.
- Production branch: `master`.
- Framework: Vite.
- Build command: `pnpm build`.
- Output directory: `dist`.
- Node: `22.16.0`.
- pnpm: `11.7.0` from `packageManager`.
- Emscripten: official pinned SDK `6.0.2` installed by the Linux Pages build script.
- CMake: official Kitware `3.31.12` binary with a pinned SHA-256, installed in the Pages user cache because the v3 build image does not provide CMake.

The build always compiles and verifies the WASM glue/binary pair before Vite. Production rejects Mock, missing WASM, source maps, prohibited files, invalid base paths, size overruns, and artifact hash mismatches.

## Host Policy

`public/_headers` applies a same-origin CSP with WebAssembly compilation, local Monaco workers, no third-party connections, clickjacking protection, MIME hardening, a restrictive permissions policy, and no COOP/COEP requirement. HTML, metadata, the deployment manifest, and stable-name WASM/glue are no-cache. Hashed Vite assets are immutable for one year.

The application has no history router, so `_redirects` is intentionally absent. Query and hash startup are covered by remote smoke tests without allowing asset requests to be rewritten through a custom rule.

## Security And Credentials

Cloudflare authentication and GitHub App authorization remain in the provider dashboards. No API token, Account ID, OAuth code, local auth cache, `.env`, Wrangler state, source map, generated bundle, Tauri output, or credential is committed. Git Integration is limited to `LMstugx/stugx-casl`; no direct-upload dependency is added.

## Deployment Evidence

The final project name, public URL, deployed commit, MIME/header/cache results, remote smoke result, and rollback status are recorded after the first successful production deployment. Until that evidence is added, Phase 17B remains in progress.
