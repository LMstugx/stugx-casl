# Phase 10E: Focus Mode Text Overflow Cleanup

Phase 10E is a UI readability pass. It does not add C++ syntax, CASL instructions, VM behavior, assembler behavior, WASM bridge behavior, or Step / Run / Reset semantics.

This phase follows `docs/circuit-visual-contract.md`: semantic accuracy stays first, the current execution path remains the primary visual object, and compact cards must not imply hardware behavior that did not happen.

## 1. Why Text Overflow Cleanup Was Needed

After C++ function arguments, CALL / RET, stack preview, index addressing, and Signal Probe were all visible in Circuit Focus Mode, several small panels started carrying too much text:

- Signal Probe could show GR, BASE, index, EA, MAR, MDR, Memory target, SP, return address, and call depth at once.
- Call Stack had depth, mode, top return, storage row, routine, and return edge text in cramped cells.
- Trace rows carried long CALL / RET / index details as a single log-style sentence.
- Learning Flow cards showed too much explanatory text for a narrow teaching strip.
- Current Instruction mixed mnemonic, raw instruction, semantic note, PR, MAR, next instruction, and FR in one dense block.
- Generated CASL and Machine Code tables could contain long function labels such as `FUNC_ADDONE_X` or `FUNC_ADD_B`.

The fix is not to hide learning information. The fix is to make each surface choose compact defaults and expose details in secondary rows, tooltips, or collapsed sections.

## 2. Text Category Rules

Numeric value:

- examples: `0028`, `FFFD`, `0001 -> 0014`
- monospace
- no wrapping
- fixed-width rendering where possible
- ellipsis is allowed only when the container is too narrow

Instruction / symbol / label:

- examples: `CALL FUNC_ADDONE`, `FUNC_ADDONE_X`, `LD GR1,A,GR2`
- single-line by default
- ellipsis when narrow
- full text in `title`
- never overflow card boundaries

Explanation text:

- examples: `Program finish`, `base + index`, `Return address write`
- can wrap
- secondary color
- does not sit in the same column as a primary numeric value unless space is reserved

Metadata label:

- examples: `Return`, `RET mode`, `Effective address`
- short by default
- uppercase compact labels are acceptable
- must not push the primary value out of the card

Shared CSS utilities:

- `.text-ellipsis`
- `.mono-value`
- `.compact-label`
- `.secondary-note`
- `.nowrap-symbol`
- `.wrap-explanation`
- `.compact-grid`
- `.card-overflow-safe`

Every flex or grid child that can contain long text should use `min-width: 0`.

## 3. Signal Probe Compact Design

Signal Probe now uses compact rows instead of multiple side-by-side mini boxes.

Default shape:

```text
Signal Probe
Read-only nodes

GR2        0001        selected register
EA         0029        base + index
MDR        0007        memory buffer
MEM[0029]  0007        target memory
SP         FFFE        stack preview only
```

Rules:

- show the most relevant active rows first
- use label / value / note columns
- keep values monospace
- ellipsis long labels and notes
- move extra rows into a `+ N more` details section
- do not create fake rows for unavailable data
- keep stack information compact unless the current instruction uses stack activity

## 4. Call Stack Compact Design

Call Stack now uses a summary plus detail rows.

Default shape during stack return context:

```text
Call Stack
Depth 1
Mode Stack return

Return      0024       Return address read
Stored at   MEM[FFFD]  Return to 0024 from MEM[FFFD]
Routine     SUB        current / target
Depth change 1 -> 0
```

Default shape at top level:

```text
Call Stack
Depth 0
Mode Top-level finish

Return      none       Stack activity: none
Stored at   none       Program finish
Routine     MAIN       current / target
Depth change none
```

Rules:

- depth and mode are the summary
- return, storage row, routine, and depth change are detail rows
- top-level RET does not imply stack access
- long routine labels use ellipsis
- stack return vs top-level finish remains visible

## 5. Trace Row Structure

Trace rows use a stable three-line structure.

Line 1: main event

```text
#4 CALL FUNC_ADDONE
#6 RET stack return
```

Line 2: primary effect

```text
target 002C; return 0024
PR <- MEM[FFFD] 0024
GR0: 0000 -> 0006
```

Line 3: secondary note

```text
SP: FFFE -> FFFD | callDepth: 0 -> 1 | State: Ready
```

Rules:

- latest row is strongest
- history rows are lower contrast
- long notes use ellipsis
- CALL / RET / PUSH / POP / index details remain readable without turning each row into a paragraph

## 6. Learning Flow Card Rules

Learning Flow stays a compact pipeline summary.

Rules:

- each card has title, one short label, and one core value
- long source/CASL/machine text uses ellipsis and `title`
- fallthrough is shown as `Flow: fallthrough`
- CALL is shown as `Flow: call -> FUNC_ADDONE`
- jumps show their target label or address
- finished RET appears as `Flow: finish` in the Now Executing card
- detailed explanation belongs in Machine Code, Trace, or Control Flow panels

## 7. Current Instruction Layered Structure

Current Instruction has three layers.

Instruction header:

- mnemonic
- raw instruction
- pipeline stage badge

Semantic:

- one short meaning, for example `GR1 <- MEM[A + GR2]`
- no paragraph-length explanation

Runtime summary:

- Current address
- MAR
- Next PR
- FR
- secondary Next Instruction

Next PR and Next Instruction are secondary hints. They must not become the main highlighted instruction.

## 8. Table Overflow Rules

Generated CASL:

- line and C++ columns stay narrow
- label, operand, mapping, and flow columns ellipsis when needed
- full text is available through `title`
- long function labels such as `FUNC_ADDONE_X` must not push the table past the dock

Machine Code:

- address and word are monospace and fixed
- source and label columns ellipsis
- meaning column ellipsis in the table
- selected word explanation uses compact key/value rows
- long meaning text can wrap in the wide explanation row, but not overflow

Memory:

- address / value / label / mark stay separated
- address and value do not wrap
- label and mark ellipsis

Registers:

- register names and numeric values do not wrap
- any source/context column must ellipsis if added later

## 9. Small Viewport Rules

At 1280x720 and similar narrow review sizes:

- Source Editor header must not crop demo names into meaningless fragments
- demo selector uses a stable min/max width and full title
- Signal Probe details can collapse
- Call Stack details stay vertical
- Trace history weakens before latest row loses clarity
- Output Log remains compact in Focus Mode
- tables may scroll inside the dock, not push the whole app horizontally

## 10. Relation To Circuit Visual Contract

This phase implements the text portions of the Circuit Visual Contract:

- numeric values never wrap
- instruction and symbol names use ellipsis
- long explanations move to secondary rows or collapsible details
- Signal Probe, Call Stack, and Trace have compact and detailed forms
- no text may overflow card boundaries

Future UI work should update the contract first when it needs a new text category or compact/detailed pattern.
