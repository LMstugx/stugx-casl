# Phase 7A Generated Assembly and Machine Code View

Phase 7A strengthens the learning chain:

```text
C++ subset source
-> Generated CASL II Assembly
-> COMET II Machine Code
-> Execution state
```

No C++ syntax, CASL instruction, VM, WASM bridge, or Core DTO semantics changed in this phase. The new views are derived from existing UI state.

## Generated CASL II Assembly

The Generated CASL dock tab now shows structured assembly rows:

- line number
- label
- opcode
- operand
- mapping kind
- related C++ line

In C++ subset mode, the tab also states that the CASL II code was generated from the C++ subset source. CASL mode can still show assembly text without the generated-from-C++ note.

Current execution highlighting remains:

- current CASL line: strong highlight
- CASL range related to current C++ line: soft highlight
- generated labels and constants: muted style

## Machine Code View

The new Machine Code tab shows COMET II words for the current assembled program.

Columns:

- Address
- Word
- Source
- Label
- Meaning
- Related C++ line

Rows are derived from `CometState.sourceMap`, `CometState.memory`, and C++ to CASL mapping. The view intentionally shows only the current program-related region, not all 65536 memory words.

Highlight rules:

- PR address: current execution target
- IR words: currently loaded / just executed instruction words
- read address: last memory read
- write address: last memory write

## Code to Machine to Execution

The middle learning flow uses the same machine-code selector to display the current address, word, and meaning. In C++ subset mode the panel shows:

- current C++ line
- current generated CASL line
- current machine-code address and word
- current execution state

In CASL mode it shows CASL source line to machine code to execution state.

## Current Limits

- Related C++ line is available only for C++ subset generated CASL.
- Machine Code view is read-only.
- The view does not expose a full object-file format.
- Full 65536-word memory browsing remains the responsibility of the Inspector Memory viewer.

## Next Steps

- Add export/copy for generated CASL and machine code if needed for reports.
- Add hover explanations for opcode/register words and operand words.
- Add a compact instruction encoding legend.
