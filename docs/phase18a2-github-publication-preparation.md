# Phase 18A.2 GitHub Repository Publication Preparation

## Scope

This phase prepares the stable Phase 18A.1 history for private GitHub publication. It does not publish executables, installers, deployment artifacts, credentials, or the separate Cloudflare Direct Upload WIP branch.

## Safety Audit

- The working tree and tracked/untracked inventory were reviewed before publication changes.
- High-confidence credential patterns were scanned across all local refs without printing candidate values.
- Tracked paths were checked for environment files, authentication caches, source maps, packages, installers, executables, visual artifacts, and Tauri target output.
- Machine-specific absolute paths in tracked documentation and visual-review tooling were replaced with repository-relative commands or `%USERPROFILE%` resolution.
- `.gitignore` explicitly excludes generated web, Tauri, installer, environment, credential-cache, source-map, and local review output.

No credential or generated deployment artifact was admitted to the publication commit.

The current tree contains no machine-specific absolute path. Historical commits still retain earlier local-path examples in README, phase documentation, and the visual-review helper. Preserving the stable commit and tag history means those old blobs are intentionally not rewritten in this phase. The first GitHub repository must therefore remain private; changing visibility to public requires a separate, explicit decision about history rewriting and tag migration.

## Branch Policy

- `master` may only advance by fast-forward from the reviewed `phase18a-tauri-demo` history.
- `phase17b-cloudflare-wip` remains separate and is not part of the stable publication set.
- History is not squashed, rebased, or force-pushed.
- Existing tags are retained; this phase creates no release or tag.

## Repository Policy

The intended GitHub repository is private and must remain private under the current history policy. Issues may be enabled, Releases are not created, and no deployment token, repository secret, or automatic deployment workflow is added.

The repository currently grants no open-source license. `LICENSE` records Copyright © stugx. All rights reserved.

## Remote Gate

Remote creation or replacement requires an authenticated GitHub CLI session and confirmed repository ownership. An existing unknown remote must never be overwritten automatically. If `gh` is unavailable or unauthenticated, local preparation can complete but publication remains blocked until the user runs `gh auth login` in a trusted local terminal.
