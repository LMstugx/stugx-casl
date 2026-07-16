# Static Host Deployment Contract

Build the root with `scripts/build-production.ps1 -BasePath /` and a subpath with `-BasePath /stugx-casl/`. Vite assets and the WASM loader use the same validated base. Base path never changes storage keys, locale, or document/source identity. This app has no client router; serve `index.html` at the configured base. Query strings and fragments are safe.

`pnpm test:e2e:production` and `pnpm test:e2e:production:subpath` rebuild and use `scripts/serve-production.mjs`, not Vite dev/preview. The server marks responses with `X-Stugx-Static-Production: 1`; Playwright rejects Mock backend, failed requests, HTTP errors, console/page errors, and horizontal overflow. Serve `.wasm` as `application/wasm` and never rewrite asset requests to HTML.

Cloudflare Pages uses the repository-root Git Integration build command `pnpm build` and publishes `dist`. `scripts/build-production.mjs` retains the Windows Phase 17A pipeline and dispatches Linux x86_64 builds to the pinned Emscripten Pages script. The provider-specific `_headers` contract remains a static artifact; no Functions or runtime API is introduced.

## Cache Policy

- hashed Vite JS/CSS/assets: `public, max-age=31536000, immutable`;
- `index.html`, metadata, manifest: `no-cache`;
- stable-name WASM/glue: `no-cache`, deployed atomically with matching web assets.

Manifest hashes verify the pair. No service worker, PWA, offline source cache, handle cache, or runtime cache exists.

## Release Procedure

In a clean checkout, build, verify, run both production smoke targets, optionally create the local ZIP/checksum, inspect the manifest, then publish `dist/` atomically only in a separately approved hosting phase. Phase 17A has no upload or credential.
