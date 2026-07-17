# Cloudflare Deployment

- Audience: Maintainers of the public Web deployment
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Web Version](../user/web-version.md), [Static Deployment ADR](../adr/0009-static-cloudflare-deployment.md)

The public site is <https://stugx-casl.pages.dev/>. Cloudflare Pages Git Integration watches the GitHub `master` branch and runs the repository's Pages build command from the repository root with `dist` as output.

The deployment is a static Vite/WASM application. It uses no Pages Functions, Workers, D1, KV, R2, server-side rendering, analytics, or custom domain.

`public/_headers` defines CSP and security/cache policy. Hashed assets are immutable; HTML, build metadata, deployment manifest, and stable WASM/glue follow the reviewed no-cache policy. WASM must be served as `application/wasm`.

Production verification checks the backend marker, asset requests, headers, cache behavior, console errors, source maps, third-party requests, and core Assemble/Step/Run/Reset behavior.

Rollback uses Cloudflare deployment history and does not rewrite Git history or mix WASM/glue versions.
