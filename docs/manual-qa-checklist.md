# Manual QA Checklist

Use this checklist before a study demo, a teacher review, or a release-candidate handoff. It is intentionally manual: automated tests cover behavior, but this pass checks whether the learning flow still feels understandable on screen.

## 1. Smoke Test

- App launches from `pnpm dev` or `pnpm dev:wasm`.
- Default demo loads in the Source Editor.
- `Assemble` succeeds and the runtime state becomes ready.
- `Step` advances one instruction and updates registers, trace, and circuit state.
- `Run` reaches `Finished` for the default demo.
- `Reset` returns PR, registers, trace, and UI highlights to the assembled initial state.
- Changing source text marks the runtime dirty and requires re-assemble.

## 2. Focus Mode Visual Check

Open Circuit Focus Mode and inspect these paths. The current instruction must match Program, Current Instruction, Source Mapping, Source Context, and the latest Trace row.

Use the Observation Mode selector instead of trying to inspect every panel at once:

- `CPU Flow`: use this for LD / ADDA / ST, index effective-address routing, and active circuit paths.
- `Registers / Stack`: use this for GR0-GR7, PR / SP / FR, Stack Preview, Call Stack, and main-memory value checks.
- `Code / Machine`: use this for Source / Generated CASL / Machine Code / Trace mapping, especially C++ function argument examples.

- `CASL: GR2 Addition`, after `LD GR2,A`: Memory row `A` -> MDR -> `GR2`; ALU stays inactive.
- `CASL: GR2 Addition`, after `ADDA GR2,B`: `GR2` and Memory row `B` feed the ALU; ALU output returns to `GR2`; FR is involved.
- `CASL: GR2 Addition`, after `ST GR2,C`: `GR2` -> MDR -> Memory row `C`; ALU stays inactive.
- `CASL: Index Addressing`: Effective Address Unit shows base + index -> effective address, and the highlighted Memory row is the effective address row.
- `CASL: Push Pop Stack`: `PUSH` activates SP and stack write; `POP` activates stack read, MDR, target GR, and SP increment.
- `CASL: Call Return`: `CALL` writes the return address to stack and jumps to the target; stack-aware `RET` reads `MEM[SP] -> PR`; final top-level `RET` finishes without stack activity.
- `C++: Function Arguments`: Generated CASL loads arguments into `GR1` / `GR2`, calls `FUNC_ADD`, saves parameters in the callee, and returns through `GR0`.

## 3. Learning Flow Check

- Demo Guide opens and the selected example has a Guided Lesson.
- Study Mode checklist can be manually checked and reset.
- Generated CASL shows labels, generated rows, and C++ mapping without overflow.
- Machine Code explanation shows opcode, register, index, operand, effective address, stack, and CALL / RET details where relevant.
- Trace latest row is easy to read and older rows are de-emphasized.
- Signal Probe shows compact involved nodes without overlapping text.
- Call Stack shows depth, RET mode, top return address, and stored stack row.
- Stack Preview shows SP and nearby memory rows without implying unsupported stack behavior.
- Switching Observation Mode does not reset VM state, trace, source text, generated CASL, or Study Mode progress.

## 4. Keyboard-Only Walkthrough

Use `Tab`, `Shift+Tab`, `Enter`, and arrow keys where supported.

- Toolbar buttons receive a visible focus ring.
- Demo selector is reachable, readable, and exposes the full selected demo name.
- Output tabs are keyboard reachable and announce the active tab.
- Inspector tabs are keyboard reachable and announce the selected tab.
- Signal Probe details can be opened and closed from the keyboard.
- Call Stack details can be opened and closed from the keyboard.
- Generated CASL rows and Machine Code rows remain readable when focused or selected.
- Machine Code explanation can be inspected without mouse-only hidden content.

## 5. Viewport Checklist

Check these sizes with the visual review gallery or browser dev tools:

- `1280x720`: Source Editor, Circuit, Inspector, and Output dock are visible; no key card overlaps.
- `1440x900`: Focus Mode has comfortable spacing; Signal Probe, Call Stack, Trace, and Stack Preview are readable.
- `1920x1080`: Circuit remains centered and does not become sparse or poster-like.

For every viewport:

- Circuit panel does not overflow horizontally.
- Right inspector does not cover the circuit.
- Bottom Output dock remains compact in Focus Mode.
- Generated CASL and Machine Code tables handle long labels with ellipsis and title text.

## 6. Release Hardening Check

- Run `powershell -ExecutionPolicy Bypass -File scripts/validate-all.ps1`.
- Run `powershell -ExecutionPolicy Bypass -File scripts/stress-check.ps1` before a release-candidate handoff.
- Confirm malformed-input tests report diagnostics instead of hanging.
- Confirm WASM lifecycle stress completes without stale register, stack, or call-depth state.
- Confirm no visual-review artifacts or screenshots are staged for commit.

## 7. v1.0 Final QA Gate

Before v1.0 final, confirm:

- [v1-scope-freeze.md](v1-scope-freeze.md) still describes the intended release scope.
- `pnpm test` passes.
- `pnpm build` passes.
- `pnpm test:e2e` passes.
- `pnpm build:wasm` passes.
- `pnpm test:wasm` passes.
- `pnpm test:e2e:wasm` passes.
- C++ build and CTest pass.
- `scripts/validate-all.ps1` passes.
- `scripts/stress-check.ps1` passes when available.
- Manual QA checklist and visual review are complete.
- No v1.1 / v1.2 / v2.0 feature has slipped into the v1.0 branch.

## 8. Known Limitations

- stugx.CASL is not a full C++ compiler.
- C++ subset does not support arrays, pointers, references, classes, overloads, recursion, or function calls inside larger expressions.
- C++ function lowering uses static namespaced local and parameter labels; it does not implement stack-frame locals.
- Register arguments are supported up to `GR1` / `GR2` / `GR3`; stack arguments are not implemented.
- CASL support is a teaching subset, not a full macro assembler.
- No full screen-reader audit has been completed.
- No sanitizer pass is part of the normal local validation path yet.
- Ellipsis detail currently uses native `title` tooltips instead of a custom tooltip system.
- Visual review screenshots are local artifacts and should not be committed.
