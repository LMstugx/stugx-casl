# Tauri Security Capability Contract

## Scope

Phase 18A wraps the existing local Vite application in one Tauri 2 Windows WebView. It adds no native file adapter, custom Rust command, remote frontend, updater, telemetry, account, cloud storage, or code signing.

## IPC Boundary

`src-tauri/capabilities/default.json` applies only to the `main` window and has an empty permission list. The frontend does not invoke a Rust command. No filesystem, dialog, shell, HTTP, process, store, clipboard, notification, updater, or logging plugin is linked. A future native file adapter must be admitted as a separate Phase 18B contract with document-scoped handles and narrowly named permissions.

The application uses `@tauri-apps/api/core` only for its synchronous `isTauri()` runtime marker. This check neither invokes IPC nor changes document, source-unit, diagnostic, storage, or file-lifecycle identity.

## Content Security Policy

Release content is local and uses `default-src 'self'`. Scripts are local and permit `wasm-unsafe-eval` only for WebAssembly compilation; general `unsafe-eval` is prohibited. Styles permit inline style attributes required by the existing UI/Monaco integration. Images and workers permit only local, data, or blob resources. Network connections are limited to the local Tauri IPC origin; no third-party domain is present.

Remote navigation and remote-domain IPC access are not configured. Release assets are embedded from `dist/`; no production URL, CDN, localhost dependency, or external source map is bundled.

## Data And Persistence

Tauri WebView localStorage keeps the four existing machine-key contracts unchanged: locale, UI preferences, startup selection, and lesson progress. Source, filename/path, handles, write target IDs, diagnostics, generated output, Trace, and VM state remain prohibited. No Tauri Store plugin is used.

## Signing Boundary

Phase 18A is an unsigned local demonstration build. It contains no certificate or private key and does not bypass Windows SmartScreen. Public distribution and updater permissions remain prohibited until a separately reviewed signing phase.
