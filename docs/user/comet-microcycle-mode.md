# COMET Microcycle Mode

- Audience: CASL II learners and instructors
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [CASL Compatibility Mode](casl-compatibility-mode.md), [Observation Modes](observation-modes.md), [COMET II VM](../developer/comet-vm.md)

COMET Mode advances one real machine-instruction microcycle per Step. It uses the same assembled image, registers, memory, source map, Trace, and WASM runtime as instruction mode. It does not replay an animation or recompute state from source.

The displayed model is **stugx.CASL Teaching Microarchitecture v1**. It is one deterministic teaching model for explaining specified COMET II instruction behavior, not a claim that every physical COMET II implementation must use this internal design.

## Phases

An instruction uses only the phases that apply:

1. Fetch
2. Decode
3. Effective Address
4. Operand Read
5. Execute
6. Write Back
7. Flag Update
8. Instruction Complete

Register-register forms omit Effective Address and do not read data memory. `LAD`, shifts, and branches use an address as a value. Macros such as `RPUSH` are expanded before execution, so COMET Mode steps through their real `PUSH` machine instructions.

The COMET Mode panel shows the current phase, machine instruction, mapped source, machine words, microstep position, and recent microcycle Trace. Machine Code follows the current machine address. Circuit Focus shows only the active path for the current phase.

## Run And Stop

Run in COMET Mode continuously executes microcycles using the existing bounded Run and Stop controls. Switching back to Modern Studio or CASL Mode restores instruction-level Step. Switching views does not edit source, set Dirty, assemble, reset, or create a persistence key.

## Limits

Reverse Step is not available. Phase 20C records bounded transition history, including architectural state and memory-write deltas, as an implementation foundation for a later reversible debugger. The history is runtime-only and is cleared by Reset, Reload, manual debugger mutation, source replacement, and Full Clear.
