# Visual RC Baseline

This document freezes the current visual review release-candidate baseline for Circuit Focus Mode and Observation Modes. It is documentation only and does not change runtime behavior, UI implementation, assembler behavior, VM behavior, WASM behavior, C++ lowering, or tests.

## Baseline Identity

- Visual RC commit: `a6ce8a4`
- Baseline tag: `visual-rc-phase10l`
- Baseline phase: Phase 10L final UI detail polish

The tag marks the visual state after the Observation Mode split, geometry convergence, visual defect cleanup, and final micro-polish passes.

## Baseline Screenshots

The visual RC baseline is checked through these visual review scenes:

- `observation-cpu-flow`
- `observation-register-stack`
- `observation-code-machine`
- `index-addressing-circuit`
- `push-pop-stack-circuit`
- `call-return-call`
- `machine-code-explanation`
- `cpp-function-arguments-generated-casl`

Screenshots are generated locally under `artifacts/visual-review/` and must not be committed.

## Future UI Modification Rules

All future Focus Mode, Circuit, and Observation Mode UI changes must follow `docs/circuit-visual-contract.md`.

Do not break the Observation Mode information architecture:

- CPU Flow keeps circuit movement and active paths primary.
- Registers / Stack keeps GR, PR, SP, FR, Stack Preview, and Memory numeric state primary.
- Code / Machine keeps Source, Generated CASL, Machine Code, Trace, and mapping primary.

Do not reintroduce overflow or density regressions:

- EAU rows and route labels must remain readable.
- Signal Probe labels must stay short, stable, and meaningful.
- Call Stack wording must stay human-readable.
- Trace rows must keep their compact main / effect / note structure.
- Generated CASL and Machine Code tables must preserve primary/secondary column hierarchy.

Do not commit visual review artifacts, screenshots, generated gallery files, or temporary zip uploads to the main project branch.

## Baseline Review Notes

This baseline represents the current accepted teaching UI, not a pixel-perfect lock. Small future corrections are allowed when they fix a concrete defect, but they must preserve the semantic visual rules above and should be validated with visual review before merging.

Known limits remain:

- Native `title` text is the tooltip mechanism.
- Observation Modes are fixed presets, not user-saved layouts.
- Very long user-defined labels can still require ellipsis.
- The circuit is a teaching schematic rather than a physical hardware rendering.
