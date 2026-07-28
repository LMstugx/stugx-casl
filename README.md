# stugx.CASL

stugx.CASL is a CASL II / COMET II learning studio for connecting source, Generated CASL, machine words, memory, Trace, and circuit state. The public WASM application is available at <https://stugx-casl.pages.dev/>.

## Current Status

- Version: `0.1.0`
- Web: static Vite/WASM deployment on Cloudflare Pages
- Windows: offline Tauri 2 local demo and unsigned NSIS build
- Languages: EN, JA, and zh-CN
- Documents: single-document New, Open, Save, Save As, Dirty guard, and `beforeunload`
- Persistence: locale, safe UI preferences, last built-in example, and built-in lesson progress only

The project has no login, telemetry, analytics, cloud source storage, or remote compiler. Production requires the WASM backend and does not silently fall back to Mock.

## Learning Paths

Direct CASL:

```text
CASL II source
-> assembler
-> COMET II machine code
-> COMET II VM
-> Registers / Memory / Trace / Circuit
```

C++ teaching subset:

```text
C++ teaching subset
-> parser and semantic checks
-> Generated CASL II
-> assembler
-> COMET II VM
```

The C++ path is not a complete C++ compiler and does not execute native code or provide the complete standard library.

## Core Features

- complete official CASL II machine-instruction set, directives, standard macros, and COMET II execution
- WCASL-compatible CASL observation workflow with nonblocking `IN` / `OUT`
- atomic register and single-word Memory editing with explicit runtime overrides
- Full Clear that unloads machine state without modifying source
- bounded C++ subset lowering to inspectable CASL II
- binary64 double storage and four-word assignment observation
- Source, Generated CASL, Machine Code, and Trace mapping
- CPU Flow, Register / Stack, and Code / Machine observation modes
- clean-wire circuit visualization with active-flow-only emphasis
- structured EN/JA/zh-CN diagnostics with stable source ranges
- guided built-in lessons and local progress
- browser file lifecycle with honest direct-write/download fallback
- public static Web build and offline Windows Tauri demo
- offline, versioned application Changelog

## Development

Prerequisites are Node `>=20 <25`, pnpm `11.7.0`, and the platform tools needed for C++/WASM or Tauri work.

```powershell
pnpm install --frozen-lockfile
pnpm test
pnpm build
pnpm test:e2e
pnpm docs:verify
pnpm audit
```

Additional commands are listed in [Build Commands](docs/reference/build-commands.md). The complete production and desktop procedures are in [Build, Test, and Release](docs/developer/build-test-release.md).

## Documentation

- [Documentation Index](docs/README.md)
- [Getting Started](docs/user/getting-started.md)
- [Architecture Overview](docs/developer/architecture-overview.md)
- [Supported CASL Instructions](docs/reference/supported-casl-instructions.md)
- [CASL Compatibility Mode](docs/user/casl-compatibility-mode.md)
- [CASL State Editing](docs/user/casl-state-editing.md)
- [WCASL-II Parity Audit](docs/phase20a-wcasl-parity-audit.md)
- [C++ Subset Capabilities](docs/reference/cpp-subset-capabilities.md)
- [Double Memory Observation](docs/user/double-memory-observation.md)
- [Architecture Decision Records](docs/adr/README.md)
- [Changelog](CHANGELOG.md)
- [Contributing](CONTRIBUTING.md)
- [Security](SECURITY.md)

Canonical guides describe current behavior. Existing `docs/phase*.md` files and baseline manifests remain historical implementation and QA evidence.

## Limits

- CASL supports the official instruction set and fixed standard macros, but not a user-defined macro system or multi-program linker.
- C++ double handling is limited to four-word storage and assignment observation; arithmetic, comparison, conversion, parameters, returns, and arrays are not included.
- C++ does not include pointers, references, classes, templates, vectors, lambdas, recursion, overloads, or stack-frame lowering.
- Browser direct Save depends on File System Access support; fallback creates a download copy.
- Source, paths, handles, diagnostics, and VM state are not restored between sessions.
- The Windows installer is unsigned and Tauri-native file I/O is deferred.
- Circuit Focus is pedagogical, not cycle-accurate hardware simulation.
- Register/Memory editing is single-target only; bulk mutation and reversible history are not included.
- Reverse execution, COMET microcycle stepping, and multi-program linking remain future work.

## Security and Privacy

Do not commit `dist`, `release`, `artifacts`, `coverage`, `src-tauri/target`, installers, source maps, environment files, credentials, local storage dumps, or local absolute paths. See [SECURITY.md](SECURITY.md) for reporting guidance.

## License

Copyright (c) stugx. All rights reserved. No open-source license is granted; see [LICENSE](LICENSE).
