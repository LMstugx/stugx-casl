# Keyboard and Accessibility

- Audience: Keyboard users, testers, and UI maintainers
- Status: Canonical
- Last reviewed version: 1.0.0
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

## Workbench Shortcuts

The workbench has global execution shortcuts. They are in effect in every view.

| Key | Action |
| --- | --- |
| Space | Step at the current execution granularity |
| Shift+Space | Reverse Instruction |
| F5 | Run |
| F6 | Stop |
| Ctrl+Enter | Assemble |
| Ctrl+S | Save |

- A shortcut does nothing while focus is inside the source editor, a text input, a select, or an open dialog.
- Space and Shift+Space also do nothing while focus is on a button, a tab, a checkbox, or a disclosure summary: there Space keeps its usual meaning and activates the focused control.
- A shortcut never bypasses a disabled control. It follows the same availability as the control it stands for; when the command is unavailable the key does nothing.
- While focus is in the workbench, the keys belong to the workbench whether or not the command is available: F5 does not reload the page, Ctrl+S does not open the browser's save dialog, and Space does not scroll. Reload the page with the browser's own reload button or Ctrl+R.
- Holding a key down does not repeat the command.
- Each shortcut is shown in the tooltip of its control. The step shortcut is also shown on the step button of the control bar.
- Shortcuts are fixed. They are not configurable and nothing about them is persisted.

### Breakpoints

- A breakpoint is set or removed by clicking a line number in the source editor, or by pressing F9 while the cursor is on the line. F9 works inside the editor only.
- Only a line that holds an instruction of the assembled program can carry a breakpoint. Other lines ignore the click.
- A breakpoint is shown as a filled dot beside the line number and a tinted line. The control bar shows the number of breakpoints and has a button that removes all of them.
- Run to breakpoint is a button on the control bar. When execution stops in front of a breakpoint, the control bar says so in a polite live region, with the line and the address.
- Breakpoints belong to the page session. They are cleared when the program is assembled again or another document is opened, and they are never stored.
