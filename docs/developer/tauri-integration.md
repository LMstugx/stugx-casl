# Tauri Integration

- Audience: Desktop-build and security maintainers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Windows Desktop Demo](../user/windows-desktop-demo.md), [Tauri Capability ADR](../adr/0008-tauri-minimal-capabilities.md)

Tauri 2 packages the existing Vite frontend; it does not contain a second React application. `STUGX_RUNTIME=tauri` selects relative asset URLs while preserving Web production base behavior.

The main window is 1440 by 900 with a minimum of 1180 by 700. Release DevTools are disabled. The release frontend is loaded from `dist`, not a remote URL or localhost.

The explicit capability is scoped to the `main` window and has no plugin or custom-command permissions. Filesystem, dialog, shell, HTTP, updater, process, store, clipboard, and notification plugins are absent.

The packaged WASM glue and binary are required offline. The four browser-local persistence keys remain unchanged and Tauri Store is not used.

Windows builds use Rust stable MSVC, Visual Studio build tools, Windows SDK, and WebView2. Current NSIS output is unsigned and intended for local demonstrations.
