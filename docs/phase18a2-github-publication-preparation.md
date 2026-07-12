# Phase 18A.2 GitHub Repository Publication Preparation

## Scope

This phase prepares the stable Phase 18A.1 history for public GitHub publication. It does not publish executables, installers, deployment artifacts, credentials, or the separate Cloudflare Direct Upload WIP branch.

## Safety Audit

- The working tree and tracked/untracked inventory were reviewed before publication changes.
- High-confidence credential patterns were scanned across all local refs without printing candidate values.
- Tracked paths were checked for environment files, authentication caches, source maps, packages, installers, executables, visual artifacts, and Tauri target output.
- Machine-specific absolute paths in tracked documentation and visual-review tooling were replaced with repository-relative commands or `%USERPROFILE%` resolution.
- `.gitignore` explicitly excludes generated web, Tauri, installer, environment, credential-cache, source-map, and local review output.

No credential or generated deployment artifact was admitted to the publication commit.

The current tree contains no machine-specific absolute path. Historical commits still retain earlier local-path examples in README, phase documentation, and the visual-review helper. High-confidence credential scanning found no token, password, private key, OAuth credential, or Cloudflare credential. The user explicitly accepted the public exposure risk for those historical path examples, so publication may proceed without history rewriting or force push. See [github-public-history-risk-acceptance.md](github-public-history-risk-acceptance.md).

## Branch Policy

- `master` may only advance by fast-forward from the reviewed `phase18a-tauri-demo` history.
- `phase17b-cloudflare-wip` remains separate and is not part of the stable publication set.
- History is not squashed, rebased, or force-pushed.
- Existing tags are retained; this phase creates no release or tag.

## Repository Policy

The intended GitHub repository is public under the explicit history-risk acceptance. Issues may be enabled, Releases are not created, and no deployment token, repository secret, or automatic deployment workflow is added.

The repository currently grants no open-source license. `LICENSE` records Copyright © stugx. All rights reserved.

## Remote Gate

Remote replacement requires an authenticated GitHub CLI session, confirmed repository ownership, and an empty or safely fast-forwardable destination. The previous repository remote is preserved under a separate remote name. Unrelated remote history must never be merged or overwritten automatically.
