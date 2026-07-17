# Security Model

- Audience: Security reviewers and maintainers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [SECURITY.md](../../SECURITY.md), [Persistence Architecture](persistence-architecture.md)

All source processing and VM execution occur locally. The application has no account system, telemetry, analytics, cloud source sync, remote compiler, or runtime third-party requests.

Browser file access is user-initiated and capability-limited. Paths and handles are not persisted. Tauri exposes no filesystem, shell, HTTP, updater, or custom Rust command capability.

Stored payloads and bridge DTOs are untrusted inputs. Their parsers use explicit fields, bounds, stable enums, and safe fallbacks. Source text is rendered by the editor, release text is rendered as React text, and runtime HTML injection is prohibited.

Public bundles omit source maps, credentials, local paths, test fixtures, and build outputs not required for deployment. CSP allows self-hosted scripts/assets and the minimum WebAssembly execution directive, without third-party domains.

Never commit tokens, authentication caches, environment files, certificates, signing keys, storage dumps, installers, or generated runtime artifacts.
