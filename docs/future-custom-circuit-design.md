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

Phase 9E adds stack-address infrastructure without stack execution semantics. Phase 9F connects the first real stack instructions, `PUSH` and `POP`, to that infrastructure. Phase 9G connects `CALL` return-address writes and stack-aware `RET` reads to the same stack route. Phase 9H adds a compact Call Stack and return-edge explanation on top of the same runtime facts. Future stack templates should preserve this shape:

- SP -> MAR -> Memory[SP] is an address path, not an ALU data path
- Stack Preview stays read-only as a UI surface, but it now reflects real `PUSH` / `POP` / `CALL` / stack-`RET` stack reads and writes
- `SP` has output and adjustment anchors, but ordinary instructions keep it inactive
- stack templates should define whether they read memory, write memory, adjust SP, update PR, or preserve top-level finish behavior
- teaching surfaces should distinguish a CALL target from a return address, and a stack RET from a top-level RET finish

The current stack template names are intentionally split by behavior: `stack-read` and `stack-write` are used by `POP` and `PUSH`; `call-return-address` and `return-pop-address` are used by `CALL` and stack-aware `RET`. Top-level `RET` keeps a separate finish path so old demos do not need a stack frame.

Phase 10A connects no-argument C++ function-call lowering to the same `CALL` / stack-aware `RET` route. At that phase, the C++ side still used static namespaced data labels such as `MAIN_X` and `ADDONE_X`; it did not create stack-frame locals, arguments, or recursive frames. Future custom-circuit work should treat Phase 10A as a teaching bridge, not as a complete function-frame model.

Phase 10B documents the future C++ calling convention, Phase 10C implements the first concrete argument path, and Phase 10D extends that path to register arguments in `GR1`, `GR2`, and `GR3`. The current stable convention is `GR0` for return values and `GR1`-`GR3` for the first three arguments. Stack arguments and stack-frame locals are reserved for later phases. Future custom-circuit templates should therefore keep three concepts visually separate:

- `GR0` return value path
- `GR1` / `GR2` / `GR3` current register argument paths
- later stack-frame slots for arguments and locals

Do not show stack-frame locals or stack arguments in a circuit template until the transpiler and teaching UI actually lower C++ parameters to those locations. The current register-argument lowering stores `GR1` / `GR2` / `GR3` into static parameter labels such as `FUNC_ADD_A` and `FUNC_ADD_B`; those labels are not real stack-frame locals.

Phase 11A documents the future stack-frame locals design without implementing it. That design keeps the current simple static-locals lowering as the default and proposes a later advanced mode with frame bounds, optional FP / frame pointer, argument slots, local variable slots, temporary slots, and a Stack Frame View. Custom-circuit templates should not expose those frame components until a later implementation phase makes them real runtime or lowering artifacts.

Phase 11B adds the design scaffold for future `StackFramePlan` and `FrameSlot` metadata. Custom circuit probes should eventually be able to observe frame-slot reads and writes, but only after the compiler emits stack-frame lowering metadata and the UI has a real Stack Frame View. Until then, custom probes should keep using the existing stack, SP, return-address, register-argument, and static-label views.
