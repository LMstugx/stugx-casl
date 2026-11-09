# ADR 0023: Workbench Datapath Draws Structural Buses and Active-Path Arrowheads

- Audience: Circuit, visual-design, and UI maintainers
- Status: Canonical
- Last reviewed version: 1.0.0
- Classification: Canonical
- Related: [Clean-Wire ADR](0003-clean-wire-visual-contract.md), [Circuit Visual Contract](../circuit-visual-contract.md), [Circuit Visualization](../developer/circuit-visualization.md)

Number 0022 is taken by a record on the x86 design branch, so this record uses 0023.

## Context

ADR 0003 removed arrowheads, circular markers, and inactive wire networks from Circuit Focus. At the time the circuit drew a per-instruction route for every instruction category, and the guide routes of instructions that were not executing surrounded the one that was. Decorative markers on those routes implied direction and participation the runtime had not established.

The v2 workbench replaces that picture with one fixed datapath, drawn the way a textbook block diagram is drawn: every register, the ALU, the address adder, the selector, the decoder, the controller, and memory are always in the same place and always connected by the same buses. Learners asked to see the whole machine at once, and on the highlighted route they need to see which way the value moves.

A fixed bus is a different thing from an inactive guide wire. It does not change with the instruction, it never suggests that something is moving, and it carries the same information as a module outline: this part exists and is connected here.

## Decision

The rules below apply to the v2 workbench datapath in `src/visual/datapath`.

1. Structural buses are always drawn. They are thin, low contrast, and have fixed geometry. They never animate, never carry an arrowhead, and never change with the instruction.
2. A junction dot is drawn only where a structural bus really splits or merges. The dot sits on the segment. Orphan dots, endpoint dots, and Memory-side terminal circles stay prohibited.
3. An arrowhead is drawn only on a path that is active in the current runtime state: one terminal arrowhead at the destination end. Mid-segment arrows, floating arrowheads, and arrowheads on idle buses stay prohibited.
4. Active paths are still derived only from runtime state. Mutually exclusive paths are never lit together, and when the state is ambiguous the datapath shows less.
5. Path kinds are not told apart by colour alone. Address, data, and flag paths differ in the destination they reach and in the text markers next to it, such as the read and write letters on a memory row and the previous value beside a rewritten register.
6. Control lines are dashed and low contrast while idle and solid only while the controller asserts that signal.

## What This Supersedes

This record supersedes ADR 0003 for the workbench datapath only.

| ADR 0003 | Workbench datapath |
| --- | --- |
| no arrowheads | one terminal arrowhead on each active path, none anywhere else |
| no circular markers | junction dots at real bus splits and merges only |
| no ghost inactive wires | fixed structural buses are drawn; per-instruction inactive guide routes are still not drawn |
| active-flow-only emphasis | unchanged |

`CometCircuitSvg` remains bound by ADR 0003 without change until the workbench datapath replaces it. The two rule sets are never mixed inside one component.

## Migration And Compatibility

- No runtime, DTO, or execution behaviour changes.
- The tests that protect ADR 0003 on `CometCircuitSvg` stay in place for as long as that component is in the product.
- New tests under `src/visual/datapath/__tests__` enforce this record: arrowheads appear only on active paths, an idle datapath has none, structural buses never carry a marker, and every junction dot lies on a bus segment.
- When the workbench datapath replaces `CometCircuitSvg`, the tests that only describe the retired component are removed in that same change and listed in its description. Tests that describe runtime truth, such as which path is active for which instruction, are ported to the new component and keep their assertions.

## Consequences

- The whole machine is visible at every step, so a learner can locate a part before it becomes active.
- Direction is readable on the active route without reading the trace.
- The idle picture is static. A reviewer can tell an active path from structure by weight, by the arrowhead, and by the text markers, not by colour alone.
- Motion on the workbench datapath is governed by [ADR 0024](0024-workbench-datapath-motion.md). The reduced-motion and static visual-review rules apply to all of it.
