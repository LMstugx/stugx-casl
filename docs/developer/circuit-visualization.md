# Circuit Visualization

- Audience: UI and runtime-visualization maintainers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Observation Modes](../user/observation-modes.md), [Clean-Wire ADR](../adr/0003-clean-wire-visual-contract.md)

Circuit Focus is a teaching projection of actual VM and execution-plan state. It must not invent register values, memory accesses, or active paths.

The frozen clean-wire contract is:

- no arrowheads
- no circular path markers
- no inactive ghost wires
- active-flow-only wires

CPU Flow prioritizes active data, address, and control relationships. Register / Stack prioritizes machine values and stack context. Code / Machine prioritizes source, generated assembly, machine rows, and Trace mapping.

Address relationships use target highlights and Effective Address Unit context instead of decorative long wires. Reduced-motion preference disables nonessential signal animation.

Multi-word double operations still use one real 16-bit path per CASL instruction. Signal Probe may identify the object and word index, but the circuit must not invent a 64-bit bus or FPU.

The visualization is not cycle-accurate hardware and must remain subordinate to VM semantics.
