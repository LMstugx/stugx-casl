# Visual Review Screenshot Gallery

Visual review is a local tool for checking stugx.CASL UI details without changing the product code or execution semantics.

It captures key learning states with Playwright, then builds a local HTML gallery under `artifacts/visual-review/`.

## Why Visual Review Exists

The app now has several visual teaching surfaces:

- Circuit Focus Mode
- Generated CASL II Assembly
- Machine Code
- Machine Code explanation
- Control Flow
- Trace
- Memory Viewer
- Guided Lesson / Project Overview

Screenshots make it easier to review these surfaces on another device, including a phone, before deciding whether UI polish is actually needed.

## Capture Screenshots

Run:

```powershell
pnpm visual:capture
```

This will:

1. Print the current git status.
2. Clear `artifacts/visual-review/`.
3. Run `pnpm visual:review`.
4. Capture screenshots for `1440x900` and `1920x1080`.
5. Generate `artifacts/visual-review/index.html`.

The screenshot spec uses the Mock backend for stable visual output.

Circuit Focus Mode normally uses a lightweight signal-flow animation on active wires. The visual review spec adds a `visual-review-static` class before each screenshot so active state remains highlighted while wire motion, component animations, and transitions are frozen for stable review.

Phase 13A adds an advanced UI design-system foundation. Phase 13B applies that foundation across the main UI. Visual review should confirm that toolbar controls, panel cards, tabs, tables, circuit modules, and active circuit rows use the shared token vocabulary and still preserve the Phase 12D clean-wire contract: no arrows, no dots, no ghost inactive wires, and active-flow wires only.

Phase 13C adds keyboard, contrast, state-consistency, clipping, and viewport audit coverage. The gallery includes CASL and C++ diagnostic states plus a max-step Stopped state so warning, error, disabled, selected, and active execution treatments can be reviewed together.

Phase 14C adds English, Japanese, and Simplified Chinese Circuit Focus captures across CPU Flow, Register / Stack, and Code / Machine modes. Review translated compact labels for overlap and clipping while confirming that circuit geometry, source, Generated CASL, machine words, register names, addresses, and clean-wire behavior remain unchanged.

## Open Gallery Locally

After capture, open:

```text
artifacts/visual-review/index.html
```

Or start a local server:

```powershell
pnpm visual:serve
```

The script prints:

- Local URL: `http://127.0.0.1:8765/`
- LAN URL: `http://<PC-LAN-IP>:8765/`
- process ID and stop command

## View From Phone On Same Wi-Fi

Use the printed LAN URL:

```text
http://<PC-LAN-IP>:8765/
```

If the phone cannot connect:

- confirm the phone and PC are on the same Wi-Fi
- confirm Windows firewall allows the local server
- run `ipconfig` and check the PC IPv4 address

The script does not modify firewall settings.

## Remote / Different Network

If the phone is not on the same network, LAN URL usually will not work.

Use an existing tunnel tool if one is already installed, for example:

```powershell
cloudflared tunnel --url http://localhost:8765
```

Other options include Tailscale or VS Code port forwarding.

This phase does not install tunnel tools automatically.

## What To Check

Use the gallery to inspect:

