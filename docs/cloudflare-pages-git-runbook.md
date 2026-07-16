# Cloudflare Pages Git Runbook

## Project Setup

1. In Cloudflare Workers & Pages, create a Pages application with Connect to Git.
2. Authorize the Cloudflare GitHub App only for `LMstugx/stugx-casl`.
3. Select `master` as the production branch.
4. Select Vite, set build command `pnpm build`, output directory `dist`, and repository-root root directory.
5. Set plain build variables `NODE_VERSION=22.16.0` and `PNPM_VERSION=11.7.0`.
6. Do not add secrets, Functions, Workers, KV, R2, D1, analytics, or a custom domain.

Every push to `master` starts a production deployment. Preview branch builds may be disabled or limited; WIP branches are not production branches.

## Verification

The production host is <https://stugx-casl.pages.dev/>. Set it only in the current process, then run:

```powershell
$env:STUGX_DEPLOYED_BASE_URL = "https://stugx-casl.pages.dev/"
pnpm verify:deployed
pnpm test:e2e:deployed
```

The verifier requires HTTPS `pages.dev`, production WASM metadata, `application/wasm`, CSP/security headers, no-cache HTML/metadata/WASM, immutable hashed assets, no source maps, and no directory listing. Playwright covers query/hash startup, WASM Assemble/Step/Run/Reset, observation modes, three locales, persistence hydration, file action availability, clean-wire behavior, third-party requests, console/network failures, and 1280px overflow.

## Rollback

Use the Pages deployment history to select the previous successful production deployment and roll back through Cloudflare. Do not rewrite Git history or force-push. After rollback, rerun both deployed verification commands and confirm the WASM glue/binary pair comes from the same deployment manifest.

## Credential Policy

Never place a Cloudflare token, Account ID, OAuth code, GitHub token, auth cache, `.env`, or provider-generated deployment output in the repository, documentation, command history, or test fixture. Git Integration needs no repository credential file.
