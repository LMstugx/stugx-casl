# Future Custom Circuit Design

This document is a design note. The current application does not implement a custom circuit editor.

## Why Custom Circuit May Be Useful

The fixed COMET-II circuit is useful for early study because it keeps attention on instruction execution. Later, advanced students may want to test how different hardware blocks, probes, or routing choices affect understanding.

The long-term goal is to support exploration without turning stugx.CASL into a full electronic design automation tool.

## Target Users

- Lower-year students: use the fixed circuit and guided lessons.
- Advanced students / fourth-year projects: test circuit visualization ideas.
- Teachers: prepare fixed templates for explanation.

## Future Components

Potential component types:

- Register
- Memory
- ALU
- Adder
- Comparator
- Logic Gate
- Mux
- Probe

## Component Contract

Each component should define:

- inputs
- outputs
- anchors
- signal type
- current value
- update rule
- routing lane preference

Anchors should have semantic roles such as:

- input
- output
- bidirectional
- address
- data
- control
- flag

## Supported Direction First

The project should grow in stages:

1. fixed templates
2. module visibility toggles
3. probe nodes
4. configurable routing overlays
5. later drag-and-drop editing

## Current Non-Goals

The current phase does not implement:

- drag-and-drop components
- user-defined wires
- custom simulation semantics
- new CASL instructions
- altered COMET-II execution behavior

The current typed anchor and bus-lane metadata is only groundwork for future visualization work.

Future routing should keep the Phase 8L rules:

- route from anchor to anchor
- use bus lanes instead of ad hoc lines
- avoid unrelated module bodies
- use one terminal arrow for active flow
- use junction dots for merge points

Phase 9B adds a first `InstructionPathTemplate` layer. Future custom-circuit work should build on that shape instead of duplicating instruction-specific if/else rendering. A template should describe the category, active modules, active anchors, route segment ids, and whether the path uses Memory, MDR, ALU/Shifter, FR, or control lanes.

The shift template is the current example for a non-memory operand path:

- GR row -> ALU/Shifter input
- shift count / effective address -> ALU/Shifter input
- ALU/Shifter output -> GR row
- flag output -> FR

This distinction matters for future templates such as index addressing and stack paths, where the visual route must explain the addressing source without pretending that every operand word is a Memory data read.

Phase 9C adds indexed operands, and Phase 9D visualizes the address computation with an Effective Address Unit. This is not a custom circuit editor, but it introduces the address-computation shape future templates should preserve:

- base operand word -> EAU.BASE
- index GR row -> EAU.INDEX
- EAU.SUM -> MAR / Memory row / PR / target GR depending on instruction category
- LAD and shift use the effective address as a value, not as a memory data read
- memory instructions highlight the effective Memory row, not the base operand row

Phase 9E adds stack-address infrastructure without stack execution semantics. Phase 9F connects the first real stack instructions, `PUSH` and `POP`, to that infrastructure. Phase 9G connects `CALL` return-address writes and stack-aware `RET` reads to the same stack route. Future stack templates should preserve this shape:

- SP -> MAR -> Memory[SP] is an address path, not an ALU data path
- Stack Preview stays read-only as a UI surface, but it now reflects real `PUSH` / `POP` / `CALL` / stack-`RET` stack reads and writes
- `SP` has output and adjustment anchors, but ordinary instructions keep it inactive
- stack templates should define whether they read memory, write memory, adjust SP, update PR, or preserve top-level finish behavior

The current stack template names are intentionally split by behavior: `stack-read` and `stack-write` are used by `POP` and `PUSH`; `call-return-address` and `return-pop-address` are used by `CALL` and stack-aware `RET`. Top-level `RET` keeps a separate finish path so old demos do not need a stack frame.
