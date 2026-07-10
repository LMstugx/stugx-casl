# Circuit Visual Contract

This document is the long-term visual contract for Circuit Focus Mode. It is not a feature plan and it does not change assembler, VM, WASM, C++ lowering, or execution semantics. Its job is to keep future circuit polish consistent, readable, and teachable.

The guiding rule is simple: the circuit should explain the instruction that just executed without implying hardware behavior that the simulator does not perform.

Circuit Focus Mode may expose different Observation Modes for CPU flow, register/stack values, and code/machine mapping. These modes may hide or de-emphasize panels, but they must not change active-path semantics, anchor meanings, VM state, trace state, or the current/next instruction rule.

## 1. Routing Philosophy

All active paths must be derived from the current instruction category, current VM state, instruction path template, lane metadata, and stable anchors. Do not draw screenshot-specific paths.

Every visible route should answer four questions:

- What value or control signal is moving?
- Where does it start?
- Where does it end?
- Which hardware block participates?

The route must start from a semantic anchor and end at a semantic anchor. Row-level anchors are required for General Registers and Memory rows. Module-center fallback anchors are only acceptable for inactive guides or future placeholders.

Active routes should use orthogonal routing with clear endpoint anchors. If a route needs to bend, use lane-based turns rather than ad hoc diagonals. In v1.0, the default circuit view renders active-flow wires only. Inactive guide wires, semantic-only routes, target-highlight route templates, and debug/background connection paths are not drawn as SVG lines. Active wires do not use terminal arrow markers; direction is taught by active color/weight, module and row highlights, Current Instruction, Trace, Source Mapping, and Signal Probe.

Geometry convergence rules:

- Route construction snaps the first rendered point to `fromAnchor` and the final rendered point to `toAnchor`.
- Junction dots must sit on a route point or an exact route segment, not near it.
- Protected text/value rectangles such as GR values, Memory values/labels, MDR values, Source Mapping text, and ALU value boxes should not be crossed by active routes.
- Main active wires may render below modules to avoid covering text. Do not add terminal overlay paths to imply direction.
- Route endpoints must stop exactly at the anchor without inserting into protected module text/value regions.

## 2. Visual Hierarchy

Circuit Focus Mode uses three visual layers.

Primary layer:

- Current instruction
- Active data or control path
- Active GR row
- Active Memory row
- MDR when involved
- ALU or Shifter only when involved
- FR only when updated
- Current pipeline stage

Secondary layer:

- Program compact view
- Step Timeline
- compact Registers / Memory inspector
- latest Trace row
- Current Source Mapping
- Signal Probe and Call Stack summaries

Tertiary layer:

- bus labels
- inactive wires
- inactive status indicators
- old Trace rows
- Source Context detail
- footer hints
- background grid
- Output Log

Primary items must have the strongest contrast. Tertiary items must never compete with the active path.

## 3. Lane Definitions

The circuit uses named lanes so future instructions can reuse the same visual grammar.

- `addr lane`: PR, operand base address, EAU, MAR, and Memory address targeting. Active color is blue. It must not pass through the ALU.
- `ctrl lane`: Decoder, Controller, CALL, JUMP, conditional jump, PR target updates, and finish control. Active color is blue-gray or control blue. It must not be confused with data movement.
- `data-bypass lane`: direct data movement between Memory, MDR, and GR, used by LD, ST, POP, and similar non-compute transfers. It must avoid the ALU body.
- `data-compute lane`: data movement into ALU or Shifter inputs and out of ALU/Shifter results, used by arithmetic, logical, compare, and shift instructions.
- `flag lane`: ALU/Shifter flag output to FR. It is active only for instructions that update FR.
- `stack lane`: SP, MAR, Memory[SP], return-address write/read, PUSH, POP, CALL, and stack-aware RET. It may share parts of the address lane, but it must be visually identifiable as stack-related.

Bus labels such as DATA, ADDR, CTRL, and STACK should be subtle. They explain lane identity; they are not the main content.

