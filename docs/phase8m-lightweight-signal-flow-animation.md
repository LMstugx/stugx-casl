# Phase 8M: Lightweight Signal Flow Animation

Phase 8M adds a small visual cue to the existing Circuit Focus Mode active wires. It does not change the compiler, assembler, VM, WASM bridge, routing geometry, or Step / Run / Reset behavior.

## Why This Was Added

After Phase 8L, the circuit routing was semantically correct and visually stable. The remaining issue was that active wires still looked completely static. A subtle flow cue helps students see direction without adding new information or turning the circuit into an effects-heavy animation.

The goal is:

- LD: Memory row -> MDR -> GR
- ADDA / SUBA / logic: GR and MDR -> ALU -> GR / FR
- ST: GR -> MDR -> Memory row
- Jump family: control/address path -> PR

## Active Path Only Rule

Only active wires receive the signal-flow styling.

Inactive guide wires stay static and low-emphasis. This keeps the current instruction as the visual focus and avoids making the whole circuit look busy.

## Semantic Class Rule

Flow classes are derived from existing wire metadata:

- `semanticType: data` -> `circuit-wire--data-flow`
- `semanticType: address` -> `circuit-wire--addr-flow`
- `semanticType: control` -> `circuit-wire--ctrl-flow`
- `semanticType: flag` -> `circuit-wire--flag-flow`

The component does not inspect instruction names to choose animation classes. LD, ST, ADDA, JUMP, and related instructions inherit the correct styling from the active `WirePath` metadata.

## Reduced Motion Support

The CSS respects:

```css
@media (prefers-reduced-motion: reduce)
```

In reduced-motion mode, the active path remains highlighted but the flow animation is disabled.

## Visual Review Static Mode

Visual review screenshots must be stable. The Playwright visual review spec adds `visual-review-static` to the document root and body before capture.

That class disables signal-flow animation while preserving the active path styling. Normal application usage keeps animation enabled by default.

## Current Limitations

- The flow cue is CSS-based and does not represent micro-cycle timing.
- Each instruction still appears as one executed step, not as a simulated internal clock sequence.
- There is no user-facing animation speed control yet.
- Signal Probe remains read-only and separate from this animation.

## Future Direction

Possible future work:

- signal evolution graph
- custom circuit probe points
- configurable circuit display
- optional animation speed / pause controls
- later micro-cycle visualization if the VM state model is extended
