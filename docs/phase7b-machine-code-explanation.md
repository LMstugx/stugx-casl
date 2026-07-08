# Phase 7B Machine Code Explanation

Phase 7B adds an explanation layer to the Machine Code tab. It does not change assembler encoding, VM execution, WASM bridge behavior, or C++ subset syntax.

## Why This Exists

The Machine Code tab already showed address and word values. For teaching, students also need to understand why a word has that value:

- which opcode is encoded
- which register field is encoded
- whether the next word is an operand address
- which label an operand address resolves to
- whether a word is instruction, operand, data, or reserved storage

## COMET II Word Structure

For the current stugx.CASL instruction subset, instruction words are explained as:

- high byte: opcode
- low nibble group: register field where applicable
- low nibble: index register field, currently shown as `none` / `x=0`
- next word: operand address for two-word instructions

`RET` is a single-word instruction. `DC` and `DS` are data/reserved words, not executable instruction encodings.

## Supported Encoding Metadata

The frontend explanation metadata covers the currently implemented subset:

- `LAD`, `LD`, `ST`
- `ADDA`, `SUBA`, `CPA`
- `JUMP`, `JZE`, `JNZ`, `JPL`, `JMI`
- `RET`
- `DC`, `DS`

This metadata lives in `src/core/instructionEncoding.ts`. It is read-only explanatory metadata and must stay aligned with the assembler encodings.

## Machine Code Explanation Panel

The Machine Code tab now has two parts:

- the machine-code table
- a Selected Word Explanation panel

By default, the panel selects the current `PR` row. Clicking another row updates the explanation.

For an instruction word, the panel shows:

- address
- word
- role
- opcode
- register
- index
- operand address
- source
- human-readable meaning
- binary text

For an operand word, the panel shows the operand address and resolved label when available. For data and reserved words, it explains the stored value or reserved storage.

## Current Limits

- Index register execution is not implemented in the current CASL subset; the field is shown as `none` when encoded as zero.
- This is not a bit-level visualizer yet.
- Machine-code explanation is derived from current source map rows and does not represent a full object file format.

## Next Steps

- Add a bit-level visualizer for opcode/register/index fields.
- Add hover tooltips in the circuit and learning-flow panels.
- Add copy/export actions only if reporting workflows require them.
