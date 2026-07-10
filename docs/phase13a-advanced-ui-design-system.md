# Phase 13A: Advanced UI Design System Foundation

## Goal

Phase 13A establishes a shared visual foundation for the v1 line. It does not add product features and does not change assembler, VM, WASM, mock core, transpiler, emitted CASL, or execution semantics.

The goal is to make the studio feel like a mature engineering learning tool rather than a one-off demo: restrained surfaces, consistent density, stable typography, predictable focus states, and a circuit style that follows the v1.0 clean-wire contract.

## Design Principles

- Use design tokens before adding new one-off colors, spacing, shadows, or font sizes.
- Keep the existing page structure and Observation Modes intact.
- Prefer quiet hierarchy over bright decorative styling.
- Preserve readability at 1280x720, 1440x900, and 1920x1080.
- Do not hide content to make the UI look cleaner.
- Keep active and selected states consistent across toolbar buttons, tabs, table rows, circuit rows, and cards.

## Token System

The foundation lives in `src/styles/tokens.css`.

Color tokens cover:

- `--color-background`
- `--color-surface`
- `--color-surface-muted`
- `--color-border`
- `--color-border-strong`
- `--color-text-primary`
- `--color-text-secondary`
- `--color-text-muted`
- `--color-accent`
- `--color-success`
- `--color-warning`
- `--color-danger`
- `--color-active-data`
- `--color-active-control`
- `--color-active-flag`
- `--color-memory-highlight`
- `--color-register-highlight`

Spacing tokens use the 2 / 4 / 6 / 8 / 12 / 16 / 20 / 24 / 32 scale:

- `--space-2`
- `--space-4`
- `--space-6`
- `--space-8`
- `--space-12`
- `--space-16`
- `--space-20`
- `--space-24`
- `--space-32`

Radius tokens use `--radius-small`, `--radius-medium`, `--radius-large`, and `--radius-pill`. Shadow tokens use `--shadow-none`, `--shadow-card`, `--shadow-floating`, and `--shadow-focus`. Typography tokens cover app title, panel title, section title, body, caption, mono value, and table cell. Motion tokens keep fast, normal, slow, and reduced-motion behavior explicit.

Existing variables such as `--color-bg`, `--color-text`, `--radius-sm`, and `--shadow-card` remain as aliases so current UI code stays stable.

## Component Style Rules

Toolbar:

- Buttons share height, border, focus, hover, active, disabled, primary, success, and danger treatment.
- Active Circuit Focus state is restrained and should not dominate the page.
- Icon and text spacing comes from shared spacing tokens.

Cards and panels:

- Panels use shared surface, border, radius, and card shadow tokens.
- Header spacing and title type are consistent.
- Empty states should look intentional, compact, and quiet.

Tables:

- Table rows use shared density and table-cell typography.
- Sticky headers use muted surface tokens.
- Current, changed, read, write, selected, and hover states should not change row height.
- Scrollbars must not cover values or labels.

Tabs:

- Active tabs are clear but not high-chroma.
- Inactive tabs are quiet and retain keyboard focus visibility.

Focus-visible:

- Keyboard focus uses the shared focus shadow token.
- Focus treatment must not conflict with selected row or active tab styling.

## Circuit Visual Rules

Phase 13A keeps the Phase 12D clean-wire contract:

- no arrows
- no circular marker
- no ghost inactive wires
- active-flow only
- Memory target-highlight does not draw an SVG line

Allowed refinements are token-driven:

- module fill and border tokens
- active module fill and border tokens
- row read/write highlight tokens
- active data/control/flag wire tokens
- EAU readability and inactive weakening through shared text and module colors
- ALU / FR styling that remains clear but not visually loud

Circuit polish must not imply hardware paths that the simulator does not execute. LD and ST still avoid ALU involvement. ADDA/SUBA/logical/compare paths still use ALU. CALL/RET stack paths remain the only real return-address stack path.

## Accessibility

The design system preserves keyboard access:

- toolbar buttons
- segmented controls
- tab buttons
- details summaries
- slot rows
- Generated CASL slot badges

Native `title` and `aria-label` coverage remains the preferred first-pass tooltip strategy. Reduced motion must disable active wire motion, and visual review mode must freeze animations.

## Limitations

This phase does not introduce a component library, CSS-in-JS, theme editor, dark mode redesign, localization, file import, save support, or a custom circuit editor. Some legacy direct color values remain in non-core detail areas and can be migrated gradually when touched.

## Future Phase 13B

Recommended next work:

- audit remaining raw detail colors and migrate high-traffic components
- refine IDE mode density after Focus Mode remains stable
- define a small reusable empty-state pattern
- improve table column density in Generated CASL and Machine Code without changing data
- review icons and labels for consistency across toolbar and dock tabs