## 4. Anchor Definitions

Stable anchors are part of the circuit API.

General Registers:

- Each GR0-GR7 row has left and right anchors.
- Read paths start at the row anchor of the source register.
- Write paths end at the row anchor of the target register.
- Argument registers GR1-GR3 may show argument badges, but they are still register rows.

Memory:

- Each visible memory row has left and right anchors.
- Read paths start from the effective Memory row anchor.
- Write paths end at the effective Memory row anchor.
- If the effective row is outside the small window, the route may end at a stable edge anchor with a target-address badge.

ALU / Shifter:

- Input anchors: inputA, inputB, shiftCount when present.
- Output anchors: outputY and flagOut.
- Compare operations may use ALU compare output to FR without GR writeback.

MDR:

- MDR has left and right data anchors.
- MDR is the transfer bridge for Memory data reads and writes.

MAR:

- MAR has address input and output anchors.
- MAR targets Memory rows by effective address.

EAU:

- Effective Address Unit anchors are BASE, INDEX, SUM.
- Use EAU for index addressing, stack target preparation when needed, and CALL/JUMP indexed targets.
- Active EAU display uses separate BASE, INDEX, and EA rows. Do not compress those values into one packed formula when the module is active.
- BASE and INDEX routes terminate at separate input anchors so students can see address operand and index register as different inputs.
- Active EAU rows must remain readable. Subtle BASE, INDEX, and EA wire labels may appear near the route endpoints, but they must not compete with the active path.

SP:

- SP has output and stack-to-MAR anchors.
- SP is inactive for ordinary LD, ST, arithmetic, logic, compare, LAD, shift, and non-stack jump instructions.

FR:

- FR has a flag input anchor.
- FR is active only when an instruction updates flags.

## 5. Instruction Category Rules

These rules are normative for visual behavior.

### LD

LD active modules are MAR, the effective Memory row, MDR, and the target GR row. ALU inactive for LD.

Routes:

- address path: base or effective address -> MAR -> Memory effective row
- data path: Memory effective row -> MDR -> target GR
- lanes: addr lane + data-bypass lane

Do not route LD through ALU or show FR activity.

### ST

ST active modules are the source GR row, MDR, MAR, and the effective Memory row. ALU inactive for ST.

Routes:

- address path: base or effective address -> MAR -> Memory effective row
- data path: source GR -> MDR -> Memory effective row
- lanes: addr lane + data-bypass lane + memory write row

The write arrow must terminate at the Memory row anchor.

### ADDA / SUBA / ADDL / SUBL / AND / OR / XOR

Arithmetic and logical operations activate source GR, Memory/MDR, ALU, target GR, and FR.

Routes:

- Memory effective row -> MDR -> ALU inputB
- source/target GR -> ALU inputA
- ALU outputY -> target GR
- ALU flagOut -> FR
- lanes: data-compute lane + flag lane

The ALU is a primary visual element only for these compute instructions.

### CPA / CPL

Compare operations activate source GR, Memory/MDR, ALU compare, and FR. There is no GR writeback.

Routes:

- Memory effective row -> MDR -> ALU inputB
- source GR -> ALU inputA
- ALU compare / flagOut -> FR
- lanes: data-compute lane + flag lane

Do not draw ALU outputY -> GR.

### LAD

LAD activates effective address computation and the target GR row. Memory data read is inactive.

Routes:

- base address or EAU.SUM -> target GR
- lane: addr lane or address-to-GR immediate lane

LAD must not imply Memory[effectiveAddress] was read.

### Shift

Shift instructions activate source GR, shift count or effective address, ALU/Shifter, target GR, and FR. Memory data read is inactive.

Routes:

- source GR -> ALU/Shifter inputA
- shift count or EAU.SUM -> shift-count input
- ALU/Shifter outputY -> target GR
- ALU/Shifter flagOut -> FR
- lanes: data-compute lane + flag lane

