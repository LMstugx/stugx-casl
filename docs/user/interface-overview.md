# Interface Overview

- Audience: Users learning the application layout
- Status: Canonical
- Last reviewed version: 1.0.0
- Classification: Canonical
- Related: [Observation Modes](observation-modes.md), [Diagnostics](diagnostics.md), [Keyboard and Accessibility](../reference/keyboard-accessibility.md)

The application is one workbench that fills the window. The page itself does not scroll; each region scrolls on its own when its content is longer than the region.

## Regions

| Region | Where | What it holds |
| --- | --- | --- |
| Tool bar | Top | Show or hide the source pane, New, Open, Save, Circuit Focus, Assemble, Run, Step, Reset, Stop, the view switch, and the language selector |
| Source pane | Left | The built-in example selector, the CASL / C++ subset switch, the editor, the error list, the project modules, and the guided lesson of the selected example |
| Workspace | Middle and right | The COMET II datapath and, beside it, the data of the selected view |
| Output dock | Bottom | Output Log, Console, Messages, Generated CASL, and Machine Code |
| Control bar | Below the dock | Step in the current granularity, Run to breakpoint, the breakpoint and history counts, and the machine status |

The tool bar never executes source on load. Assemble, Run, Step, Reset and Stop are always explicit.

Below 1600 pixels of width the secondary commands (New, Open, Save, Circuit Focus) show their icon only. Their names stay in the tooltips and for assistive technology.

## Source pane

The source pane owns the current document. Dirty state is derived from document revisions. The pane can be hidden with the first button of the tool bar to give the workspace more room; the editor keeps its text, cursor and undo history while hidden.

Click a line number to set or remove a breakpoint on that line. Only a line that holds an instruction of the assembled program can carry one. Breakpoints belong to the page session: they are cleared when the program is assembled again or another document is opened, and they are never stored.

After a finished run the editor marks the line that was executed last and says so in words beside it.

## Datapath

The datapath shows the registers, the ALU, the address path, the controller, and a window of main memory. Buses are always drawn; a path is drawn in colour with an arrowhead only while the current step uses it. A value that the step rewrote keeps its previous value beside it. After a forward step the datapath plays the step once: the control signal, the value travelling along its path, and a pulse where it lands. A reverse step plays nothing. With "reduce motion" set in the operating system nothing moves.

The datapath also says in words what the run state means for the picture: not assembled yet, a stale picture after an edit, waiting for console input, finished, or stopped by an error. After an edit the data beside it is marked as belonging to the previous assembly.

## Views

The view switch in the tool bar selects what the workspace shows beside the datapath. All three views use the same assembled program and the same machine.

- Modern Studio: the Inspector with Registers, Memory, Source Map, and Trace. Circuit Focus replaces the Inspector with the Observation Workspace and its eight kinds of data.
- CASL Mode: instruction-level observation with number formats, reload commands, Reverse Instruction, Full Clear, register and memory editing, the stack, the Console, and the assembler output.
- COMET Mode: microcycle-level execution. The phase track and the current phase sit directly under the datapath, with Reverse Microstep and Reverse Instruction.

In the Observation Workspace, Show Both, Focus Circuit and Focus Data change how the space is divided. They never change the machine, the trace, or the history.

## Output dock

The dock can be collapsed to its tab row with the button at its right end; choosing a tab opens it again. When the program waits for console input, the dock opens the Console and puts the cursor in its field. When the input has been taken, the focus returns to where it was. The Messages tab shows the number of errors.

## Control bar

Step runs one instruction, or one microcycle in COMET Mode. Run to breakpoint runs until the next instruction to execute is on a breakpoint line, the program ends, or Stop is pressed; when it stops in front of a breakpoint the control bar says on which line and at which address. Continuing from a breakpoint does not stop on the same line again.

## Supported sizes

The workbench is designed for windows from 1180 to 1920 pixels wide. The datapath is never drawn narrower than 600 pixels. In CASL Mode on a window less than about 800 pixels high, the lower part of the datapath is reached by scrolling its column; hiding the source pane or collapsing the dock makes room for it.

Project Overview contains low-priority project information and the offline Changelog entry. The Changelog is not placed in the tool bar.
