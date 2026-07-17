# ADR 0010: Double Teaching ABI

- Audience: Transpiler, VM presentation, and compatibility maintainers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Double Teaching ABI](../cpp-double-teaching-abi.md), [Double Lowering](../developer/double-lowering.md)

## Context

COMET II words are 16 bits and the VM has no native binary64 instruction set or FPU. Students still need to inspect how one wider scalar representation is stored and copied.

## Decision

Represent a bounded C++ `double` as IEEE-754 binary64 split into four consecutive logical high-word-first COMET II words. Perform initialization and assignment through actual 16-bit CASL `LAD`, `LD`, and `ST` operations. Decode the current words only in presentation code.

Reject arithmetic, comparison, conversion, function parameter/return, array, and wider floating-point surfaces. Do not invent a 64-bit bus, FPU, native execution path, or host-ABI equivalence.

## Consequences

- Every word transfer remains visible through existing VM, Trace, Memory, and circuit paths.
- Web and Tauri share deterministic representation and lowering.
- Existing integer programs remain on the unchanged one-word path.
- A future arithmetic phase must define software operations separately and explicitly supersede no part of this storage ABI without migration review.