Shift count is an operand/effective address value, not Memory data.

### Index Addressing

Index addressing activates base address, index GR, EAU, MAR, and the Memory effective row for memory-access instructions. Use EAU for index addressing.

Rules:

- base address is secondary
- effective address is primary
- index GR row uses an index badge
- Memory highlight must be at the effective address, not the base address
- route: base + index GR -> EAU -> MAR -> Memory effective row
- lanes: addr lane, with data lane added only by the instruction category
- EAU display rows use `BASE`, `INDEX`, and `EA` labels. INDEX may use a subtle address-index visual style, but it remains an address path, not a data-compute path.

### PUSH

PUSH activates EAU/effective address, SP, MAR, and Memory[SP]. ALU inactive for PUSH.

Routes:

- effective address value -> stack write value
- SP decrement indicator -> MAR
- MAR -> Memory[new SP]
- stack write value -> Memory[new SP]
- lanes: stack lane + addr lane + memory write path

PUSH stores the effective address value itself, not Memory[effectiveAddress].

### POP

POP activates SP, MAR, Memory[SP], MDR, and target GR. ALU inactive for POP.

Routes:

- SP -> MAR -> Memory[old SP]
- Memory[old SP] -> MDR -> target GR
- SP increment indicator
- lanes: stack lane + data-bypass lane

POP does not update FR.

### CALL

CALL activates return address, SP, Memory[SP], and PR target. ALU inactive for CALL.

Routes:

- return address -> Memory[new SP]
- SP decrement indicator -> MAR -> Memory[new SP]
- target base/index/effective address -> PR
- lanes: stack lane + ctrl lane + addr lane

CALL should show both the pushed return address and the PR target, but the view must stay compact.

### RET Stack Return

Stack-aware RET activates SP, Memory[SP], and PR. ALU inactive for stack RET.

Routes:

- SP -> MAR -> Memory[old SP]
- Memory[old SP] -> PR
- SP increment indicator
- lanes: stack lane + ctrl lane + addr lane

This mode applies only when callDepth > 0.

### RET Top-Level Finish

Top-level RET activates finish state only. The stack path is inactive.

Rules:

- no SP activity
- no Memory[SP] read
- no fake return-address path
- show program finish as a control state

### C++ Function Call Lowering

C++ function call visualization uses the same CALL / RET stack semantics.

Rules:

- GR1-GR3 are argument registers
- GR0 is the return value register
- argument register activity must not be confused with stack arguments
- CALL path is shown as subroutine control flow
- function entry parameter saves are ordinary ST operations from GR1-GR3 to static namespaced parameter labels
- stack arguments are not supported yet and must not be implied

## 6. Text Overflow Rules

Text must never break the circuit layout.

- Labels and instruction names use ellipsis when narrow.
- Numeric values never wrap.
- Hex values stay monospaced and fixed width.
- Long explanation text belongs in secondary or collapsible panels.
- Signal Probe supports compact and detailed formats.
- Call Stack supports compact and detailed formats.
- Trace supports compact latest-row format and detailed full-trace format.
- No text may overflow card boundaries.
- Prefer shorter labels over smaller unreadable text.
- Phase 10E applies these rules with label / value / note rows for Signal Probe, summary/detail rows for Call Stack, and main/effect/note rows for Trace.
- Phase 10K keeps Signal Probe default view to at most three primary rows. Index scenes prioritize EA while BASE / INDEX detail stays collapsed by default. Stack and CALL scenes prioritize SP or return-address activity before lower-priority details.
- Trace history rows stay compact. The latest row may be more prominent, but it should not expand into a paragraph-like log card.
- Code / Machine tables separate primary columns from secondary columns: Generated CASL line / label / opcode / operand and Machine Code address / word / source are primary; mapping and meaning are secondary.
- Phase 10L refines final compact wording: Signal Probe labels use short stable names such as Return, SP, MEM[SP], EA, Base, Index, MDR, ALU.Y, and concrete GR names. Longer meaning belongs in the note column and `title` text instead of being visibly truncated into fragments.
- Call Stack details use natural labels: Return, Stored at, Routine, and Depth change. Avoid shorthand such as "last 0 -> 1" in visible UI.
- The Current Instruction card may use the shorter visible title "Instruction" to avoid useless truncation, while preserving the full meaning in `title` text.
- Machine Code selected-word explanations should surface Source and Meaning in the compact panel before lower-level decode fields.
- Latest Trace secondary notes may wrap to two lines; history rows stay one-line ellipsis with full `title` text.

