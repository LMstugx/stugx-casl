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
- Versioned Changelog

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

Phase 20A adds `casl-mode-hex`, signed/unsigned/binary, stack, `RPUSH`/`RPOP`, input-waiting, output, indexed-addressing, JA/zh-CN 1280, and assembler-output symbol-table scenes. Review that CASL Mode remains a responsive modern view, keeps the Console and long technical tables bounded, exposes all 16-bit formats without changing machine state, and does not copy a legacy simulator interface.

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
- Phase 15B captures browser Open states with an intercepted file input: clean external `.cpp`/`.cas`, EN/JA/zh-CN dirty guards, invalid extension notice, and a long filename at 1280x720. No operating-system picker or generated file is required.
- Phase 15C captures injected Save As in EN/JA/zh-CN, the three-action Dirty guard, confirmed-save success, download-copy fallback, failure, and long-filename behavior. Visual capture never opens a system picker or writes a real file.
- Phase 15D captures the New dialog in EN/JA/zh-CN, clean Untitled CASL/C++ documents, intent-aware New and Demo guards, guarded-save busy state, and 1280px example-title behavior. Locale changes and save completion are injected; no native picker or unload prompt is opened.
- Phase 15E reuses the complete Phase 15B-D gallery as the frozen lifecycle visual matrix. It verifies all three viewports/locales without adding a new user-visible state or committing generated screenshots.
- Phase 16A reuses the Observation Mode, Circuit Focus, Inspector, and Output Dock scenes with deterministic clean preference storage per navigation; dedicated E2E covers restored and partial-invalid payloads. Hydration adds no modal/banner and must preserve 1280px overflow, natural scroll, bounded Memory scroll, and clean-wire contracts.
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

Phase 16B adds injected-storage startup scenes: `startup-example-default.png`, `startup-example-restored-casl.png`, `startup-example-restored-cpp.png`, `startup-example-invalid-id-fallback.png`, `startup-example-deleted-id-fallback.png`, `startup-example-malformed-storage.png`, `startup-example-oversized-storage.png`, `startup-example-with-ja-locale.png`, `startup-example-with-zh-cn-locale.png`, `startup-example-with-register-stack-preference.png`, `startup-example-with-code-machine-preference.png`, `startup-example-with-circuit-focus.png`, and `startup-example-1280.png`. Review selector/source agreement, clean Save As state, independent locale/preferences, absent guard/notice, stable first-frame layout, and no horizontal overflow. Storage is injected; captures never depend on a developer's localStorage residue.

Phase 16C adds injected lesson-progress scenes: `lesson-progress-empty.png`, `lesson-progress-partial.png`, `lesson-progress-complete.png`, `lesson-progress-restored-en.png`, `lesson-progress-restored-ja.png`, `lesson-progress-restored-zh-cn.png`, `lesson-progress-reset.png`, `lesson-progress-invalid-version.png`, `lesson-progress-deleted-step.png`, `lesson-progress-version-mismatch.png`, `lesson-progress-external-source.png`, and `lesson-progress-1280.png`. Review checkbox/count agreement, synchronous restored state, locale stability, safe invalid/version fallback, absent external association, natural scroll, 1280px containment, and unchanged clean-wire behavior.

Phase 16D adds `persistence-all-default.png`, all-valid EN/JA/zh-CN, invalid locale/preferences/startup/lesson, all-invalid, storage-unavailable, reset-isolation, cross-key-failure, and `persistence-1280.png` / `persistence-1440.png` / `persistence-1920.png`. Review source/selector agreement, independent locale/UI/progress recovery, clean/unassembled state, absence of flash/guard/notice/banner, horizontal containment, natural scroll, bounded Inspector scroll, and clean-wire stability.

Phase 17A adds no normal-workspace visual feature. Existing 1280/1440/1920 EN/JA/zh-CN galleries remain the visual gate; production root/subpath Playwright additionally verifies no horizontal overflow, clean-wire stability, restored state, and absence of console/network errors. The new safe application failure page is covered by component accessibility tests and contains no raw path or stack detail.

Phase 18A reuses the same frontend and visual baseline in a 1440x900 Tauri window, with 1180x700 minimum chrome bounds. Manual release smoke checks 1280x720 content containment, natural page scroll, bounded Inspector scroll, three locales, observation modes, and the unchanged no-arrow/no-circle/no-ghost-wire contract. Tauri adds no desktop-only visual redesign or screenshot artifact.

Phase 18A.1 adds focused 1180x700 Toolbar captures for EN/JA/zh-CN, 1280x720 Source-header captures, a 20+ error scenario with a bounded diagnostic list, selected context and collapsed/expanded raw-details states, plus a maximized layout. Review confirms equal nonshrinking locale controls, no Source-control overlap, at least four complete diagnostic rows, stable internal scrolling, usable editor height, natural page scrolling, and no horizontal overflow. Generated screenshots remain ignored artifacts.

Phase 18A.3 adds `changelog-current-en.png`, `changelog-current-ja.png`, `changelog-current-zh-cn.png`, `changelog-multiple-releases.png`, `changelog-known-issues.png`, `changelog-1280.png`, `changelog-long-technical-text.png`, and `changelog-keyboard-focus.png`. Review the Project Overview entry, Current badge, section hierarchy, known-issue distinction, safe wrapping, focus visibility, large bounded modal scroll, and 1280x720 containment. The dialog must not pressure the Toolbar, create a tiny scroll trap, or alter natural page scroll and clean-wire behavior.

Phase 19A adds `cpp-double-storage-source.png`, `cpp-double-storage-generated-casl.png`, `cpp-double-storage-memory-before.png`, `cpp-double-storage-memory-word-copy.png`, `cpp-double-storage-memory-after.png`, `cpp-double-inspector-en.png`, `cpp-double-inspector-ja.png`, `cpp-double-inspector-zh-cn.png`, `cpp-double-storage-inspector-details.png`, `cpp-double-trace.png`, `cpp-double-code-machine.png`, `cpp-double-1280.png`, and `cpp-double-unsupported-diagnostic.png`. Review four related word rows, one active word at a time, bounded Trace and Memory scrolling, safe binary wrapping, locale-independent technical values, and 1280x720 containment. Circuit presentation must not invent an FPU, a 64-bit bus, arrows, circular markers, or inactive ghost wires.

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
