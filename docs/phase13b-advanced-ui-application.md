# Phase 13B: Advanced UI Application Pass

## Visual Audit Scope

Phase 13B applies the Phase 13A design-system foundation to the main v1.0 learning surfaces. It does not change runtime behavior, assembler behavior, VM behavior, WASM behavior, mock-core behavior, transpiler lowering, emitted CASL, CASL instruction coverage, or C++ subset syntax.

The audit covered normal IDE mode, Circuit Focus Mode, CPU Flow, Register / Stack, Code / Machine, generated CASL, machine code, inspector tabs, bottom dock tabs, and the primary screenshots at `1280x720`, `1440x900`, and `1920x1080`.

## Hierarchy Changes

The pass reduces the equal-weight dashboard look:

- Source, program, current instruction, circuit, inspector, trace, and bottom dock panels use shared header and surface treatment.
- FramePlan and slot-relation panels are visually tertiary teaching notes, not primary runtime panels.
- Current execution, selected navigation, changed values, and write/error states use distinct visual semantics.
- Empty states use compact text on muted surfaces instead of large blank white panels.

## Toolbar Grouping

The toolbar now reads as grouped engineering controls:

- file operations
- mode switch
- execution controls
- utility controls

The grouping is visual only. It does not add file import, save behavior, or new mode behavior. Assemble remains the strongest action, while Run / Step and Circuit Focus are restrained.

## Panel, Table, And Tab Application

Panels reuse the shared border, radius, header, surface, and focus language. Tables use common row density and sticky-header treatment. Tabs use a shared active style that is clear without high saturation.

Generated CASL and Machine Code rows distinguish:

- selected/current navigation rows
- current execution rows
- read rows
- write rows
- control targets

These distinctions are visual only and do not change table data.

## Circuit Styling

The Circuit Focus style keeps the clean-wire contract:

- no arrows
- no circular markers
- no ghost inactive wires
- active-flow wires only
- semantic-only and target-highlight paths are not drawn as SVG lines

Refinements are token-driven:

- active module fill uses a restrained execution color
- write state remains distinct from ordinary active state
- register and memory row highlights do not change row height
- EAU, ALU, FR, MDR, GR, and Memory modules share a calmer module vocabulary
- grid/background lines are subdued so they do not compete with active state

## State Color Semantics

Phase 13B uses these meanings consistently:

- blue: selection, navigation, current PR/current row focus
- warm amber: active execution and changed values
- green: success/read-ready state
- red: error, Stop, and write/critical operations
- muted gray: inactive, metadata, and empty-state text

Selected is not active execution. Changed is not error. Memory target is not write. Color is supported by border, weight, and row position so the UI does not rely on color alone.

## Typography

UI labels use the UI font tokens. Hex values, addresses, registers, and machine words use the mono value typography with tabular number behavior. Source title text is shortened to avoid hard clipping in narrow tool columns while retaining the full title.

## Motion

Motion stays functional:

- hover/focus transitions are short and subtle
- active wire animation is slower and lower contrast
- inactive wires do not animate
- reduced-motion disables wire animation
- visual-review-static freezes wire animation for deterministic screenshots

No decorative floating, glow, blur-heavy, or bounce animation was added.

## Accessibility

The pass preserves keyboard focus rings on toolbar buttons, tabs, details summaries, generated CASL slot badges, and Stack Frame View slot rows. Focus-visible state remains separate from selected and active execution state.

## Viewport Results

The application still supports the v1.0 desktop targets:

- `1280x720`
- `1440x900`
- `1920x1080`

At `1280x720`, the page may scroll vertically, but the UI should avoid horizontal overflow and should not reintroduce tiny nested scroll traps for learning cards. Large tables such as Inspector Memory, Generated CASL, and Machine Code may use bounded internal scrolling.

## Remaining Limitations

- Phase 13B is not a full redesign and does not replace the existing component structure.
- Some low-traffic legacy detail colors may remain until those areas are touched.
- No dark-mode redesign, localization, file import, save implementation, or custom circuit editor is included.
- FramePlan remains design preview and not runtime state.

## Phase 13C Recommendation

Phase 13C is documented in [phase13c-ui-consistency-accessibility-audit.md](phase13c-ui-consistency-accessibility-audit.md). It closes concrete contrast, keyboard tablist, pressed-state, compact-text, state-semantics, and `1280x720` overflow findings while retaining the clean-wire contract and existing product behavior.
