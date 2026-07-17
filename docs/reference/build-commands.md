# Build Commands

- Audience: Contributors and release maintainers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Build, Test, and Release](../developer/build-test-release.md), [Repository Structure](../developer/repository-structure.md)

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start Vite with the development Mock backend |
| `pnpm dev:wasm` | Build/use the WASM development backend |
| `pnpm build:wasm` | Build local Emscripten glue and binary |
| `pnpm build` | Run the verified WASM-first production build |
| `pnpm test` | Run Vitest |
| `pnpm test:e2e` | Run Playwright application tests |
| `pnpm test:wasm` | Run WASM adapter tests |
| `pnpm test:e2e:wasm` | Run WASM browser smoke |
| `pnpm test:e2e:production` | Verify a root-path static production build |
| `pnpm test:e2e:production:subpath` | Verify configured subpath hosting |
| `pnpm test:e2e:deployed` | Smoke the configured public deployment |
| `pnpm changelog:generate` | Regenerate `CHANGELOG.md` |
| `pnpm changelog:verify` | Detect changelog drift |
| `pnpm docs:verify` | Verify canonical documentation |
| `pnpm visual:review` | Run visual review scenarios |
| `pnpm tauri:build` | Build the Windows Tauri demo |
| `pnpm tauri:verify` | Verify Tauri configuration and outputs |
| `pnpm audit` | Check JavaScript dependency advisories |

Full Windows validation scripts are documented in [Build, Test, and Release](../developer/build-test-release.md).