- Circuit Focus screenshots include Program, Display, Current Instruction, Circuit, Registers, Trace, and Timeline together.
- Observation Mode screenshots split the same runtime state by learning purpose: CPU Flow for circuit movement, Registers / Stack for numeric state, and Code / Machine for source-to-machine mapping.
- Switching Observation Mode must preserve VM state, current instruction, trace, source, generated CASL, and lesson progress.
- Program, Current Instruction, Current Source Mapping, Source Context, and the newest Trace row agree on the same last executed instruction.
- PR and Next Instruction are visible only as secondary hints.
- Machine state and pipeline stage are labeled separately.
- Memory target state points to the active memory row through MAR activity, the Memory target badge, and the highlighted row. Do not expect a long active `MAR -> Memory` address wire.
- GR highlight points to the active GR row.
- Active wires do not use terminal arrows in v1.0; read direction from endpoint anchors, active color/weight, module highlights, target row highlights, Trace, and Signal Probe.
- Default Circuit SVG screenshots show active-flow wires only. Inactive guide routes, semantic-only paths, and target-highlight templates should not appear as ghost SVG lines.
- Active wires may flow in the live app, but visual review screenshots intentionally freeze that animation.
- Junction dots are disabled by default; if one appears, it must be an explicit semantic branch or merge point, not an orphan marker.
- Memory-side circular terminal markers and guide circles must not appear in v1.0 screenshots.
- `DATA BUS`, `ADDR BUS`, and `CTRL` lanes are visible but not visually noisy.
- LD / ST data-bypass paths avoid the ALU body.
- ST writeback lands at the Memory row edge instead of crossing value or label text.
- Memory data flow uses short row stubs for read/write and avoids a long vertical wire in the Memory gutter.
- READ / WRITE / EXEC / FLAG indicators match the visible active path.
- Signal Probe is compact and derived from the current instruction / recent trace.
- Stack Preview is compact, read-only, and shows real `PUSH` / `POP` / `CALL` / stack-`RET` stack read/write rows.
- The SP -> MAR -> Memory route is hidden during ordinary execution and appears only when the stack path is active for stack instructions and stack-aware returns.
- Older Trace rows are lower emphasis than the latest row.
- Output Log remains available but compact in Focus Mode.
- SP is visible but inactive for ordinary execution.
- LD and ST do not make the ALU look active; ADDA and related ALU instructions do.
- Shift screenshots show the ALU/Shifter path and do not mark Memory as the shift-count data source.
- Index addressing screenshots show the `IDX` register badge, Effective Address Unit, base/index/effective calculation, and effective Memory row highlight.
- Effective Address Unit screenshots should show separate `BASE`, `INDEX`, and `EA` rows, with BASE and INDEX lines landing on different input anchors.
- Effective Address Unit active rows should be readable, and subtle `BASE`, `INDEX`, and `EA` route labels should clarify the input/output meaning without dominating the active path.
- PUSH / POP screenshots show `SP`, Stack Preview, stack row write/read, and Machine Code explanations that distinguish effective address values from memory data.
- CALL / RET screenshots show return-address stack writes, stack return reads, PR target changes, Call Stack depth, return edge text, and the final top-level `RET` finish.
- Nested CALL screenshot shows `callDepth` greater than 1 and last-in-first-out return order context.
- C++ function-call screenshots show `FUNC_ADDONE`, `CALL FUNC_ADDONE`, GR0 return value convention, and CALL / RET rows in Trace.
- C++ function-argument screenshots show `LAD GR1,5`, `ST GR1,FUNC_ADDONE_X`, the `GR1` first-argument convention, and final `GR0 = 0006`.
- C++ function-arguments screenshots show `LAD GR1,2`, `LAD GR2,3`, `ST GR1,FUNC_ADD_A`, `ST GR2,FUNC_ADD_B`, and final `GR0 = 0005`.
- Signal Probe uses compact label / value / note rows; extra values appear in details instead of overlapping.
- Signal Probe should show no more than three primary rows by default; index BASE / INDEX details and lower-priority stack/call details should stay collapsed.
- Signal Probe labels should be meaningful short names such as `Return`, `SP`, `MEM[SP]`, `EA`, `Base`, `Index`, `MDR`, or `ALU.Y`; avoid visible fragments such as `RETAD...`.
- Call Stack uses summary and detail rows; depth, RET mode, return address, and routine remain readable.
- Call Stack details should use readable wording such as `Return`, `Stored at`, `Routine`, and `Depth change` instead of terse internal abbreviations.
- Signal Probe and Call Stack details can be focused and opened with the keyboard.
- Focus rings are visible on toolbar buttons, tabs, details summaries, and machine-code rows without dominating the layout.
- Toolbar actions are visually grouped into file, mode, execution, and utility areas without crowding the 1280x720 layout.
- Selected, active execution, changed, read, write, warning, error, and disabled states remain visually distinct.
- FramePlan and slot-relation panels read as tertiary design-preview teaching notes, not as primary runtime state.
- Empty states use compact shared wording and muted surfaces rather than large blank panels.
- Inspector Memory uses bounded internal scrolling for large row counts and must not stretch the main Circuit panel or create a large blank page below the SVG.
- Ellipsized labels, instructions, operands, and explanation text expose the full value through native `title` text.
- Trace rows show main event, primary effect, and secondary note without overflowing the card.
- Trace history rows should stay compact while the latest row remains visually prominent. The latest secondary note may use up to two lines when needed for CALL / RET / PUSH / POP context.
- Learning Flow cards use short values such as `Flow: fallthrough` or `Flow: call -> FUNC_ADDONE`.
- Long labels in Generated CASL and Machine Code use ellipsis rather than pushing table columns out of the dock.
- Code / Machine Mode tables should make primary columns readable and secondary mapping / meaning columns muted and ellipsized.
- Machine Code explanation is readable.
- Selected Machine Code explanation should show at least Address, Word, Source, and Meaning in compact dock layouts.
- Control Flow target text is readable.
- Source Editor is not squeezed.
- Right Inspector remains usable.
- At `1280x720`, Focus Mode should keep the selected observation mode usable without horizontal overflow.
- Visual review captures `1280x720`, `1440x900`, and `1920x1080`.
- Trace still shows break / continue / loop movement clearly.

