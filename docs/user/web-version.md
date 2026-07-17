# Web Version

- Audience: Users of the public browser application
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Getting Started](getting-started.md), [Cloudflare Deployment](../developer/cloudflare-deployment.md)

The public Web application is <https://stugx-casl.pages.dev/>.

Cloudflare Pages serves a static Vite bundle. CASL assembly, C++ subset lowering, and COMET II execution run locally through the bundled WASM backend. Production does not silently fall back to Mock.

There is no application server, account system, analytics, telemetry, cloud source storage, or remote compilation API. Browser storage contains only the allowlisted preferences described in [Persistence](persistence.md).

The deployment uses local bundled assets, security headers, no public source maps, and no third-party runtime domains.
