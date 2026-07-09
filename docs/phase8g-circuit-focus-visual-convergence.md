# Phase 8G: Circuit Focus Visual Convergence

Phase 8E made the circuit paths semantically correct with row-level anchors. Phase 8G adds a dedicated presentation shell so the same state-driven circuit can be reviewed as a teaching panel instead of a normal IDE region.

No compiler, assembler, VM, WASM bridge, or instruction semantics changed in this phase.

## Why Another Circuit Pass Was Needed

After 8E, the path semantics were mostly correct:

- GR rows had anchors.
- Memory rows had anchors.
- ALU, MDR, and FR had fixed input/output points.
- SP was visible but not part of the default fetch path.

The remaining issue was layout. The circuit still looked like a normal SVG inside the IDE center column. For teaching, the hardware view needs supporting panels around it: program, display, current instruction, registers, trace, and timeline.

## Focus Mode Layout

Circuit Focus Mode uses a three-column shell:

- Left: Program, Display, Current Instruction
- Center: large Circuit Focus Mode panel, then Step Timeline
- Right: Registers / Memory inspector, compact Trace, Source Context

The normal IDE layout remains available. The toolbar has a `Circuit Focus` toggle for switching between the layouts.

## Program / Display / Current Instruction

The Program panel is a compact read-only view. In C++ subset mode it shows Generated CASL after assembly; otherwise it shows the current source program. The current row is highlighted with an arrow.

The Display panel represents program output. Since this phase still has no OUT instruction, it shows `No output`. It does not show PR or other internal registers as fake output.

The Current Instruction panel shows:

- mnemonic
- raw instruction text
- short semantic meaning
- PR / MAR / FR summary
- run state badge

## Circuit Visual Style

The circuit continues to use the same `CometCircuitSvg`, but the focus shell gives it the largest area on screen. The SVG now uses a more instrument-like surface:

- clearer module borders
- less floating shadow
- active row fill for GR and Memory rows
- a wider Memory panel
- a target address badge instead of cramped debug text
- a subdued grid background only in Focus Mode

## SP Semantic Rule

SP is displayed in the top control/address layer, but it remains independent. Ordinary arithmetic, load, store, compare, jump, and fetch paths do not activate SP.

Future stack instructions can add SP-specific active paths, but this phase intentionally keeps SP inactive.

## Memory / GR Row Targeting

Memory and GR row anchors remain the source of truth for active path endpoints.

- LD points Memory row -> MDR -> GR row.
- ADDA/SUBA/logic operations point GR row and Memory row through MDR/ALU, then back to GR and FR where applicable.
- ST points GR row -> MDR -> Memory row.

The Focus Mode screenshots should make these endpoints visible without needing to inspect DOM attributes.

## Timeline And Trace

Focus Mode includes a teaching timeline:

1. Fetch
2. Decode
3. Operand Read
4. Execute
5. Write Back
6. Next

This is a display-level teaching aid derived from the current VM state. It does not change VM execution.

Trace remains the detailed record of executed steps. Focus Mode shows a compact recent trace, while the normal Trace tab remains the full inspector view.

## Current Limitations

- Focus Mode is a presentation layout, not a separate simulator.
- The timeline is a simplified teaching view, not a micro-operation simulator.
- Display remains inactive until an OUT-like instruction is supported.
- Circuit paths are still SVG bus paths, not an electrical timing diagram.

## Future Polish Notes

- Add optional full-screen focus presentation.
- Add manual zoom for the circuit.
- Add stack-specific SP paths when stack instructions are implemented.
- Add a true control-signal legend if the teaching material needs it.