## Captured Scenes

- `project-overview.png`
- `ui-casl-diagnostic-error.png` (CASL assembly diagnostic state)
- `ui-cpp-diagnostic-error.png` (C++ subset diagnostic state)
- `diagnostics-en-casl.png`, `diagnostics-ja-casl.png`, and `diagnostics-zh-cn-casl.png` (structured CASL diagnostic rendering)
- `diagnostics-en-cpp.png`, `diagnostics-ja-cpp.png`, and `diagnostics-zh-cn-cpp.png` (structured C++ diagnostic rendering)
- `diagnostics-ja-1280.png` and `diagnostics-zh-cn-1280.png` (CJK diagnostic wrapping without horizontal overflow)
- `ui-stopped-state.png` (max-step Stopped state)
- `ui-keyboard-focus.png` (selected Inspector tab with visible keyboard focus)
- `ui-locale-selector.png` (Japanese locale selected with intentional English fallback in the Phase 14A pilot)
- `locale-en-1280.png` (English shell baseline at 1280x720)
- `locale-ja-1280.png` (Japanese pilot strings at 1280x720)
- `locale-zh-cn-1280.png` (Simplified Chinese pilot strings at 1280x720)
- `locale-ja-output-dock.png` (Japanese Output Dock tabs and compact controls)
- `locale-zh-cn-inspector-memory.png` (Simplified Chinese Inspector Memory controls and bounded table)
- `locale-en-cpu-flow.png` (English Circuit Focus compact-label baseline)
- `locale-ja-cpu-flow.png` and `locale-zh-cn-cpu-flow.png` (localized CPU Flow)
- `locale-ja-register-stack.png` and `locale-zh-cn-register-stack.png` (localized Register / Stack)
- `locale-ja-code-machine.png` and `locale-zh-cn-code-machine.png` (localized Code / Machine)
- `locale-ja-signal-probe.png` (Japanese Signal Probe compact grid)
- `locale-zh-cn-stack-frame.png` (Simplified Chinese Stack Frame compact labels)
- `observation-cpu-flow.png` (CPU Flow observation mode)
- `observation-register-stack.png` (Registers / Stack observation mode)
- `stack-frame-view-preview.png` (FramePlan design preview in Stack Frame View; not runtime state)
- Code / Machine mode may show FramePlan `slot` badges beside Generated CASL static labels. They are design-only selection controls and must not imply live stack-frame values.
- `observation-code-machine.png` (Code / Machine observation mode)
- `casl-gr2-ld.png` (Circuit Focus Mode)
- `casl-gr2-adda.png` (Circuit Focus Mode)
- `casl-gr2-st.png` (Circuit Focus Mode)
- `index-addressing-circuit.png` (Circuit Focus Mode)
- `index-addressing-machine-code.png` (Machine Code explanation)
- `stack-preview-focus.png` (Circuit Focus Mode)
- `push-pop-stack-circuit.png` (Circuit Focus Mode)
- `push-pop-stack-machine-code.png` (Machine Code explanation)
- `call-return-call.png` (Circuit Focus Mode)
- `call-return-ret-stack.png` (Circuit Focus Mode)
- `call-return-finish.png` (Circuit Focus Mode)
- `call-return-machine-code.png` (Machine Code explanation)
- `nested-call-return.png` (Circuit Focus Mode)
- `cpp-function-call-generated-casl.png`
- `cpp-function-call-trace.png`
- `cpp-function-call-machine-code.png`
- `cpp-function-argument-generated-casl.png`
- `cpp-function-argument-trace.png`
- `cpp-function-argument-machine-code.png`
- `cpp-function-arguments-generated-casl.png`
- `cpp-function-arguments-trace.png`

