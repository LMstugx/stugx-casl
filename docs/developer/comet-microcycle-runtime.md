# COMET Microcycle Runtime

- Audience: Runtime, WASM, and visualization maintainers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Runtime Contract](../comet-microcycle-runtime-contract.md), [COMET II VM](comet-vm.md), [Circuit Visualization](circuit-visualization.md)

Phase 20C turns the frozen instruction-cycle matrix into runtime state transitions. The matrix remains a deterministic contract and test input; production code does not load JSON to decide how an instruction executes.

## Runtime Layers

- C++ `CometVm::stepMicrocycle()` is the production implementation.
- The WASM bridge exports `stugx_casl_micro_step` and `stugx_casl_run_microcycles`.
- Mock Core implements the same observable phase contract for unit tests and development.
- `CoreAdapter`, `coreBridge`, and the app store expose instruction and microcycle execution without changing document ownership.
- `CometMicrocyclePanel`, Trace, Machine Code, Source Mapping, and Circuit Focus consume returned VM state.

`step()` completes the current machine instruction by repeatedly invoking the same C++ phase implementation. It does not maintain a second instruction execution switch. Existing instruction tests therefore verify the final architectural result of the microcycle runtime.

## State Commit Boundaries

Fetch commits `MAR`, `MDR`, and `IR`. Decode exposes the decoded opcode and second word where present. Effective Address commits the real base/index result. Operand Read commits the source register relation or real memory read. Execute computes or stages the operation. Write Back changes the destination register or memory. Flag Update commits the official `OF`, `SF`, and `ZF`. Complete advances the sequential `PR` when appropriate and increments the instruction count once.

Branches commit `PR` during Execute. `CALL`, `RET`, `PUSH`, and `POP` expose their stack effects in separate phases. A top-level `RET` becomes `Finished` at Instruction Complete, so the final phase remains observable. `SVC IN` may pause in Execute; submitting input safely restarts that machine instruction from Fetch.

## History

Each completed microcycle records a bounded sequence entry with:

- phase and machine-instruction address
- PR, SP, MAR, MDR, IR, call depth, run state, and FR before/after
- GR before/after or changed-register deltas
- every memory word changed during that phase

C++ records complete memory deltas, including multi-word `SVC` input. The frontend keeps the bounded DTO-visible delta summary used by Trace. No reverse API is exposed in Phase 20C.

## Compatibility

Instruction mode and repeated microcycle mode must reach the same architectural state. Register forms cannot synthesize an effective address or memory read. The runtime never creates a macro opcode, FPU, 64-bit register, pipeline, cache, branch predictor, or speculative state.
