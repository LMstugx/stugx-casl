# Phase 8K: Layered Study Mode and Circuit Flow Refinement

> Phase 16C follow-up: Study Mode completion now uses explicit canonical lesson/step IDs and a per-lesson compatibility version. Only completed built-in suggested steps persist; the Phase 8K layout, teaching text, recommended tabs, and checkpoint semantics are unchanged.

Phase 8K is a UI and visualization pass. It does not change CASL execution, the C++ subset transpiler, the assembler, the VM, the mock core, or the WASM bridge.

## Why Density Reduction Was Needed

Circuit Focus Mode had become functionally rich: Program, current instruction, circuit, registers, memory, trace, source mapping, bus labels, status indicators, and output logs were all visible at once.

That is useful for debugging, but too dense for a first learning pass. Phase 8K keeps the information available while reducing what competes with the active instruction path.

## Layered Study Mode Design

The screen is now treated as a layered teaching surface:

- left: Program as context, Current Instruction as the primary explanation, OUT Display as a quiet device panel
- center: circuit path and compact pipeline timeline
- right: compact registers/memory inspector, Signal Probe, latest trace, and compact Source Context
- bottom: Output Log remains available but lower emphasis in Circuit Focus Mode

## Visual Hierarchy

Primary layer:

- Current Instruction
- active data/control path
- active register row
- active memory row
- MDR when involved
- ALU only when involved
- FR only when involved
- current pipeline stage

Secondary layer:

- Program panel
- Step Timeline
- Registers / Memory inspector
- latest Trace row
- Current Source Mapping

Tertiary layer:

- bus labels
- inactive wires
- inactive signal indicators
- old trace rows
- Source Context
- footer
- background grid
- Output Log

## Bus Lane / Anchor / Pipe Routing Model

Phase 8K keeps the Phase 8J lanes but adds more structured segment metadata:

- `addr`
- `ctrl`
- `data-bypass`
- `data-compute`
- `flag`

Each visual segment carries:

- `fromAnchor`
- `toAnchor`
- `lane`
- `semanticType`
- `direction`
- active/primary information
- related register / memory address / stage when available

This makes the SVG more like a typed routing system than a collection of unrelated lines.

## Dynamic Path Metadata

The VM still provides instruction-level state. Phase 8K does not invent micro-cycles.

The visual layer reorganizes existing state so future work can add:

- flowing path animation
- signal probes
- configurable visibility
- custom circuit templates

without rewriting the routing model.

## Signal Probe Foundation

Signal Probe is a compact read-only card. It shows current or recent values for:

- selected GR row
- MDR
- ALU.Y when an ALU instruction is active
- FR
- target memory address
- recent signal evolution from Trace

It is not an automatic grader, charting engine, or custom circuit editor.

## Current Limitations

- The circuit remains instruction-level, not cycle-accurate.
- Signal Probe only displays values already exposed by `CometState` and `TraceEvent`.
- Source Context remains compact rather than a full linked source browser.
- Output Log is visually reduced in Focus Mode, but all existing tabs remain available.

## Future Direction

- schematic / lab style toggle
- Signal Evolution graph
- configurable circuit display density
- module visibility controls
- custom circuit sandbox based on typed anchors and signal probes
