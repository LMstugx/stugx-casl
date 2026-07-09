# Phase 8L Circuit Arrow Routing

Phase 8L refines only the Circuit Focus Mode arrow routing. It does not change compiler, assembler, VM, WASM, mock backend, Step, Run, or Reset behavior.

## Why Routing Needed Refinement

After Phase 8K, the circuit had row-level anchors and bus metadata, but some active wires still looked like temporary SVG polylines. The main goal of this phase is to make active data and control flow read more like planned teaching schematic routing.

## Anchor-To-Anchor Rule

Every active wire starts and ends at a semantic anchor:

- register row anchors for GR read/write
- memory row anchors for read/write targets
- MDR ports for memory buffering
- ALU input/output anchors for compute instructions
- FR input anchor for flag updates
- PR/MAR anchors for address and control paths

Wires should not terminate near a module. They should terminate on the relevant port or row anchor.

## Bus Lane Routing Rule

Circuit routing uses these lanes:

- `addr`: PR, MAR, memory address, LAD effective address
- `ctrl`: controller, decoder, PR control, jump target
- `data-bypass`: LD and ST movement between Memory, MDR, and GR
- `data-compute`: arithmetic, logic, and compare movement through ALU
- `flag`: ALU flag output to FR

Inactive guide wires do not use prominent arrows. Active wires use a single terminal arrow and small junction dots at lane merge points.

## LD / ST Bypass Routing

`LD GRr,addr` routes as:

```text
MAR -> Memory[row]
Memory[row] -> MDR -> GRr
```

The data path uses the bypass lane and does not enter the ALU.

`ST GRr,addr` routes as:

```text
GRr -> MDR -> Memory[row]
```

The Memory write endpoint lands on the row-left anchor, so the wire does not cross the Memory value and label columns.

## ADDA Compute Routing

`ADDA GRr,addr` and related compute/compare instructions route through the ALU:

```text
GRr -> ALU inputA
Memory[row] -> MDR -> ALU inputB
ALU outputY -> GRr
ALU flagOut -> FR
```

Compare instructions reuse the ALU/FR path but do not use the `ALU -> GR` writeback segment.

## JUMP Control Routing

Jump-family instructions use address/control lanes:

```text
target address/control -> PR
```

They do not use data lanes and do not enter the ALU.

## Arrow Marker Rule

- Active wires use one terminal arrow.
- Inactive guide wires do not use primary arrowheads.
- Arrowheads are intentionally small.
- Junction dots mark lane merge points without becoming the main visual.

## Helper Design

Routing helpers are kept in `wirePaths.ts`:

- `routeOrthogonal`
- `routeViaLane`
- `routeAvoidRect`
- `buildPathWithCorners`
- `addJunction`

These helpers keep path construction testable and avoid screenshot-specific coordinates in React components.

## Future Direction

This phase prepares the circuit for:

- animated signal flow
- signal evolution graphs
- custom circuit routing
- configurable components

The current phase remains a fixed teaching schematic, not a custom circuit editor.