Phase 14B locale captures verify that Toolbar width remains stable, tabs do not wrap, Inspector labels do not overlap, empty states can wrap safely, and technical source/CASL/value typography does not change. Locale switching must not alter Circuit SVG paths or the clean-wire contract.
- `cpp-function-arguments-machine-code.png`
- `cpp-addition-generated-casl.png`
- `machine-code-explanation.png`
- `for-sum-control-flow.png`
- `break-continue-trace.png`
- `logic-operations-machine-code.png`
- `logical-add-compare-jov.png`
- `shift-operations-circuit.png`
- `shift-operations-machine-code.png`

## Current Limitations

Phase 14E adds `diagnostic-range-casl.png`, `diagnostic-range-cpp.png`, `diagnostic-related-location.png`, `diagnostic-eof.png`, `diagnostic-ja-long.png`, `diagnostic-zh-cn-long.png`, and `diagnostic-1280.png`. Review these for precise token/insertion selection, related-location hierarchy, safe CJK wrapping, stable editor geometry, and no horizontal overflow. Circuit clean-wire geometry remains unaffected.

Phase 14F adds `diagnostics-parser-en.png`, `diagnostics-parser-ja.png`, `diagnostics-parser-zh-cn.png`, `diagnostics-long-token.png`, `diagnostics-1280-ja.png`, and `diagnostics-1280-zh-cn.png`. Review safe wrapping, token/range selection, Details hierarchy for code/producer/raw context, and unchanged Circuit geometry.

Phase 14G replaces the obsolete generated-label legacy capture with `diagnostic-p2-en.png`, `diagnostic-p2-ja.png`, `diagnostic-p2-zh-cn.png`, `diagnostic-p2-related-location.png`, and `diagnostic-long-technical-token.png`. Review the localized sentence, verbatim function/CASL label, stable primary and related locations, safe long-label wrapping, and 1280px horizontal containment. Only the actually migrated P2 diagnostic is captured.

Phase 14H adds `diagnostic-baseline-en.png`, `diagnostic-baseline-ja.png`, `diagnostic-baseline-zh-cn.png`, `diagnostic-generated-label-conflict.png`, `diagnostic-legacy-fallback.png`, `diagnostic-multiple-errors-1280.png`, and `diagnostic-details-expanded-1280.png`. Review severity/message/location hierarchy, related controls, long technical wrapping, insertion presentation, collapsed developer detail, and selection consistency. The internal lowering wrapper has no valid source trigger and remains unit/contract tested rather than exposed through demo-only capture logic.

Phase 14I reuses the frozen Phase 14H scenes as the final quality gate. The gallery must pass at all three viewports with stable EN/JA/zh-CN hierarchy, source-coordinate markers, related controls, long-token containment, collapsed raw details, and unchanged Circuit clean-wire behavior. No Phase 14I-only demo logic or screenshots are added.

- This is a review gallery, not a pixel-diff visual regression suite.
- Screenshots are generated artifacts and are not committed to git.
- The gallery is local only unless you use an existing tunnel tool.
- The server script starts a local background process and prints how to stop it.

## Using Screenshots For Feedback

When reviewing, note the screenshot name, viewport, and exact issue.

Good feedback examples:

- `casl-gr2-ld.png` at `1440x900`: Memory[A] arrow is too close to the row text.
- `machine-code-explanation.png` at `1920x1080`: operand explanation is readable.
- `for-sum-control-flow.png`: FOR_BEGIN target is clear enough.
