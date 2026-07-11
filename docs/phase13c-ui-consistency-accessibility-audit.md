# Phase 13C: UI Consistency and Accessibility Audit

## 1. Audit Scope

Phase 13C audits the established Phase 13A/13B design system across the App Shell, Toolbar, Source Editor, learning panels, Circuit Focus, all three Observation Modes, Inspector, Output Dock, Generated CASL, Machine Code, Signal Probe, Stack Preview, Stack Frame View, Trace, and empty/error/disabled/selected states. The desktop viewport targets remain `1280x720`, `1440x900`, and `1920x1080`.

This phase is UI-only. It does not change runtime behavior, emitted CASL, assembler, VM, WASM, mock core, transpiler lowering, CASL instruction coverage, or C++ subset syntax.

## 2. Contrast Findings

The audit found that warning text used the bright warning accent directly on a pale warning surface, disabled controls lost contrast through opacity, and some muted metadata was marginal on the application background. The token layer now provides a darker warning text color, an explicit disabled text color, a focus-ring color, and a darker muted text color.

Disabled controls remain visibly disabled through surface, cursor, and border treatment without reducing text opacity. Trace history, FramePlan chips, Stack Preview headings, and circuit status metadata retain secondary hierarchy while remaining readable.

## 3. Keyboard And Focus Findings

Inspector, Output Dock, and Observation Mode use horizontal tablists. They now support `ArrowLeft`, `ArrowRight`, `Home`, and `End`, move focus with selection, and expose `aria-orientation="horizontal"`. The active tab remains the single tab stop.

Circuit Focus exposes `aria-pressed` in both on and off states. Frame slot rows and Machine Code selection controls use pressed-state semantics. The non-interactive Step Timeline no longer appears as a disabled button in the keyboard order. Native `details` / `summary` controls continue to support Enter and Space.

Focus-visible remains distinct from selected and active execution state through the shared focus token and does not replace the selected background or execution border.

Reduced-motion and visual-review-static now disable component animations and transitions globally, not only wire dash motion. This prevents unnecessary motion and stabilizes full-page capture compositing.

## 4. Overflow And Clipping Findings

Long high-traffic panel titles preserve their full wording through `title`. Mono values remain single-line, tabular, and ellipsized when required. FramePlan badges, source symbol chips, Stack Preview headings, and trace metadata use readable compact sizes instead of 9px fallback text.

The `1280x720` browser check now verifies global horizontal overflow in CPU Flow, Registers / Stack, and Code / Machine modes. Existing title and ellipsis rules remain in place for instructions, labels, mappings, Machine Code meaning, and Trace notes.

## 5. Viewport Findings

Focus Mode continues to use natural document scrolling at `1280x720`; learning cards expand in normal flow. The `1440x900` and `1920x1080` layouts preserve the same information architecture with additional breathing room. No Observation Mode column architecture was changed.

Visual review covers the three desktop targets and now includes CASL diagnostics, C++ diagnostics, and the Stopped state in addition to initial, ready, stepped, and finished learning scenes.

## 6. State Consistency

The retained state matrix is:

- blue for selection and navigation
- amber for active execution
- warm changed-value treatment for changed data
- green for read/success
- red for write/error/Stop
- muted neutral surfaces for metadata, disabled controls, and empty states

Generic table `current` and `changed` rows no longer share the same rule. Circuit changed rows and active modules also use separate tokens. Toolbar group separators use explicit semantic classes instead of button position selectors.

## 7. Scroll Behavior

Signal Probe, Stack Preview, and Stack Frame View continue to expand naturally and do not create tiny nested scroll regions. Inspector Memory, long Source Map and Trace views, Generated CASL, Machine Code, and code/source surfaces may use bounded internal scrolling. Inspector Memory remains bounded and does not stretch the Circuit canvas or the page.

## 8. Circuit Contract Status

The Circuit Visual Contract remains unchanged:

- no terminal arrows
- no circular wire markers
- no ghost inactive wires
- active-flow only
- semantic-only and target-highlight paths do not render SVG lines
- Memory targets use MAR state, badges, and row highlights
- reduced-motion and visual-review-static disable wire animation

No circuit routing or execution-path semantics changed in Phase 13C.

## 9. Fixes Made

- Added shared horizontal tab keyboard navigation.
- Corrected pressed/selected accessibility semantics.
- Removed a fake interactive Timeline control from Tab order.
- Improved warning, muted, disabled, and focus contrast tokens.
- Separated active execution from changed-value styling.
- Replaced fragile Toolbar positional grouping with explicit group classes.
- Raised undersized high-traffic metadata text.
- Added real browser checks for keyboard navigation and 1280 overflow.
- Added diagnostic and Stopped-state visual review scenes.

## 10. Remaining Acceptable Limitations

- Native `title` remains the first-pass full-text tooltip; this is not a full custom tooltip system.
- There is no full screen-reader or automated axe audit yet.
- Monaco uses its own theme API and still contains a small separate color mapping.
- Some low-traffic legacy raw colors remain and should migrate only when those components are touched.
- Visual review is a deterministic gallery, not a committed pixel-diff baseline.

## 11. Recommendation Before I18n

The current UI is safe for a separate Phase 14A i18n architecture design, provided that localization work begins with string inventory, message-key structure, and text-expansion rules. Phase 14A should not combine translation work with layout redesign, file operations, runtime changes, or Circuit routing changes.

Phase 14A now continues this recommendation in [phase14a-i18n-architecture.md](phase14a-i18n-architecture.md) and freezes the technical/string boundary in [i18n-string-boundary.md](i18n-string-boundary.md).
