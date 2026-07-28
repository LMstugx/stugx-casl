# Keyboard and Accessibility

- Audience: Keyboard users, testers, and UI maintainers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Interface Overview](../user/interface-overview.md), [Diagnostics](../user/diagnostics.md)

- Toolbar actions and locale controls are keyboard reachable and have accessible names.
- Locale buttons expose the current selection without changing layout dimensions.
- Tabs use the established tablist/selection semantics and retain visible focus.
- Diagnostic rows expose selection and severity as text, not color alone.
- Related diagnostic locations are keyboard actionable.
- Dialogs, including Changelog and Dirty replacement, trap focus, close with Escape where permitted, and restore focus to their trigger.
- Disclosure controls are operable with keyboard and expose expanded state.
- Reverse Instruction is keyboard reachable in CASL and COMET modes; Reverse Microstep remains exclusive to COMET Mode. Disabled barrier reasons are text, and a successful reverse keeps focus on its control.
- Reduced-motion preference removes nonessential circuit animation.

Long technical content uses bounded scrolling with usable heights, stable scrollbar gutters, and safe wrapping. The application must not create horizontal page overflow at the supported desktop viewports.
