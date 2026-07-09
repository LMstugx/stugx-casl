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

Circuit Focus Mode normally uses a lightweight signal-flow animation on active wires. The visual review spec adds a `visual-review-static` class before each screenshot so the active path remains highlighted but the animation is frozen for stable review.

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
- Program, Current Instruction, Current Source Mapping, Source Context, and the newest Trace row agree on the same last executed instruction.
- PR and Next Instruction are visible only as secondary hints.
- Machine state and pipeline stage are labeled separately.
- Memory arrow points to the active memory row.
- GR arrow points to the active GR row.
- Active wires use a single terminal arrow instead of repeated arrowheads.
- Active wires may flow in the live app, but visual review screenshots intentionally freeze that animation.
- Junction dots are visible at route merge points but do not dominate the view.
- `DATA BUS`, `ADDR BUS`, and `CTRL` lanes are visible but not visually noisy.
- LD / ST data-bypass paths avoid the ALU body.
- ST writeback lands at the Memory row edge instead of crossing value or label text.
- READ / WRITE / EXEC / FLAG indicators match the visible active path.
- Signal Probe is compact and derived from the current instruction / recent trace.
- Stack Preview is compact, read-only, and shows real `PUSH` / `POP` / `CALL` / stack-`RET` stack read/write rows.
- The SP -> MAR -> Memory guide is faint and inactive during ordinary execution, but active for stack instructions and stack-aware returns.
- Older Trace rows are lower emphasis than the latest row.
- Output Log remains available but compact in Focus Mode.
- SP is visible but inactive for ordinary execution.
- LD and ST do not make the ALU look active; ADDA and related ALU instructions do.
- Shift screenshots show the ALU/Shifter path and do not mark Memory as the shift-count data source.
- Index addressing screenshots show the `IDX` register badge, Effective Address Unit, base/index/effective calculation, and effective Memory row highlight.
- PUSH / POP screenshots show `SP`, Stack Preview, stack row write/read, and Machine Code explanations that distinguish effective address values from memory data.
- CALL / RET screenshots show return-address stack writes, stack return reads, PR target changes, Call Stack depth, return edge text, and the final top-level `RET` finish.
- Nested CALL screenshot shows `callDepth` greater than 1 and last-in-first-out return order context.
- C++ function-call screenshots show `FUNC_ADDONE`, `CALL FUNC_ADDONE`, GR0 return value convention, and CALL / RET rows in Trace.
- C++ function-argument screenshots show `LAD GR1,5`, `ST GR1,FUNC_ADDONE_X`, the `GR1` first-argument convention, and final `GR0 = 0006`.
- C++ function-arguments screenshots show `LAD GR1,2`, `LAD GR2,3`, `ST GR1,FUNC_ADD_A`, `ST GR2,FUNC_ADD_B`, and final `GR0 = 0005`.
- Signal Probe uses compact label / value / note rows; extra values appear in details instead of overlapping.
- Call Stack uses summary and detail rows; depth, RET mode, return address, and routine remain readable.
- Trace rows show main event, primary effect, and secondary note without overflowing the card.
- Learning Flow cards use short values such as `Flow: fallthrough` or `Flow: call -> FUNC_ADDONE`.
- Long labels in Generated CASL and Machine Code use ellipsis rather than pushing table columns out of the dock.
- Machine Code explanation is readable.
- Control Flow target text is readable.
- Source Editor is not squeezed.
- Right Inspector remains usable.
- Trace still shows break / continue / loop movement clearly.

## Captured Scenes

- `project-overview.png`
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
