# Phase 17A Production Build And Deployment Readiness

## 1. Scope

Phase 17A establishes a local, repeatable production and static-host verification gate. It adds no product feature, public deployment, service worker, telemetry, cloud storage, parser behavior, lowering, emitted CASL, or VM semantic change.

## 2. Build Pipeline

The order is WASM build, output verification, Vite production build, size report, deployment manifest, and artifact verification. `pnpm build` is the complete pipeline. Production enforces WASM; Mock remains development/test-only. Metadata contains only version, safe commit or `local`, mode, WASM flag, and validated base.

## 3. WASM And Base Path

The browser loader resolves glue and binary through `import.meta.env.BASE_URL`; no host-root `/wasm` assumption remains. `/` and `/stugx-casl/` receive separate production smoke coverage. Stable-name WASM/glue use no-cache and must deploy atomically as a hash-verified pair.

WASM initialization failure is application-level: source diagnostics remain untouched, raw path/stack is not rendered, Reload is accessible in EN/JA/zh-CN, and there is no silent Mock fallback.

## 4. Static Verification

The dedicated server is not Vite dev/preview. Playwright verifies the static marker, WASM backend, restored source/preferences/lesson progress, Assemble/Step/Run/Reset, locale, New/Open/Save availability, query/hash startup, request/console/page errors, and 1280px overflow.

## 5. Capability And Failure Policy

WebAssembly is required. File System Access and localStorage remain optional with existing honest fallbacks. A missing required capability or unexpected render exception produces a safe top-level page, not a code diagnostic. Expected cancellation is not an error.

## 6. Cache, Headers, And Source Maps

Hashed Vite assets are immutable; HTML/metadata and current stable-name WASM/glue are no-cache. CSP permits same-origin resources, WebAssembly compilation, Monaco blob workers, and runtime styles, with no third-party origin. COOP/COEP are not required. Public source maps are disabled and `.map` files fail verification.

## 7. Size Findings

After replacing Monaco's production CDN loader with the bundled local editor, measured output is approximately 2.86 MB initial JS (749 KB gzip), 3.11 MB total JS including the worker/dynamic language chunk, 144 KB CSS, 174 KB WASM, and 3.43 MB total before final manifest growth. All are within an evidence-based budget with limited headroom. The editor is the dominant initial-load risk; splitting or a smaller editor is deferred until deployment measurements justify a product-level change.

## 8. Artifact, Package, And CI

The deployment manifest records sorted relative files, hashes, sizes, required files, base, backend, and map policy. The local package uses fixed ZIP timestamps and emits SHA-256. Neither output is committed or uploaded.

CI should use Node 20-24 and pnpm 11 with frozen lockfile, then run audit, unit tests, production build/verify, WASM tests, E2E including root/subpath production smoke, C++/CTest, stress, and secret/artifact scans. Current WASM wrappers require Windows PowerShell. No deploy token or upload step is allowed.

## 9. Security And Privacy

Bundle and application logging exclude source, storage payloads, handles, target IDs, diagnostic dumps, VM memory, paths, credentials, and raw exceptions. No network endpoint, tracking, analytics, or telemetry was added. Phase 14-16 baselines remain immutable.

## 10. Acceptable Limitations

- The self-hosted Monaco editor makes the main JS large and triggers a Vite warning, but remains within the hard budget.
- WASM/glue names require no-cache plus atomic deployment.
- Metadata uses `local` when CI does not inject a commit.
- No offline mode, service worker, provider integration, desktop package, or public hosting exists.
- Confirmed file writes remain secure-context/browser dependent.

## 11. Final Result

**PASS.** The complete Phase 17A validation matrix succeeded. Production is ready for a separately approved static-host rehearsal; no public deployment was performed.

## 12. Validation And Findings

- `pnpm test`: 73 files / 1,349 tests passed.
- `pnpm build`, explicit WASM build/test, 58 full E2E tests, and 13 WASM E2E tests passed.
- `pnpm visual:review` and `pnpm visual:capture`: three 1280/1440/1920 galleries passed.
- `scripts/validate-all.ps1`: passed, including all 65 C++ tests.
- `scripts/stress-check.ps1`: 61 stress tests, 21 WASM adapter tests, and 65 C++ tests passed.
- root and `/stugx-casl/` static production smoke passed with WASM, no failed request, no console/page error, and no 1280px horizontal overflow.
- build verification failed as required when the WASM binary was temporarily absent, then passed after restoration.
- local deployment ZIP/checksum generation and prohibited-entry inspection passed.
- `pnpm audit`: no known vulnerabilities.

The audit found and fixed three blockers: a Monaco jsDelivr runtime dependency, Vite dev rejection of native imports from `public/wasm`, and missing bundled-Node PATH initialization in `stress-check.ps1`. Monaco is now self-hosted, development glue has a narrow static middleware, and stress setup matches the repeatable validation environment.

## 13. Phase 17B Recommendation

Perform a provider-neutral release-candidate rehearsal: choose a static host, translate the frozen header/cache contract, stage an atomic non-public upload, and verify base/cache behavior without telemetry or source persistence.
