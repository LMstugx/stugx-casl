# Build, Test, and Release

- Audience: Maintainers preparing verified builds
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Build Commands](../reference/build-commands.md), [Cloudflare Deployment](cloudflare-deployment.md)

`package.json` is the canonical version source. Node must satisfy the declared engine range, and pnpm must match the `packageManager` field.

The production pipeline builds and verifies WASM, compiles the Vite application, writes safe build metadata and a deployment manifest, checks size budgets, and rejects missing assets or public source maps.

Validation layers include Vitest, Playwright, CTest, WASM parity, production root/subpath smoke, visual review, stress checks, dependency audit, deterministic changelog verification, and canonical documentation verification.

Tauri builds reuse the production frontend in Tauri mode and run Cargo check/clippy before the Windows bundle. Generated `dist`, package, installer, checksum, screenshot, and coverage output is not committed.

Release tags and public artifacts require a separate release decision. Cloudflare Git Integration deploys `master`; no deployment token belongs in the repository.
