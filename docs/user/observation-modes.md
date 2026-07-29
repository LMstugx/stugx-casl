# Observation Modes

- Audience: Users presenting or studying runtime behavior
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Interface Overview](interface-overview.md), [Circuit Visualization](../developer/circuit-visualization.md)

Observation is split into two independent choices. Execution mode selects CASL instruction stepping or COMET microcycle stepping. Observation Data selects the values shown beside the persistent Circuit.

## Persistent Circuit

The live Circuit remains visible for Registers, Memory, Stack, Code / Machine, Source Mapping, Trace, Console, and Inspector views. It uses the same runtime state in full and compact layouts.

## Auxiliary Data

- Registers compares GR0-GR7, PR, SP, IR, MAR, MDR, and FR with the active path.
- Memory follows the current read or write address in a bounded window.
- Stack connects PUSH, POP, CALL, and RET paths to SP and stack words.
- Code / Machine keeps generated instructions and machine words aligned with Fetch and Decode.
- Source Mapping and Trace expose the current source/runtime relationship.
- Console and Inspector provide I/O and detailed signal context without replacing the Circuit.

The former CPU Flow, Register / Stack, and Code / Machine preference values remain compatible inputs and map to safe auxiliary selections.

See [Unified Observation Workspace](unified-observation-workspace.md) for layout and Follow Execution behavior.

The clean-wire contract applies in every mode: no arrows, no circular markers, no ghost inactive wires, and active-flow-only emphasis.
