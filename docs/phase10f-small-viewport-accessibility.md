# Phase 10F: Small Viewport and Accessibility Polish

Phase 10F does not change CASL execution, C++ lowering, machine code encoding, or VM state. It is a presentation pass for Circuit Focus Mode after the Phase 10E text-overflow cleanup.

The goal is to keep the learning layout usable at smaller desktop viewports while making compact cards, tabs, and disclosure controls easier to operate with keyboard and screen-reader tooling.

## Viewport Targets

The checked desktop targets are:

- `1280x720`
- `1440x900`
- `1920x1080`

At `1280x720`, Circuit Focus Mode keeps the same three-column layout but tightens spacing:

- toolbar padding and button spacing are reduced
- Focus Mode column gaps are reduced
- timeline and right-side compact card heights are reduced
- the bottom Output Log dock is kept compact

The circuit panel remains the primary center panel. Source/program context, Signal Probe, Call Stack, Stack Preview, Trace, and Output Log stay readable without horizontal overflow.

## Keyboard and Focus Rule

Keyboard focus must be visible on:

- toolbar buttons
- source mode buttons
- demo selector
- Output Log / Generated CASL / Machine Code tabs
- Inspector tabs
- machine-code rows
- Signal Probe details
- Call Stack details
- Demo Guide / Guided Lesson / Project Overview summaries

The focus ring is intentionally simple: a blue outline with a faint outer ring. It should be visible enough for keyboard use without changing the lab-style visual hierarchy.

## Ellipsis and Title Rule

Phase 10E introduced compact text rules. Phase 10F makes the completion behavior explicit:

- long instruction text uses `title`
- long function labels use `title`
- Generated CASL label / operand / mapping / flow cells use `title`
- Machine Code source / meaning / explanation cells use `title`
- Signal Probe notes use `title`
- Call Stack return-edge text uses `title`
- Trace main/effect/note rows use `title`
- the Source Editor demo selector uses `title` and `aria-label`

Native browser tooltips are enough for this phase. No tooltip library is introduced.

## Details Accessibility Rule

Disclosure controls remain native `<details>` / `<summary>` controls where possible.

Signal Probe details:

- summary has `aria-expanded`
- summary has `aria-controls`
- summary can be opened with keyboard
- closed state keeps the compact summary readable

Call Stack details:

- summary has `aria-expanded`
- summary has `aria-controls`
- summary can be opened and closed with keyboard
- default state remains open because return-edge details are teaching-relevant

This is intentionally lightweight. It is not a full custom disclosure system.

## Tab Accessibility Rule

Output and Inspector tabs now expose:

- `role="tablist"`
- `role="tab"`
- `aria-selected`
- `aria-controls`
- matching `role="tabpanel"`
- `aria-labelledby`

The current tab remains the only tabbable tab in the tab group. Mouse behavior and existing Playwright interactions remain unchanged.

## Visual Review Expectations

When running visual review, check:

- `project-overview`: summary controls remain compact
- `casl-gr2-ld`, `casl-gr2-adda`, `casl-gr2-st`: circuit readability is unchanged
- `index-addressing-circuit`: EAU and Signal Probe do not overflow
- `push-pop-stack-circuit`: Stack Preview and Signal Probe do not overlap
- `call-return-call`, `call-return-ret-stack`: Call Stack detail rows remain readable
- `cpp-function-arguments-generated-casl`: long generated labels have ellipsis and titles
- `cpp-function-arguments-trace`: trace rows stay structured
- `machine-code-explanation`: long explanation text stays inside the panel

The visual-review static mode still freezes signal-flow animation.

## Current Limitations

- Native `title` tooltips are simple and browser-dependent.
- Arrow-key tab navigation is not customized yet.
- The compact right column scrolls vertically when many cards are expanded at small heights.
- No automated visual diff is used; screenshots are still reviewed manually.

## Future Accessibility Tasks

- Add arrow-key tab navigation for Output and Inspector tab groups.
- Add a consistent non-native tooltip component only if native `title` becomes insufficient.
- Add keyboard shortcuts documentation for Assemble / Step / Run / Reset.
- Add optional high-contrast theme checks for Circuit Focus Mode.
