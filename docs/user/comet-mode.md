# COMET Mode

- Audience: CASL II learners and instructors
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Microcycle Guide](comet-microcycle-mode.md), [Reverse Microstep](reverse-microstep.md), [Observation Modes](observation-modes.md)

COMET Mode exposes the deterministic stages of **stugx.CASL Teaching Microarchitecture v1**. It executes real C++ Core/WASM state transitions rather than an animation.

Step advances one applicable phase. Run advances bounded microcycles until Stop, input wait, completion, or error. The panel shows the current machine instruction, source relation, phase, machine words, and Trace. Machine Code and Circuit Focus follow the current machine address and active data path.

Reverse Microstep restores one retained committed phase. It is intentionally narrower than a complete time-travel debugger and obeys the barriers described in the [Reverse Microstep guide](reverse-microstep.md).

This teaching model explains COMET II instruction semantics. It is not a claim about a unique physical COMET II implementation.
