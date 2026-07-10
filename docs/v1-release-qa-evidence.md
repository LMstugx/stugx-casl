# v1.0 Release QA Evidence

## 1. Release Candidate

- Current commit: `987bae7d26913d1662cd2f48d7df6cf32e147abb`
- Scope freeze doc: [v1-scope-freeze.md](v1-scope-freeze.md)
- QA date/time: `2026-07-10 17:39:14 +09:00`
- Operator: Codex local validation
- Visual baseline: `visual-rc-phase10l`
- FramePlan design baseline: `frameplan-design-baseline-phase11j`

## 2. Automated Validation Results

| Command | Result | Evidence |
| --- | --- | --- |
| `pnpm test` | PASS | 42 test files passed, 818 tests passed. |
| `pnpm build` | PASS | TypeScript build and Vite production build completed. |
| `pnpm test:e2e` | PASS | 38 Playwright tests passed. |
| `pnpm build:wasm` | PASS | WASM build completed; output written to `public/wasm/`. |
| `pnpm test:wasm` | PASS | 1 test file passed, 18 tests passed. |
| `pnpm test:e2e:wasm` | PASS | 13 WASM Playwright tests passed. |
| `pnpm visual:review` | PASS | 2 visual review tests passed for 1440x900 and 1920x1080. |
| `pnpm visual:capture` | PASS | Visual review gallery generated at `artifacts/visual-review/index.html`. |
| `cmake --build cpp-core/build` | PASS | `casl_core`, `CoreSmokeTest`, and `core_dump` built. |
| `ctest --test-dir cpp-core/build -C Debug --output-on-failure` | PASS | 64 C++ tests passed. |
| `powershell -ExecutionPolicy Bypass -File scripts/validate-all.ps1` | PASS | Full validation completed, including unit, build, WASM, E2E, C++ build, and CTest. |
| `powershell -ExecutionPolicy Bypass -File scripts/stress-check.ps1` | PASS | Stress corpus passed: 5 files / 61 tests, WASM adapter tests, C++ build, and 64 C++ tests. |

## 3. Manual QA Checklist Coverage Review

- Checklist exists: [manual-qa-checklist.md](manual-qa-checklist.md)
- Smoke test coverage: present.
- Focus Mode visual check coverage: present.
- Observation Modes coverage: CPU Flow, Registers / Stack, and Code / Machine are covered.
- Generated CASL coverage: present.
- Machine Code explanation coverage: present.
- Trace coverage: present.
- Signal Probe coverage: present.
- Stack Preview / Call Stack coverage: present.
- EAU / index addressing coverage: present.
- PUSH / POP coverage: present.
- CALL / stack-aware RET coverage: present.
- C++ Function Arguments coverage: present.
- FramePlan design preview coverage: covered through current limitation and FramePlan relation documentation references.
- Keyboard-only walkthrough coverage: present.
- Viewport checklist coverage: present.
- Known limitations coverage: present.

This phase reviewed checklist coverage from documentation. It did not manually click through the UI.

The manual QA checklist remains the source of truth for the later hands-on release-candidate walkthrough.

## 4. Visual Review Evidence

- Gallery path: `artifacts/visual-review/index.html`
- Gallery generation status: PASS

Key screenshot categories generated:

- `observation-cpu-flow`
- `observation-register-stack`
- `observation-code-machine`
- `index-addressing-circuit`
- `push-pop-stack-circuit`
- `call-return-call`
- `cpp-function-arguments-generated-casl`
- `machine-code-explanation`
- `stack-frame-view-preview`

Additional visual review screenshots were generated for LD / ADDA / ST, CALL return states, C++ function call views, shift operations, stack preview, and project overview. These files remain local artifacts under `artifacts/visual-review/` and must not be committed.

## 5. Known Limitations

Known limitations are frozen in [v1-scope-freeze.md](v1-scope-freeze.md). The major v1.0 exclusions remain:

- no full C++ compiler;
- no arrays, pointers, or references;
- no recursion;
- no stack-frame locals;
- no stack arguments;
- no real FP runtime state;
- no live stack-frame slot values;
- no Monaco semantic hover provider;
- no custom circuit editor;
- no production deployment.

## 6. Result

PASS: ready for v1.0-rc1 tagging.

No blockers were found during the automated release QA gate.
