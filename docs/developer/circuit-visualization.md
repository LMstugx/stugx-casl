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

The Circuit is persistent across auxiliary observation tabs. Registers, Memory, Stack, Code / Machine, Source Mapping, Trace, Console, and Inspector are sibling data projections, not alternate Circuit runtimes. Compact and full Circuit presentation share `CometCircuitSvg` and the same runtime DTO.

Address relationships use target highlights and Effective Address Unit context instead of decorative long wires. Reduced-motion preference disables nonessential signal animation.

Multi-word double operations still use one real 16-bit path per CASL instruction. Signal Probe may identify the object and word index, but the circuit must not invent a 64-bit bus or FPU.

The visualization is subordinate to VM semantics. COMET Mode is cycle-staged according to **stugx.CASL Teaching Microarchitecture v1**, not a claim about physical hardware timing.

The [microcycle runtime contract](../comet-microcycle-runtime-contract.md) requires phase- and operand-aware active paths. Register-register forms cannot invent effective-address or operand-memory paths, and macros are observed through their real expanded instructions.

The [observation data linking contract](../observation-data-linking-contract.md) defines how the same runtime read, write, stack, Fetch, Decode, flag, mutation, and reverse state appears in both panes.
