# Phase 8J: Lab-Style Schematic Polish

Phase 8J is a visual-only pass. It does not change the assembler, VM, WASM bridge, mock core, transpiler, instruction encoding, or Step / Run / Reset behavior.

## Visual Goal

Circuit Focus Mode should read more like a teaching schematic or lab instrument panel than a generic web mockup.

The goal is not a realistic PCB. The diagram still prioritizes readability:

- stable module positions
- clear register and memory row anchors
- visible bus lanes
- small directional arrows
- restrained panel borders
- state indicators derived from runtime state

## Bus Lane Model

The circuit now separates the main lanes:

- `DATA BUS`: data movement between GR, MDR, Memory, and ALU.
- `ADDR BUS`: address movement between PR, MAR, and Memory rows.
- `CTRL`: decoder/controller/control flow paths.

The lanes are visual guides. They do not introduce new VM state.

## DATA / ADDR / CTRL Rules

- Data paths use the red active line only when actual data moves.
- Address and control paths use blue/blue-gray active lines.
- Inactive paths remain low-contrast.
- Junction dots mark bus guide intersections without implying hidden state.

## LD / ST Non-ALU Rule

`LD` and `ST` now use a data-bypass lane around the ALU body:

- `LD`: `MAR -> Memory row -> MDR -> GR row`
- `ST`: `GR row -> MDR -> Memory row`

The ALU module is not highlighted for these instructions, and the direct MDR/GR lane is marked as an ALU-avoiding path in the visual path metadata.

## ALU Instruction Rule

Arithmetic, logic, and comparison paths are the only paths that enter the ALU lane:

- arithmetic / logic: `GR + MDR -> ALU -> GR / FR`
- compare: `GR + MDR -> ALU compare -> FR`

`CPA` / `CPL` do not draw a GR writeback path.

## Status Indicator Rule

Circuit Focus Mode includes lightweight status indicators:

- `FETCH`
- `READ`
- `WRITE`
- `EXEC`
- `FLAG`

These indicators are derived from the current visual path and VM state. They are not auto-scored lesson state and do not modify runtime behavior.

## Current Limitations

- The schematic is instruction-level, not bus-cycle accurate.
- `DATA BUS`, `ADDR BUS`, and `CTRL` are educational lanes, not a complete hardware timing diagram.
- Status indicators show the latest instruction-level activity only.
- Stack-related SP activity is intentionally inactive until stack instructions are implemented.

## Future Direction

Possible future visual work:

- optional schematic / lab style toggle
- configurable circuit display density
- more detailed micro-step path templates
- richer bus timing once the VM exposes lower-level phases
