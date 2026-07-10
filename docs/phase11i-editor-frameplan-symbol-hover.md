# Phase 11I: Editor FramePlan Symbol Hover

Phase 11I adds a lightweight editor-side relation surface for FramePlan symbols. It remains design-only and does not implement stack-frame locals, stack arguments, live frame slot values, FP runtime state, new C++ syntax, emitted CASL changes, VM changes, assembler changes, WASM changes, or mock-core changes.

## Purpose

FramePlan slots can already be selected from Stack Frame View, Source Context chips, and Generated CASL `slot` badges. Phase 11I adds an editor-side entry point so students can start from a C++ symbol and inspect how it relates to the current lowering and future stack-frame design.

## Design-Only Symbol Relation

The symbol relation comes from FramePlan metadata and C++ source text:

- C++ symbol name;
- function name;
- slot kind;
- source line / source column when available;
- current static label;
- current circuit relation;
- future frame-slot relation;
- future stack slot note;
- runtime state marker.

This relation is not runtime state.

## Supported Symbol Types

The first version supports:

- function parameters;
- local variables.

Return-address pseudo slots are not editor symbols. Function-name selection is left for future work.

## Current Static Label Relation

Current C++ lowering still uses static labels:

- `a` can map to `FUNC_ADD_A`;
- `b` can map to `FUNC_ADD_B`;
- `result` can map to `MAIN_RESULT`.

Argument symbols also show the current register argument path, such as `GR1 -> FUNC_ADD_A`.

## Future Stack Slot Relation

The same symbol can describe future storage:

- argument -> frame argument slot;
- local -> frame local slot.

This is a future design target only. It is not emitted and is not used by the VM.

## Editor Decoration Policy

This phase intentionally avoids a full Monaco semantic-highlighting plugin. The implemented surface is a lightweight Related Frame Symbols panel attached to the Source Editor and reused in Code / Machine mode. It provides native `title` text for hover-like explanation and keyboard-accessible buttons for selection.

This keeps editing behavior stable and avoids modifying the Monaco model or source text.

## Fallback Related-Symbols Panel

The fallback panel displays compact symbol markers such as:

```text
a argument
b argument
result local
```

Activating a marker selects the corresponding FramePlan slot. Stack Frame View highlights the slot, Slot Detail shows the selected source as `Source Editor`, and Signal Probe shows the design-only relation.

## No Emitted CASL Change

Selecting an editor symbol does not change generated CASL or current C++ lowering. Regression tests assert emitted CASL remains unchanged after symbol relation wiring.

## No Runtime Value

The UI must keep saying runtime frame values are not available in simple mode. No fake live slot value, fake FP state, or fake stack-frame local path may be shown.

## Limitations

- No Monaco hover provider yet.
- No inline editor decoration range rendering yet.
- The first version uses a compact related-symbols panel rather than click-on-token behavior.
- Invalid C++ source hides the relation safely.
- CASL mode does not show editor frame symbol markers.

## Future Work

- Monaco hover provider for C++ symbols.
- Inline symbol underlines with low-contrast decorations.
- Click C++ token -> select FramePlan slot.
- Generated CASL jump-to-slot polish.
- Live stack-frame values after advanced stack-frame lowering exists.