Observation Mode density rules:

- CPU Flow may show Signal Probe and latest Trace as secondary context, but the circuit and active path remain primary.
- Register / Stack mode keeps GR, PR, SP, FR, Stack Preview, and Memory as primary. Signal Probe, Call Stack details, and Trace history should default to compact forms.
- Stack Frame View is tertiary in Register / Stack mode until real stack-frame lowering exists. It must state `Simple static locals`, keep `hasLiveFrame=false`, mark any FramePlan rows as `Design preview` / `Not runtime state`, and must not display fake live frame slot values.
- Signal Probe may show selected FramePlan slot relation notes, but those notes are explanatory only. They must not create active circuit paths, fake FP state, fake stack-frame local reads/writes, or fake live frame slot values.
- Code / Machine mode keeps Generated CASL, Machine Code, Trace, and Current Source Mapping primary. Do not duplicate mapping panels or show low-priority subroutine details in a way that squeezes the code tables.
- Compact cards should prefer closed details summaries, fewer primary rows, and complete values in `title` attributes over visible overflow.

If a value needs extra context, use a tooltip, secondary chip, or inspector detail rather than expanding the circuit module.

## 7. Active / Inactive Module Rules

Active means the module participates in the current instruction's actual visualized data or control path. It does not mean the module exists in the machine.

Rules:

- Inactive modules remain visible but low contrast.
- Active module fill and row highlight must be clear but not bright enough to hide text.
- Do not activate ALU for LD, ST, LAD, PUSH, POP, CALL, stack RET, top-level RET, NOP, or ordinary jump.
- Do not activate SP for ordinary memory, arithmetic, logic, compare, shift, LAD, or non-stack jump instructions.
- Do not activate Memory data rows for LAD, shift count, or jump target calculation unless the instruction truly reads or writes memory.
- Current row highlights must align with Trace latest row and Current Instruction.

When unsure, prefer showing less active state rather than implying false hardware participation.

## 8. Arrowless Wire Rules

Wire direction is explained by route endpoints plus the surrounding teaching context, not by terminal arrows.

- Active wires must not render terminal arrow markers, short-segment arrow overlays, or floating arrowheads in v1.0.
- Inactive guide wires must not render arrow markers.
- Inactive guide wires are hidden by default in v1.0. A full route debug overlay is future work and must remain off in the release UI.
- Semantic-only and target-highlight paths must not render as SVG lines in the default view.
- Endpoint direction must remain readable through active color/weight, module highlights, target row highlights, Current Instruction, Trace, Source Mapping, and Signal Probe.
- Junction dots are disabled by default. They are allowed only at explicit real split or merge points.
- Junction dots must sit on an actual SVG segment, stay away from endpoints, and never appear as orphan nodes.
- Memory must not render circular terminal markers, floating junctions, or Memory-side guide circles in v1.0.
- `mar-to-memory` is a target-highlight relation, not a visible active blue address wire. Use MAR activity, the Memory target badge, and the highlighted row to teach the address target.
- Visible Memory active wires should represent data movement: Memory row -> MDR, MDR -> Memory row, MDR -> ALU, GR -> MDR, or GR -> ALU.
- Do not add hidden terminal snippets, decorative caps, or orphan short stubs to make a route look connected.
- Data, address, control, flag, and stack paths may use different colors, but the palette must remain restrained.
- Animation, when enabled, must follow the route without changing the route geometry.
- Visual review static mode must freeze animation.
- Inactive guide wires must not animate.

