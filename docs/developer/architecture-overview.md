# Architecture Overview

- Audience: Developers and maintainers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Repository Structure](repository-structure.md), [WASM Bridge](wasm-bridge.md)

stugx.CASL separates source ownership, compilation, machine execution, and presentation. Web and Tauri package the same React frontend and WASM core.

```mermaid
flowchart LR
  CPP[C++ Teaching Subset] --> TRANS[Transpiler]
  TRANS --> CASL[Generated CASL II]
  CASL --> ASM[CASL Assembler]
  ASM --> MC[COMET II Machine Code]
  MC --> VM[COMET II VM]
  VM --> UI[Registers / Memory / Trace / Circuit]
```

Direct CASL input enters at the assembler. The TypeScript CoreAdapter boundary provides Mock development/test and WASM implementations, but production builds require WASM and fail when its assets are missing.

The application store owns the active editor document and derived compiler/runtime views. A CASL project session may retain several independently owned documents and one immutable linked runtime; selecting an editor module does not transfer linked-image ownership. File operations, persistence adapters, diagnostics, and lesson progress use explicit controllers or registries rather than component-level browser access.

Historical implementation evidence remains under `docs/phase*.md`. Current contracts are summarized by this guide, the [Technical Reference](../README.md), and the ADRs.
