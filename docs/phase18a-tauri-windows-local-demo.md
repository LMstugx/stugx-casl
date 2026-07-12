# Phase 18A Tauri Windows Local Demo

## Scope And Architecture

Phase 18A packages the existing React, TypeScript, Vite, Monaco, and WASM application as a single-window Tauri 2 Windows demo. It reuses `src/`, `public/`, `vite.config.ts`, and `dist/`; there is no second frontend. Parser, assembler, lowering, emitted CASL, diagnostics, file lifecycle, persistence schemas, and VM semantics are unchanged.

## Vite And Offline WASM

`STUGX_RUNTIME=tauri` selects Vite base `./` only for the desktop frontend build. Web production still uses its validated root/configurable absolute base. The shared WASM loader resolves glue and binary URLs against `document.baseURI` for Tauri's internal resource origin. Tauri production requires `VITE_CORE_BACKEND=wasm`; Mock fallback is rejected.

`scripts/build-tauri-frontend.ps1` rebuilds the existing Emscripten glue/binary, builds Vite, requires both WASM files, requires relative HTML asset references, and rejects source maps. The release bundle embeds these assets and has no localhost or public-host dependency.

## Runtime And Window

`getApplicationRuntime()` calls Tauri's stable `isTauri()` API and catches failure as `web`; it never inspects user-agent text. Runtime is exposed only as a nonvisual root data attribute and is excluded from IDs, diagnostics, and storage keys.

The one `main` window is titled `stugx.CASL`, defaults to 1440x900, has a minimum of 1180x700, is resizable/maximizable, and does not enable fullscreen or release DevTools. The application keeps its existing 1280x720 visual contract inside the available WebView viewport.

## Security And Persistence

The capability is main-window scoped with no IPC permissions. No native plugin or custom command is enabled. CSP is local-only and permits WebAssembly compilation without general `unsafe-eval`. The four Phase 16 localStorage contracts remain independent and unchanged; Tauri Store is not introduced.

## Current File Compatibility

Phase 18A intentionally does not add native file permissions. The browser Open/Save adapter remains authoritative. Input Open, File System Access detection, Blob download, localStorage, and beforeunload are audited in the release WebView; unsupported save paths must remain Save As/copy semantics and cannot claim a confirmed overwrite. Native open/save dialogs and document-scoped native write bindings are Phase 18B work.

## Branding And Bundle

The user-provided STUGX source is retained as `assets/branding/stugx-logo-source.jpg`, with a pixel-equivalent PNG and whitespace-trimmed horizontal presentation asset beside it. The 1024x1024 Windows icon master isolates and lays out the original red X pixels without redrawing or recoloring them. Project-local Tauri CLI output supplies 16/32/64/256 ICO frames and the configured PNG sizes; Tauri's default icon is not retained. The build targets an unsigned per-user NSIS installer and a standalone release executable, with adjacent SHA-256 files. No updater or signing material is configured.

## Phase 18A.1 Desktop Detail Freeze

The 1180x700, 1280x720, 1440x900, and maximized desktop layouts keep the locale utility group nonshrinking and give JP/EN/CN equal 36px controls. At compact desktop sizes the inactive theme placeholder and brand subtitle yield space before command labels are compressed. The Source header is a stable three-column, two-row grid: title, Demo selector, language mode, then an independently truncated document name and Dirty marker.

Errors now use a bounded diagnostic list with stable scrollbar space and a separate selected-diagnostic context. Only the selected item exposes full localized summary, source/related locations, producer/code, and collapsed raw context. The left column contributes its minimum content height to natural page scrolling, preserving a usable Source Editor instead of allowing a large error set to stretch or crush the workspace. Diagnostic identity, count, order, severity, range, marker ownership, and navigation semantics are unchanged.

## Validation And Result

Automated validation covers configuration, runtime/base handling, minimal capability, local WASM artifacts, Cargo/Clippy, release bundle, source-map/secret/path scans, Web regression, and frozen Phase 14/15/16 baselines. The release executable was also launched directly with ports 5173/5174 closed. It reported `WASM Core`; Assemble, Step, Run, Reset, CPU Flow, Register/Stack, Code/Machine, EN/JA/zh-CN, natural scrolling, and restart persistence were exercised. The process opened no TCP connection during the smoke.

WebView2 provided a real Windows picker for input Open and a real system Save As picker through the existing browser adapter. Both were cancelled; no file was written and no success was fabricated. Locale and observation mode restored after restart, the built-in source returned clean, and VM state returned to Idle rather than restoring execution.

Final result: **PASS** for a controlled local demonstration. The active Codex session required network connectivity and the shell was not elevated, so the network adapter/firewall was not disabled; the no-listener/no-TCP observation plus embedded-asset verification is the recorded offline-dependency evidence.

## Known Limitations And Phase 18B

The release is unsigned and is not intended for public distribution. WebView2 is a machine prerequisite. A hard-disconnected-machine rerun remains desirable before taking the demo to another computer. Lesson-progress persistence is covered by the unchanged Phase 16 unit/E2E contracts; the desktop smoke verified the shared localStorage bootstrap but did not reset lesson progress through the UI. Phase 18B should add only narrowly scoped native dialogs and document-owned read/write bindings while preserving revision snapshots, Save/Save As honesty, cancellation, and no-path persistence.
