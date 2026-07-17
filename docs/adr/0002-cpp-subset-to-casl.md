# ADR 0002: C++ Subset to CASL

- Audience: Parser, semantic, and lowering maintainers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [C++ to CASL Pipeline](../developer/cpp-to-casl-pipeline.md), [C++ Subset Capabilities](../reference/cpp-subset-capabilities.md)

## Context

The product teaches how a small C++-like program maps to CASL II and COMET II. Accepting arbitrary C++ would obscure that mapping and require a native toolchain/runtime.

## Decision

Maintain an explicit typed teaching subset. Parse and validate it locally, lower supported constructs deterministically to Generated CASL, then use the same assembler and VM as direct CASL input. Never invoke a system compiler or guess unsupported syntax.

## Consequences

- The allowlist is documented and tested.
- Unsupported features receive bounded diagnostics.
- Language expansion requires parser, semantic, lowering, mapping, parity, and documentation work.
- The UI must call the language a C++ teaching subset, not complete C++.
