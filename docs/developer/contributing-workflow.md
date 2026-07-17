# Contributing Workflow

- Audience: Contributors and reviewers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [CONTRIBUTING.md](../../CONTRIBUTING.md), [Build, Test, and Release](build-test-release.md)

Start from a clean, current branch. Keep changes scoped to one behavioral goal and preserve frozen diagnostic, file-lifecycle, persistence, and visualization contracts unless the task explicitly admits a versioned contract change.

Use existing architecture and types before adding abstractions. Add focused tests at the owning boundary, then run broader regression checks when shared compiler, VM, bridge, store, or UI behavior is touched.

For documentation:

1. update canonical guides when behavior changes
2. keep `Last reviewed version` aligned with `package.json`
3. use relative links inside the repository
4. run `pnpm docs:verify`
5. do not edit generated `CHANGELOG.md` by hand

Do not commit generated output, credentials, local paths, source maps, screenshots, installers, or dependency caches. Do not force-push shared stable history.
