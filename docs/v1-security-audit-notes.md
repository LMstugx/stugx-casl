# v1 Security Audit Notes

## 1. Audit Blocker Summary

After the `v1.0-rc1` tag was created, the local self-check added `pnpm audit` to the release safety gate. That audit found dev dependency blockers in the Vite / Vitest toolchain:

- `vitest` below the patched range for the Vitest UI file-read / execution advisory.
- `vite` below the patched range for Windows path handling and optimized dependency path traversal advisories.
- transitive `esbuild` below the patched range for the development server request advisory.

The blocker affected dev and test tooling. It did not change emitted CASL, VM runtime semantics, assembler behavior, WASM core behavior, compiler lowering, or UI behavior.

## 2. Affected Packages

| Package | Before | After | Dependency Status |
| --- | --- | --- | --- |
| `vite` | `5.4.21` | `6.4.3` | direct dev dependency |
| `vitest` | `2.1.9` | `3.2.6` | direct dev dependency |
| `esbuild` | `0.21.5` | `0.25.12` | transitive dependency through Vite |

No `pnpm overrides` entry was added. Updating Vite and Vitest resolved the transitive `esbuild` version.

## 3. Validation Result

Phase 12D-SEC validation after the dependency patch:

- `pnpm install`: PASS.
- `pnpm audit`: PASS, no known vulnerabilities found.
- `pnpm test`: PASS, 42 test files / 822 tests after security-note document coverage.
- `pnpm build`: PASS.
- `pnpm test:e2e`: PASS, 38 Playwright tests.
- `pnpm build:wasm`: PASS.
- `pnpm test:wasm`: PASS, 1 file / 18 tests.
- `pnpm test:e2e:wasm`: PASS, 13 Playwright tests.
- `scripts/validate-all.ps1`: PASS, including C++ build and 64 CTest tests.
- `scripts/stress-check.ps1`: PASS, including stress corpus, WASM tests, C++ build, and 64 CTest tests.

## 4. Runtime Semantics

No runtime semantics changed in this patch. The update is limited to `package.json`, `pnpm-lock.yaml`, and release/security documentation. The CASL assembler, COMET VM, WASM bridge, mock core, C++ transpiler, emitted CASL, and UI runtime remain unchanged.

## 5. Final Tag Requirement

The original `v1.0-rc1` tag remains a historical release-candidate marker. Final `v1.0.0` must be based on the Phase 12D-SEC security-patched commit or a later commit that still passes the same validation gate. It must not be based directly on the original `v1.0-rc1` tag.
