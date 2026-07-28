# ADR 0016: COMET Teaching Microarchitecture

- Audience: Runtime and visualization maintainers
- Status: Accepted
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Runtime Contract](../comet-microcycle-runtime-contract.md), [Clean-Wire ADR](0003-clean-wire-visual-contract.md), [Three-Bit FR ADR](0015-comet-flag-register-three-bit-contract.md)

## Context

The COMET II specification defines instruction behavior but does not require one physical internal implementation. stugx.CASL needs deterministic intermediate states for teaching without presenting animation as execution or inventing unsupported hardware.

## Decision

The project names its staged model **stugx.CASL Teaching Microarchitecture v1**. All 28 official machine instructions use the frozen Phase 20A instruction-cycle matrix. The C++ VM commits real state at Fetch, Decode, Effective Address, Operand Read, Execute, Write Back, Flag Update, and Complete as applicable.

Instruction Step completes these same phases internally. COMET Mode exposes one phase per Step. Macros are expanded before the runtime. Circuit Focus renders only paths justified by the current decoded instruction and phase.

## Consequences

- Intermediate VM state is deterministic across C++, WASM, Mock, Web, and Tauri.
- Final instruction behavior remains compatible with the pre-Phase 20C baseline.
- The UI must identify the model as a teaching microarchitecture.
- No pipeline, cache, predictor, FPU, 64-bit bus, or speculative state may be inferred.
- Reverse execution requires a separate admission and cannot be implied by the presence of history records.