## 9. Small Viewport Rules

Circuit Focus Mode must remain usable at 1280x720 and above.

- The active path remains visible before tertiary detail.
- Signal Probe, Call Stack, Source Context, and full Trace may collapse first.
- Program and Current Instruction remain visible.
- Numeric values keep monospaced fixed-width rendering.
- Memory and GR row anchors remain stable even when labels are truncated.
- No panel may require horizontal page scrolling in the normal Focus Mode layout.
- Bottom Output Log stays compact unless the user opens it.
- Large data tables such as Inspector Memory, Source Map, and full Trace may use bounded internal scrolling.
- Learning cards such as Signal Probe, Stack Frame View, Stack Preview, and compact Call Stack should expand naturally and must not trap ordinary details in tiny nested scroll regions.
- Inspector Memory must not force the entire Circuit Focus or IDE page to grow when the user selects 64 or more rows.

Small viewports should reduce detail density, not semantic accuracy.

## 10. Visual Review Checklist

Use visual review screenshots to check these points before accepting circuit changes.

LD:

- Current instruction, Program highlight, Source Mapping, Source Context, and latest Trace row all show LD.
- Memory effective row -> MDR -> target GR is the first visible data story.
- MAR and the Memory target badge may show the addressed row, but no long active Memory-side address wire should appear.
- ALU inactive for LD.

ST:

- source GR -> MDR -> Memory effective row is clear.
- write row is highlighted.
- Memory row entry uses a short horizontal data stub, with no circular marker in the Memory gutter.
- ALU inactive for ST.

Compute:

- ADDA/SUBA/ADDL/SUBL/AND/OR/XOR enter ALU through input anchors.
- ALU output returns to target GR.
- FR is active through flag lane.

Compare:

- CPA/CPL update FR.
- no GR writeback path is drawn.

Index:

- EAU shows base + index = effective address.
- Memory row highlight is effective address.
- base address is secondary.

Stack:

- PUSH writes effective address value to Memory[new SP].
- POP reads Memory[old SP] to GR.
- CALL writes return address and updates PR target.
- stack RET reads Memory[SP] to PR.
- top-level RET does not activate stack.
- Stack memory access follows the same Memory rule: no Memory-side circular marker and no long active address wire.
- Use consistent visible terminology: PUSH is Stack write, POP is Stack read, CALL is Return address write, stack RET is Return address read, and top-level RET is Program finish.

C++ function calls:

- GR1-GR3 argument register activity is visible before CALL.
- GR0 return value is visible after return.
- stack arguments are not shown.

Layout:

- no important text is covered by wires or arrows.
- inactive wires are de-emphasized.
- Signal Probe, Call Stack, and Trace remain compact.
- `1280x720`, `1440x900`, and `1920x1080` desktop viewports remain usable.
- Native details summaries, tabs, toolbar buttons, and machine-code rows have visible keyboard focus.
- Ellipsized instruction, symbol, mapping, trace, and explanation text exposes the complete value through `title` or `aria-label`.

## 11. Future Custom Circuit Rules

Future custom circuit work must follow this contract instead of inventing a separate visual language.

Future components must declare:

- inputs
- outputs
- anchors
- signal type
- current value
- update rule
- lane preference
- active/inactive rules

Future custom circuit rules:

- Fixed templates come before drag-and-drop editing.
- Probe nodes should reuse Signal Probe value formatting.
- User-created routes must still connect anchor to anchor.
- Custom modules must not bypass lane semantics unless explicitly configured.
- Stack-frame locals and stack arguments must use stack lane semantics.
- Pointer-like or array addressing must use EAU/address-lane semantics.
- CALL, RET, PUSH, and POP custom views must preserve stack behavior already defined here.
- A future schematic/lab style toggle may change appearance, but not the semantic contract.

The circuit can become more configurable later, but it must remain an accurate teaching view first.
