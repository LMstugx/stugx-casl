# ADR 0009: Static Cloudflare Deployment

- Audience: Web deployment and security maintainers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Cloudflare Deployment](../developer/cloudflare-deployment.md), [Web Version](../user/web-version.md)

## Context

The application is fully client-side and does not require server data, accounts, or remote compilation.

## Decision

Publish the verified Vite/WASM bundle through Cloudflare Pages Git Integration from `master`. Use the free `pages.dev` host, static security/cache headers, and no Functions, Workers, storage products, analytics, or custom domain.

## Consequences

- Builds must be reproducible from the repository and fail without WASM.
- Public assets contain no source maps, secrets, or local paths.
- Remote smoke verifies MIME, headers, requests, console, backend, and core workflows.
- Rollback uses deployment history without force-pushing or rewriting Git.
