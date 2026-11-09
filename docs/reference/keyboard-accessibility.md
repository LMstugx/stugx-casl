# Keyboard and Accessibility

- Audience: Keyboard users, testers, and UI maintainers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Interface Overview](../user/interface-overview.md), [Diagnostics](../user/diagnostics.md)

- Toolbar actions and locale controls are keyboard reachable and have accessible names.
- Locale buttons expose the current selection without changing layout dimensions.
- Tabs use the established tablist/selection semantics and retain visible focus.
- Execution mode and Observation Data use separate labelled groups. Auxiliary tabs use horizontal keyboard navigation and never move focus during automatic data following.
- Show Both, Focus Circuit, Focus Data, and Follow Execution are keyboard reachable. Focus Data retains an accessible live Circuit.
- Diagnostic rows expose selection and severity as text, not color alone.
- Related diagnostic locations are keyboard actionable.
- Dialogs, including Changelog and Dirty replacement, trap focus, close with Escape where permitted, and restore focus to their trigger.
- Disclosure controls are operable with keyboard and expose expanded state.
- Reverse Instruction is keyboard reachable in CASL and COMET modes; Reverse Microstep remains exclusive to COMET Mode. Disabled barrier reasons are text, and a successful reverse keeps focus on its control.
- Reduced-motion preference removes nonessential circuit animation.

Long technical content uses bounded scrolling with usable heights, stable scrollbar gutters, and safe wrapping. The application must not create horizontal page overflow at the supported desktop viewports.

## Workbench Shortcuts (v2)

The v2 workbench adds global execution shortcuts. They are registered here before implementation and take effect only once the workbench shell replaces the current toolbar. Until then the application has no global execution shortcut.

| Key | Action |
| --- | --- |
| Space | Step at the current execution granularity |
| Shift+Space | Reverse Instruction |
| F5 | Run |
| F6 | Stop |
| Ctrl+Enter | Assemble |
| Ctrl+S | Save |

- A shortcut does nothing while focus is inside the source editor, a text input, a select, or an open dialog.
- A shortcut never bypasses a disabled control. It follows the same availability and reports the same barrier reason as the control it stands for.
- Each shortcut is shown in the tooltip of its control.
- Shortcuts are fixed. They are not configurable and nothing about them is persisted.
