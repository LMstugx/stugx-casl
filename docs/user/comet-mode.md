# COMET Mode

- Audience: CASL II learners and instructors
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Microcycle Guide](comet-microcycle-mode.md), [Reverse Microstep](reverse-microstep.md), [Reverse Instruction](reverse-instruction.md)

COMET Mode exposes the deterministic stages of **stugx.CASL Teaching Microarchitecture v1**. It executes real C++ Core/WASM state transitions rather than an animation.

Step advances one applicable phase. Run advances bounded microcycles until Stop, input wait, completion, or error. The panel shows the current machine instruction, source relation, phase, machine words, and Trace. Machine Code and Circuit Focus follow the current machine address and active data path.

COMET is an execution mode, not an exclusive page layout. The [Unified Observation Workspace](unified-observation-workspace.md) keeps the active Circuit beside the selected Register, Memory, Stack, Code / Machine, Source Mapping, Trace, Console, or Inspector view.

Reverse Microstep restores one retained committed phase. Reverse Instruction restores the complete or partial current machine instruction to its state before Fetch. Both obey the same history barriers and are intentionally narrower than a complete time-travel debugger.

This teaching model explains COMET II instruction semantics. It is not a claim about a unique physical COMET II implementation.
