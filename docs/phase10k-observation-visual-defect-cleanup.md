# Phase 10K: Observation Visual Defect Cleanup

Phase 10K is a UI-only convergence pass for Circuit Focus Mode and Observation Modes. It does not change CASL semantics, C++ lowering, assembler behavior, VM behavior, WASM behavior, or Step / Run / Reset behavior.

## Defect Scope

The cleanup targets defects found in the post-geometry visual review:

- Effective Address Unit input lines were hard to read.
- EAU text was too weak for index-addressing lessons.
- Signal Probe became dense in index, stack, and call scenes.
- Trace rows had too much height variance.
- Code / Machine Mode tables gave secondary columns too much visual weight.
- Long labels and notes still needed stronger overflow rules.
- Some address routes ran too close to EAU and neighboring module edges.
- Observation Mode secondary cards needed one more level of de-emphasis.

## EAU Visual Fixes

EAU now uses a compact three-row embedded status format:

- `BASE 0027`
- `INDEX GR2=0001`
- `EA 0028`

BASE input, INDEX input, and EA output remain separate anchors. The index input route uses a distinct address-index style so it reads as address computation, not ALU data compute.

## Signal Probe Density Fixes

Signal Probe now prioritizes at most three primary rows in the default compact view. Index scenes prioritize the selected register and `EA`; BASE and INDEX move to Details. Stack and CALL scenes prioritize SP, stack/return value, and the most relevant memory node. Details remain available but closed by default.

## Trace Compacting

Trace rows retain the main / effect / note structure, but history rows are tighter and latest rows remain the only high-emphasis row. Long trace text uses ellipsis and native titles instead of growing the card.

## Code / Machine Table Hierarchy

Code / Machine Mode now separates table columns into primary and secondary roles:

- Generated CASL primary: line, label, opcode, operand.
- Generated CASL secondary: mapping.
- Machine Code primary: address, word, source.
- Machine Code secondary: meaning.

Secondary columns are narrower, muted, and ellipsized with full `title` text.

## Text Overflow Fixes

The cleanup continues the Phase 10E text rules:

- numeric values stay monospaced and nowrap;
- instruction and symbol labels use ellipsis plus `title`;
- explanatory text wraps only in the intended secondary areas;
- flex and grid children keep `min-width: 0`;
- compact cards use vertical rows instead of crowded inline chips.

## Route Spacing Fixes

EAU routes now use dedicated input/output clearance:

- BASE enters the BASE anchor directly.
- INDEX uses a separate address-index lane before entering the INDEX anchor.
- EA output exits through a short clearance lane before turning toward MAR or PR.

The route tests cover endpoint snapping, EAU text avoidance, and minimum padding.

## Remaining Limitations

- This is still a teaching schematic, not a physical PCB layout.
- Native `title` tooltips are used; no custom tooltip system is introduced.
- The visual review can still reveal small per-viewport refinements, especially for very long user-defined labels.
- Observation Modes are fixed presets; saved custom panel layouts remain future work.
