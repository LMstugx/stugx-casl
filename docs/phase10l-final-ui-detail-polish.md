# Phase 10L: Final UI Detail Polish

Phase 10L is a UI-only polish pass for Circuit Focus Mode and Observation Modes. It does not change CASL execution, assembler behavior, VM behavior, WASM behavior, C++ lowering, or Step / Run / Reset behavior.

## EAU Readability Polish

The Effective Address Unit remains a secondary address-computation module, but active indexed instructions now keep its three teaching rows readable:

- `BASE 0027`
- `INDEX GR2=0001`
- `EA 0028`

BASE, INDEX, and EA route labels are subtle lane labels, not new state. They clarify where each wire enters or exits the EAU without competing with the active instruction path.

## Signal Probe Label Cleanup

Signal Probe labels use short stable names instead of relying on harsh ellipsis:

- `Return` for return-address nodes
- `SP` for the stack pointer
- `MEM[SP]` or `MEM` for stack or memory nodes
- `EA`, `Base`, `Index`, `MDR`, `ALU.Y`, and concrete register names for circuit nodes

Longer meaning moves into the note column and native `title` text. The compact view still shows only the highest-priority rows.

## Call Stack Wording Cleanup

Call Stack details now use human-readable labels:

- `Return`
- `Stored at`
- `Routine`
- `Depth change`

Top-level RET uses `Mode: Top-level finish` and `Stack activity: none`. Stack-return RET uses explicit return-address wording rather than abbreviated edge text.

## Current Instruction Naming

The left primary card title is shortened to `Instruction` while the full `Current Instruction` meaning remains available through the title text. Runtime summary rows are split into stable pairs:

- Current PR / MAR
- Next PR / Next Instruction
- FR

Next instruction remains a secondary hint and keeps full text in `title`.

## Source Context Compact Behavior

CPU Flow Mode keeps Source Context as tertiary context. On shorter viewports it becomes a compact chip-like row so it does not collide visually with the Output dock or compete with Circuit and Current Instruction.

## Machine Code Explanation Height Fix

The selected Machine Code explanation now surfaces `Source` and `Meaning` at the top of the panel before lower-level decode fields. Compact docks should still show enough teaching value for CALL, RET, index, and shift instructions instead of only address and word.

## Trace Secondary-Note Rule

Trace rows keep the main / effect / note structure:

- latest row: secondary note may use up to two lines;
- history rows: secondary note stays one-line ellipsis;
- full text remains available through native `title`.

This keeps CALL / RET / PUSH / POP notes readable without turning old trace rows into log paragraphs.

## Stack Terminology Rule

Stack-related UI text uses consistent terms:

- PUSH: `Stack write`
- POP: `Stack read`
- CALL: `Return address write`
- stack RET: `Return address read`
- top-level RET: `Program finish`

These terms keep stack memory, return addresses, and ordinary memory targets distinct.

## Remaining Limitations

- Native `title` text remains the tooltip mechanism.
- Observation Modes are fixed presets rather than user-saved layouts.
- Very long custom labels can still require ellipsis, but the visible label should stay meaningful.
- The circuit remains a teaching schematic, not a transistor-level or PCB rendering.
