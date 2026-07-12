# Tauri Build And Demo Runbook

## Prerequisites

- Windows 10/11 with WebView2 Runtime.
- Rust stable `x86_64-pc-windows-msvc`.
- Visual Studio 2022 C++ tools and Windows SDK.
- Node 20-24, pnpm 11, CMake/Ninja, and the existing Emscripten SDK used by `build:wasm`.

The scripts discover Visual Studio through `vswhere.exe` and import the x64 `VsDevCmd.bat` environment into their own process. They do not change the global MSVC environment.

## Commands

```powershell
pnpm tauri:dev
pnpm tauri:build
pnpm tauri:verify
```

`pnpm tauri:build:demo` is the explicit demo alias. The release pipeline runs Cargo check, Clippy with warnings denied, the WASM-first relative-base frontend build, Tauri release bundling, and SHA-256 generation. It fails rather than substituting the Mock backend.

## Outputs

- Executable: `src-tauri/target/release/stugx-casl.exe`
- NSIS installer: `src-tauri/target/release/bundle/nsis/*.exe`
- Checksums: adjacent `*.sha256` files
- Local report: `src-tauri/target/tauri-demo-build-report.json`

All outputs are ignored and must not be committed.

The committed Windows icon inputs are derived from the user-provided STUGX source under `assets/branding/`. `pnpm tauri:verify` checks the 1024x1024 master and required 16/32/64/256 ICO frames before accepting a demo build.

## Offline Smoke

1. Stop Vite/Node servers and verify ports 5173/5174 are not listening.
2. Disconnect networking or block the demo executable for outbound traffic.
3. Start the release executable directly.
4. Confirm the built-in example, `WASM Core`, Assemble, Step, Run, Reset, all three observation modes, EN/JA/zh-CN, natural page/Inspector scrolling, and clean-wire behavior.
5. At 1180x700, 1280x720, and 1440x900, confirm JP/EN/CN remain visible, Source controls do not overlap, and a long Errors list scrolls internally while its selected context remains visible.
6. Change locale, preferences, startup example, and lesson progress; close and reopen the app and confirm those four safe domains restore.
7. Confirm no source, external file, path, handle, diagnostics, generated output, Trace, or VM state is restored.

Manual GUI results must be recorded as manual evidence. Build/config tests are not a substitute for launching the release executable.

The Phase 18A acceptance run launched the executable with no Vite listener on 5173/5174, exercised the WASM execution and presentation flows, observed no process TCP connections, and reopened the app to verify safe preference restoration with VM state reset to Idle. A physically disconnected or firewall-isolated rerun is recommended before demonstrating on a different machine.

## Files And Signing

Phase 18A retains the browser adapter. Input-based Open may work in WebView2. File System Access support and Blob download behavior are capability-dependent and must not be described as a confirmed overwrite. Native dialog/filesystem support is deferred to Phase 18B.

The installer is unsigned. It is suitable for a controlled demonstration on the builder's machine. Copying it to another computer may show Unknown Publisher or SmartScreen warnings; do not bypass those warnings or claim public distribution readiness.
