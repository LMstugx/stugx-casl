# Windows Desktop Demo

- Audience: Users preparing a local Windows demonstration
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Tauri Integration](../developer/tauri-integration.md), [Tauri Demo Runbook](../tauri-build-and-demo-runbook.md)

The repository includes a Tauri 2 Windows demo that reuses the React/Vite frontend and WASM core. The release application runs from packaged local assets and does not require a Vite server, Node.js, `node_modules`, Cloudflare, or Internet access.

The desktop build requires WebView2 on Windows. The current installer is unsigned and intended for local demonstration; another computer may show an unknown-publisher or SmartScreen warning.

The demo deliberately retains the browser file adapter boundary. Tauri native file dialogs and filesystem plugins are not enabled, so Open/Save behavior depends on WebView capabilities and may use the download-copy fallback.

The Tauri capability grants no filesystem, shell, HTTP, updater, store, or custom-command access.
