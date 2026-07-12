# Security Policy

## Reporting A Vulnerability

Do not publish suspected vulnerabilities, credentials, private source content, or local file paths in a public issue. Use a private GitHub security advisory for the repository owner when available.

Include the affected version or commit, a concise reproduction, impact, and whether the report involves untrusted source text, browser file APIs, persistence, WASM, or the Tauri capability boundary. Do not include real credentials or unrelated personal data.

## Supported State

The current maintained state is the latest stable commit on the default branch. Historical phase tags are retained for compatibility evidence but do not receive separate security fixes.

## Security Boundaries

- No analytics, telemetry, login, cloud sync, or automatic source upload.
- Browser and Tauri builds do not persist source text, paths, file handles, diagnostics, or VM state.
- The Tauri demo has no filesystem, shell, HTTP, updater, process, or custom-command capability.
- Public build artifacts exclude source maps and local environment data.

Expected file-picker cancellation, malformed user source, and code diagnostics are application behavior, not security incidents unless they cross one of these boundaries.
