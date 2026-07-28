# COMET Microcycle Runtime Contract

- Audience: Runtime and compatibility maintainers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Instruction-Cycle Matrix](comet-instruction-cycle-matrix-v1.json), [Teaching Microarchitecture ADR](adr/0016-comet-teaching-microarchitecture.md), [Developer Guide](developer/comet-microcycle-runtime.md)

The runtime implements **stugx.CASL Teaching Microarchitecture v1**. Its purpose is to make official COMET II machine-instruction effects observable in deterministic stages. It does not define a unique physical hardware implementation.

## Source Of Contract

`comet-instruction-cycle-matrix-v1.json` freezes the vocabulary and instruction-specific phase plan for all 28 official machine instructions. Runtime tests compare the TypeScript plan, C++ behavior, Mock behavior, and matrix. The JSON is not imported by production runtime code.

## Execution Granularity

- Instruction: Step completes one decoded machine instruction.
- Microcycle: Step completes one applicable phase.
- Continuous instruction Run and continuous microcycle Run share bounded execution, Stop, ownership, error, and input-wait contracts.

Both granularities execute the current machine image. Neither reads source to determine register or memory results.

## Mapping And Presentation

The relation is Source -> expanded Machine Instruction -> Microcycle. A macro line can map to multiple machine instructions, but each microcycle belongs to exactly one decoded machine instruction. The current machine address drives Machine Code highlighting. Source Mapping retains the original line relation.

Circuit Focus is active-flow-only. It cannot light mutually exclusive memory/register paths, show inactive ghost wires, or invent an FPU, 64-bit bus, cache, pipeline, or speculative state.

## History And Barriers

Microcycle history is bounded to 1000 entries and records before/after architectural state plus memory-write deltas. It is not persisted. Reset, Reload, input restart, debugger mutation, source replacement, and Full Clear invalidate history according to the existing execution/history epoch barrier.

Reverse Step remains prohibited until a later phase proves restoration, input/output barriers, ownership checks, and bounded checkpoint behavior.
