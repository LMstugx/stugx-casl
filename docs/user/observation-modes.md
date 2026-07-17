# Observation Modes

- Audience: Users presenting or studying runtime behavior
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Interface Overview](interface-overview.md), [Circuit Visualization](../developer/circuit-visualization.md)

Observation Mode changes presentation only. It does not modify source, assemble, run, or alter VM semantics.

## CPU Flow

Use CPU Flow to follow the current instruction through the active circuit path, compact memory, Signal Probe, and execution timeline.

## Register / Stack

Use Register / Stack to compare GR0-GR7, PR, SP, FR, Stack Preview, Call Stack, and memory values. Design-only frame metadata is identified separately from live VM state.

## Code / Machine

Use Code / Machine to compare Source, Generated CASL, Machine Code, and Trace mappings. This mode is useful when explaining lowering and instruction encoding.

The clean-wire contract applies in every mode: no arrows, no circular markers, no ghost inactive wires, and active-flow-only emphasis.
