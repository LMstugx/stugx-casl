# Architecture Decision Records

- Audience: Maintainers and architectural reviewers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Architecture Overview](../developer/architecture-overview.md), [Documentation Index](../README.md)

ADRs record decisions that protect compatibility, security, and teaching behavior. They are not changelog entries and do not replace implementation tests.

| ADR | Decision |
| --- | --- |
| [0001](0001-web-wasm-architecture.md) | Web production uses the local WASM core |
| [0002](0002-cpp-subset-to-casl.md) | C++ remains an explicit teaching subset lowered to CASL |
| [0003](0003-clean-wire-visual-contract.md) | Circuit Focus uses the clean-wire contract |
| [0004](0004-diagnostic-identity.md) | Diagnostic identity is structured and locale-independent |
| [0005](0005-document-source-ownership.md) | One document owns all source-derived state |
| [0006](0006-independent-persistence-stores.md) | Persistence stores remain independent and allowlisted |
| [0007](0007-browser-file-lifecycle.md) | Browser file operations are honest, guarded, and adapter-owned |
| [0008](0008-tauri-minimal-capabilities.md) | Tauri packages the frontend with minimal capabilities |
| [0009](0009-static-cloudflare-deployment.md) | Public hosting remains a static Cloudflare Pages deployment |
| [0010](0010-double-teaching-abi.md) | Double storage uses four logical high-word-first COMET II words |
| [0013](0013-wcasl-compatible-workflow.md) | WCASL compatibility targets semantics and workflow without copying its UI |
| [0014](0014-debugger-runtime-mutation.md) | Debugger edits are owned runtime transactions with history barriers |
| [0015](0015-comet-flag-register-three-bit-contract.md) | Public COMET II FR state contains exactly OF, SF, and ZF |
| [0016](0016-comet-teaching-microarchitecture.md) | COMET microcycles use a deterministic teaching microarchitecture |

To supersede an ADR, add a new numbered record, link the old record, state migration and compatibility effects, and update affected baselines and tests explicitly.
