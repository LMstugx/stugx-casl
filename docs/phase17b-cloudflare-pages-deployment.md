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

- Cloudflare project: `stugx-casl`.
- Production branch: `master`, with automatic Git deployments enabled.
- Public URL: <https://stugx-casl.pages.dev/>.
- First successful production deployment: commit `41f3236ea12749e102358f5d6dea16d845cae2c1`.
- First immutable deployment URL: <https://2d3a164e.stugx-casl.pages.dev/>.
- Build: PASS after adding the pinned CMake bootstrap required by the Pages v3 image.
- Host verification: PASS for HTTP success, `application/wasm`, production WASM metadata, CSP, security headers, no-cache HTML/metadata/WASM, immutable hashed assets, source-map exclusion, and directory-listing exclusion.
- Remote Playwright smoke: PASS for WASM Assemble/Step/Run/Reset, observation modes, EN/JA/zh-CN, independent persistence hydration, file-action availability, query/hash startup, clean wires, 1280px overflow, console errors, failed requests, and third-party requests.
- Rollback: available through Pages deployment history; it does not require Git history changes or a force push.

The first attempt failed closed before deployment because the Pages image did not include CMake. No Mock backend or partial site was published. The current production commit is exposed by `build-metadata.json`; later documentation-only commits are deployed by the same `master` integration and must pass the same host and Playwright verification.

## Final Result

**PASS.** The public Web version is suitable for teacher and student access. There is no custom domain, Web Analytics, Pages Function, Worker, or cloud source storage.
