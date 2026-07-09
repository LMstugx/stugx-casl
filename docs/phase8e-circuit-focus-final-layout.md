# Phase 8E: Circuit Focus Final Layout

This phase tightens the COMET-II circuit view without changing assembler, VM, WASM, or transpiler semantics.

## Final Layout Principles

- Keep modules fixed across instructions.
- Use a three-layer layout: control/address, execution/data, and flags.
- Prefer orthogonal bus-style paths over decorative curves.
- Route active wires to row-level anchors whenever the target is a register row or memory row.
- Keep visual emphasis useful for study: active paths should clarify data movement, not dominate the panel.

## Top Control / Address Layer

The top layer contains:

- `IR`
- `PR`
- `+2`
- `SP`
- `MAR`

`PR -> MAR` is the default address/fetch relationship. `PR -> +2` represents normal PR advancement.

## SP Semantic Rule

`SP` is shown as an independent register in the address/control area.

Current limitations:

- No `PUSH`
- No `POP`
- No `CALL`
- No stack-oriented instruction path

Because of that, `SP` is not part of the active default fetch path. It remains visible but inactive during ordinary load/store/arithmetic/control-flow instructions. Future stack instruction work can add explicit `SP` active paths.

## Execution / Data Layer

The execution layer contains:

- General Registers
- `ALU`
- `MDR`
- Memory

General Registers and Memory expose row-level anchors so paths can target the exact `GRx` row or memory address row.

## Memory Row Anchors

The circuit memory panel is a small execution-context window. It is separate from the detailed Inspector Memory Viewer.

Rules:

- If the active address is inside the window, active paths land on that row.
- The window follows the current read/write/MAR focus address.
- Rows expose read/write/PR/MAR state for visual tests and browser smoke tests.
- If a larger range is needed, use the Inspector Memory tab.

## Register Row Anchors

Each `GR0` through `GR7` row has left and right anchors.

Instruction examples:

- `LD GRr,addr`: `MDR -> GRr`
- `ST GRr,addr`: `GRr -> MDR`
- `ADDA/SUBA/ADDL/SUBL/AND/OR/XOR`: `GRr -> ALU input A`, `ALU output -> GRr`
- `CPA/CPL`: `GRr -> ALU input A`, flags update only

## ALU / MDR / FR Anchors

The ALU has:

- `inputA`
- `inputB`
- `outputY`
- `flagOut`

`MDR` has left/right anchors and an output-to-ALU anchor. `FR` has an input anchor for flag updates.

## Active Path Color Rule

- Data paths use the active data color when selected.
- Address/control paths use the control/address style.
- Inactive wires stay low contrast.
- Active wires are intentionally thinner than module borders and do not sit above module text.

## Instruction-Specific Path Semantics

- `LD`: `MAR -> Memory row`, `Memory row -> MDR`, `MDR -> GR row`
- `ST`: `GR row -> MDR`, `MAR -> Memory row`, `MDR -> Memory row`
- Arithmetic/logical ALU instructions: `GR row -> ALU`, `Memory row -> MDR -> ALU`, `ALU -> GR row`, `ALU -> FR`
- `CPA/CPL`: same input path as ALU operations, but only `FR` is updated
- `LAD`: address/immediate value path to GR, no fake memory read
- `JUMP/JZE/JNZ/JPL/JMI/JOV`: control path to `PR`
- `RET`: no fake memory read/write path
- `NOP`: sequential execution, no data path

## Current Limitations

- The circuit memory panel is intentionally small.
- It does not render all 65536 memory words.
- Stack paths are not shown until stack instructions are implemented.
- The circuit view remains a teaching diagram, not a complete hardware timing diagram.
