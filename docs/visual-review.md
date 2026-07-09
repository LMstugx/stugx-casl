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
- Junction dots are visible at route merge points but do not dominate the view.
- `DATA BUS`, `ADDR BUS`, and `CTRL` lanes are visible but not visually noisy.
- LD / ST data-bypass paths avoid the ALU body.
- ST writeback lands at the Memory row edge instead of crossing value or label text.
- READ / WRITE / EXEC / FLAG indicators match the visible active path.
- Signal Probe is compact and derived from the current instruction / recent trace.
- Older Trace rows are lower emphasis than the latest row.
- Output Log remains available but compact in Focus Mode.
- SP is visible but inactive for ordinary execution.
- LD and ST do not make the ALU look active; ADDA and related ALU instructions do.
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
- `cpp-addition-generated-casl.png`
- `machine-code-explanation.png`
- `for-sum-control-flow.png`
- `break-continue-trace.png`
- `logic-operations-machine-code.png`
- `logical-add-compare-jov.png`

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
