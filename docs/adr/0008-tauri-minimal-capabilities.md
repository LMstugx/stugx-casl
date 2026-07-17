# ADR 0008: Tauri Minimal Capabilities

- Audience: Desktop and security maintainers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Tauri Integration](../developer/tauri-integration.md), [Windows Desktop Demo](../user/windows-desktop-demo.md)

## Context

The Windows demo needs offline packaging, not a second privileged desktop application architecture.

## Decision

Tauri 2 packages the same React/Vite/WASM frontend. Its single main-window capability has no filesystem, dialog, shell, HTTP, updater, store, process, clipboard, notification, or custom-command permission. Frontend assets are local and release DevTools are disabled.

## Consequences

- Desktop and Web share source, storage keys, compiler, VM, and UI.
- Offline WASM is mandatory.
- Browser file-adapter limitations remain honest until a separately reviewed native adapter exists.
- Signing and automatic updates are outside the local-demo boundary.
