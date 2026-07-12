# stugx.CASL

A CASL II / COMET II learning studio for understanding how source code, assembly, machine code, memory, trace, control flow, and circuit state connect.

## What This Tool Is

stugx.CASL is a study-oriented environment for CASL II and COMET II. It lets you write CASL directly, or write a small C++ subset and inspect how it is lowered into CASL II, assembled into COMET II machine words, and executed step by step.

The goal is practical learning:

- see how C++ subset statements become CASL II assembly
- see how CASL II rows become COMET II machine words
- inspect opcode, register, operand, and resolved label meaning
- observe PR, GR, memory, trace, control flow, and circuit state together

It is not a full C++ compiler and not a full CASL II development environment. It is a focused learning tool.

## Main Learning Pipeline

```text
C++ subset source
-> Generated CASL II Assembly
-> COMET II Machine Code
-> Opcode / operand explanation
-> Control Flow targets
-> Memory / Trace / Circuit visualization
```

CASL mode starts from CASL II source and then uses the same machine-code, runtime, memory, trace, and circuit views.

## Recommended Learning Order

Each built-in example includes a collapsible `Guided Lesson` in the Demo Guide. Study Mode turns the lesson into a manual per-example checklist: read the concepts, assemble the example, open the recommended tab, confirm each checkpoint, and reset session-only progress when you want to repeat the lesson.

1. `CASL: GR2 Addition`
   Learn direct CASL execution, `LD`, `ADDA`, `ST`, `RET`, GR changes, and memory write.

2. `CASL: Logic Operations`
   Learn `AND`, `OR`, `XOR`, bitwise ALU behavior, and a memory write.

3. `CASL: Logical Add Compare`
   Learn `ADDL`, `CPL`, `JOV`, unsigned comparison, and overflow-flag jumps.

4. `CASL: Shift Operations`
   Learn `SLL`, `SRL`, `SLA`, `SRA`, shift counts, GR updates, and FR / OF behavior.

5. `CASL: Index Addressing`
   Learn `adr,x`, x-field encoding, base address, index register, and effective address.

6. `CASL: Push Pop Stack`
   Learn `SP`, stack memory, `PUSH` storing an effective address, and `POP` reading `Memory[SP]`.

7. `CASL: Call Return`
   Learn `CALL`, return-address stack writes, stack-aware `RET`, and top-level `RET` finish compatibility.

8. `CASL: Nested Call Return`
   Learn nested `CALL`, last-in-first-out return order, and how `callDepth` explains stack-aware `RET`.

9. `C++: Addition`
   Learn how assignment and arithmetic become `LD`, `ADDA`, `ST`, and return through `GR0`.

10. `C++: If Else`
   Learn `CPA`, conditional jumps, labels, and branch targets.

11. `C++: While Sum`
   Learn loop labels, loop-back jumps, Trace, and Memory Viewer.

12. `C++: For Sum Sugar`
   Learn for-loop initializer, condition, increment, `i++`, and `+=` lowering.

13. `C++: Break Continue`
   Learn why `continue` jumps to the increment block and `break` jumps to the loop end.

For detailed study guidance, see [docs/learning-guide.md](docs/learning-guide.md).
For circuit layout semantics, see [docs/phase8e-circuit-focus-final-layout.md](docs/phase8e-circuit-focus-final-layout.md).
For the Circuit Focus presentation layout, see [docs/phase8g-circuit-focus-visual-convergence.md](docs/phase8g-circuit-focus-visual-convergence.md).
For the latest Circuit Focus UI semantics cleanup, see [docs/phase8i-focus-mode-ui-refinement.md](docs/phase8i-focus-mode-ui-refinement.md).
For the lab-style schematic bus lane polish, see [docs/phase8j-lab-style-schematic-polish.md](docs/phase8j-lab-style-schematic-polish.md).
For the layered study-mode density pass and Signal Probe foundation, see [docs/phase8k-layered-study-mode-density-refinement.md](docs/phase8k-layered-study-mode-density-refinement.md).
For the circuit arrow routing pass, see [docs/phase8l-circuit-arrow-routing.md](docs/phase8l-circuit-arrow-routing.md).
For future custom-circuit design notes, see [docs/future-custom-circuit-design.md](docs/future-custom-circuit-design.md).
For the latest CASL instruction coverage batch, see [docs/phase9a-casl-instruction-coverage.md](docs/phase9a-casl-instruction-coverage.md).
For shift instruction coverage and path templates, see [docs/phase9b-shift-instructions-and-path-templates.md](docs/phase9b-shift-instructions-and-path-templates.md).
For index addressing, see [docs/phase9c-index-addressing.md](docs/phase9c-index-addressing.md).
For the stack address path preview foundation, see [docs/phase9e-stack-address-path-foundation.md](docs/phase9e-stack-address-path-foundation.md).
For `PUSH` / `POP` stack semantics, see [docs/phase9f-push-pop-stack.md](docs/phase9f-push-pop-stack.md).
For `CALL` and stack-aware `RET`, see [docs/phase9g-call-ret-stack-semantics.md](docs/phase9g-call-ret-stack-semantics.md).
For subroutine teaching polish and return-edge explanation, see [docs/phase9h-subroutine-teaching-polish.md](docs/phase9h-subroutine-teaching-polish.md).
For the Focus Mode observation split, see [docs/phase10j-observation-mode-split.md](docs/phase10j-observation-mode-split.md).
For Observation Mode visual defect cleanup, see [docs/phase10k-observation-visual-defect-cleanup.md](docs/phase10k-observation-visual-defect-cleanup.md).

## Key Views

- Source Editor: CASL or C++ subset source.
- Generated CASL: structured CASL II generated from C++ subset source.
- Machine Code: COMET II address/word rows with source, labels, and meaning.
- Machine Code Explanation: opcode, register, index, base operand, effective address, resolved label, and readable meaning.
- Control Flow: label and jump target hints for if/else, while, for, break, and continue.
- Memory Viewer: bounded memory windows with label, PR, MAR, read, write, and range controls.
- Trace: recent execution history for Step and Run.
- Circuit Focus Mode: a presentation layout with Program, OUT Display, Current Instruction, and selectable Observation Modes. `CPU Flow` prioritizes the circuit, active path, compact memory, Signal Probe, and Timeline. `Registers / Stack` shows all GR registers, PR / SP / FR, Stack Preview, Call Stack, and memory values. `Code / Machine` emphasizes Source / Generated CASL / Machine Code / Trace mapping. It highlights the last executed instruction as the teaching target, while PR and next instruction remain secondary hints. The circuit uses DATA / ADDR / CTRL bus lanes, row-level anchors, and lightweight signal indicators for a lab-style teaching schematic.
- Circuit: SVG COMET II visualization driven by the current runtime state, with row-level GR/Memory targeting for active data paths.

## Demo Examples

- `CASL: GR2 Addition`
- `CASL: Logic Operations`
- `CASL: Logical Add Compare`
- `CASL: Shift Operations`
- `CASL: Index Addressing`
- `CASL: Push Pop Stack`
- `CASL: Call Return`
- `CASL: Nested Call Return`
- `C++: Addition`
- `C++: If Else`
- `C++: While Sum`
- `C++: For Sum`
- `C++: For Sum Sugar`
- `C++: Break Continue`

Use the Demo selector above the Source Editor. Selecting an example creates a clean working document and leaves the VM not loaded; click `Assemble` to load it into the backend. Dirty documents receive the shared Save/Discard/Cancel replacement guard first.

## Supported CASL II Subset

Directives:

- `START`
- `END`
- `DC`
- `DS`

Instructions:

- `NOP`
- `LAD`
- `LD`
- `ST`
- `ADDA`
- `SUBA`
- `ADDL`
- `SUBL`
- `AND`
- `OR`
- `XOR`
- `CPA`
- `CPL`
- `SLA`
- `SRA`
- `SLL`
- `SRL`
- `PUSH`
- `POP`
- `CALL`
- `JUMP`
- `JZE`
- `JNZ`
- `JPL`
- `JMI`
- `JOV`
- `RET`

Index addressing:

- `adr,x` is supported for the register/address and jump instruction forms listed above.
- x may be `GR1` through `GR7`.
- `GR0` is rejected as an index register.
- Effective address is `(base address + GRx) & 0xFFFF`.

Stack subset:

- `PUSH adr[,x]` decrements `SP` and stores the effective address value itself at `Memory[SP]`.
- `POP GRr` reads `Memory[SP]` into the target register, then increments `SP`.
- `CALL adr[,x]` pushes the return address to `Memory[SP]`, then jumps to the effective address.
- `RET` performs a stack return when a call frame exists; otherwise it preserves the original top-level program-finish behavior.

## Supported C++ Subset

Supported:

- `int main() { ... }`
- no-argument and up to three-argument `int` functions
- `int` variables
- integer literals
- assignment
- binary `+` and `-`
- `return 0;`, `return variable;`, and `return foo();`
- function call assignment: `x = foo();`
- `if` / `else`
- `while`
- `for`
- comparisons: `==`, `!=`, `<`, `<=`, `>`, `>=`
- loop syntax sugar: `i++`, `++i`, `i--`, `--i`, `i += expr`, `i -= expr`
- `break;` and `continue;` inside `while` / `for`

Not supported:

- full C++ parsing
- classes, structs, templates
- arrays, pointers, references
- more than three function parameters, recursion, overloads, and function pointers
- stack-frame locals / arguments
- strings, characters, floats, doubles
- `std::cout`, iostreams, vectors
- `switch`, `do while`, `&&`, `||`, `!`
- complete scope and type system

## Tech Stack

- Core: C++20, CMake, CTest
- Frontend: TypeScript, React, Vite, SVG, Monaco Editor
- Bridge: CoreAdapter abstraction, Mock backend, experimental WASM backend
- WASM: Emscripten, C ABI + JSON DTO bridge
- Tests: Vitest, Playwright, CTest, golden parity fixtures

## Development Commands

Install dependencies:

```powershell
pnpm install
```

Start with the default Mock backend:

```powershell
pnpm dev
```

Build and run the experimental WASM backend:

```powershell
pnpm build:wasm
pnpm dev:wasm
```

Run frontend tests and build:

```powershell
pnpm test
pnpm build
```

Run WASM adapter tests:

```powershell
pnpm build:wasm
pnpm test:wasm
```

Run browser smoke tests:

```powershell
pnpm test:e2e
pnpm test:e2e:wasm
```

Capture a local visual review gallery:

```powershell
pnpm visual:capture
pnpm visual:serve
```

See [docs/visual-review.md](docs/visual-review.md) for phone/LAN review notes.

Run the C++ core tests:

```powershell
cmake -S cpp-core -B cpp-core/build
cmake --build cpp-core/build
ctest --test-dir cpp-core/build -C Debug --output-on-failure
```

Run the full local validation script:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/validate-all.ps1
```

The validation script is optional and intended for final local checks before a study demo or handoff.

## WASM Backend

The default app uses `MockCoreAdapter`. The experimental WASM backend uses the same CoreAdapter contract and C++ core behavior in browser form.

Generated WASM files are local build artifacts and are ignored by Git:

```text
public/wasm/stugx_casl_core.js
public/wasm/stugx_casl_core.wasm
```

The current backend is shown in the status bar as `Mock Core`, `WASM Core`, or `WASM Error`.

## Documentation

- [docs/learning-guide.md](docs/learning-guide.md): recommended study order and how to read each view.
- [docs/practice-tasks.md](docs/practice-tasks.md): small exercises for checking understanding.
- [docs/demo-script.md](docs/demo-script.md): Japanese-first explanation script for teachers or senior students.
- [docs/screenshots-guide.md](docs/screenshots-guide.md): useful screenshots for explaining the tool.
- [docs/project-overview.md](docs/project-overview.md): concise project overview for learning and teaching use.
- [docs/phase9d-effective-address-unit.md](docs/phase9d-effective-address-unit.md): Effective Address Unit visualization for indexed operands.
- [docs/phase9e-stack-address-path-foundation.md](docs/phase9e-stack-address-path-foundation.md): SP, Stack Preview, and inactive stack-address path foundation for future stack instructions.
- [docs/phase9f-push-pop-stack.md](docs/phase9f-push-pop-stack.md): `PUSH` / `POP` stack semantics, Stack Preview updates, and circuit stack path.
- [docs/phase9g-call-ret-stack-semantics.md](docs/phase9g-call-ret-stack-semantics.md): `CALL`, stack-aware `RET`, and top-level `RET` compatibility.
- [docs/phase9h-subroutine-teaching-polish.md](docs/phase9h-subroutine-teaching-polish.md): Call Stack view, return edge explanation, and nested-call teaching notes.
- [docs/phase10a-cpp-function-call-lowering.md](docs/phase10a-cpp-function-call-lowering.md): no-argument C++ function-call lowering to CASL `CALL` / `RET` with `GR0` return values.
- [docs/phase10b-calling-convention-design.md](docs/phase10b-calling-convention-design.md): future C++ calling convention design for `GR0` returns, `GR1` / `GR2` register arguments, and stack-frame locals.
- [docs/phase10c-cpp-single-argument-function.md](docs/phase10c-cpp-single-argument-function.md): single-argument C++ function-call lowering with `GR1` as the first argument register.
- [docs/phase10d-cpp-multi-register-arguments.md](docs/phase10d-cpp-multi-register-arguments.md): C++ function-call lowering for up to three register arguments in `GR1` / `GR2` / `GR3`.
- [docs/circuit-visual-contract.md](docs/circuit-visual-contract.md): long-term Circuit Focus Mode rules for lanes, anchors, active modules, compact cards, and text overflow.
- [docs/phase10e-focus-text-overflow-cleanup.md](docs/phase10e-focus-text-overflow-cleanup.md): Signal Probe, Call Stack, Trace, Learning Flow, and table overflow cleanup.
- [docs/phase10f-small-viewport-accessibility.md](docs/phase10f-small-viewport-accessibility.md): small viewport, keyboard focus, details, tab, and title/ARIA polish.
- [docs/manual-qa-checklist.md](docs/manual-qa-checklist.md): manual smoke, visual, learning-flow, keyboard, and viewport QA checklist.
- [docs/release-candidate-notes.md](docs/release-candidate-notes.md): current stable capabilities, demos, supported subsets, testing status, limitations, and next phases.
- [docs/phase10h-robustness-audit.md](docs/phase10h-robustness-audit.md): boundary tests, code safety checks, fixes, and remaining risks.
- [docs/phase10i-release-hardening-stress-audit.md](docs/phase10i-release-hardening-stress-audit.md): deterministic malformed-input corpus, stress checks, WASM lifecycle checks, and sanitizer/toolchain notes.
- [docs/phase10j-observation-mode-split.md](docs/phase10j-observation-mode-split.md): Focus Mode observation modes for CPU flow, register/stack values, and code/machine mapping.
- [docs/phase10k-observation-visual-defect-cleanup.md](docs/phase10k-observation-visual-defect-cleanup.md): EAU visual cleanup, compact Signal Probe rows, Trace compacting, and Code / Machine table hierarchy.
- [docs/phase10l-final-ui-detail-polish.md](docs/phase10l-final-ui-detail-polish.md): final EAU readability, Signal Probe labels, Call Stack wording, Trace notes, and compact Machine Code explanation polish.
- [docs/visual-rc-baseline.md](docs/visual-rc-baseline.md): visual release-candidate baseline commit, tag, screenshot list, and future UI modification rules.
- [docs/phase11a-stack-frame-locals-design.md](docs/phase11a-stack-frame-locals-design.md): design-only plan for future C++ stack-frame locals, stack arguments, frame pointer decisions, and Stack Frame View.
- [docs/phase11b-stack-frame-lowering-scaffold.md](docs/phase11b-stack-frame-lowering-scaffold.md): future stack-frame lowering scaffold for `StackFramePlan`, `FrameSlot`, prologue/epilogue stages, and Stack Frame View data.
- [docs/phase11c-stack-frame-view-placeholder.md](docs/phase11c-stack-frame-view-placeholder.md): read-only Register / Stack mode placeholder for future stack-frame slots without changing current static-locals lowering.
- [docs/phase11d-frameplan-generator-scaffold.md](docs/phase11d-frameplan-generator-scaffold.md): TypeScript-only `buildFramePlans` scaffold for future frame metadata without changing emitted CASL.
- [docs/phase11e-frameplan-stack-frame-view-preview.md](docs/phase11e-frameplan-stack-frame-view-preview.md): design-only FramePlan preview in Stack Frame View, explicitly marked as not runtime state and not emitted CASL.
- [docs/phase11f-frameplan-slot-highlighting-contract.md](docs/phase11f-frameplan-slot-highlighting-contract.md): design-only FramePlan slot mapping, selected-row highlighting, and Slot Detail rules without runtime frame values.
- [docs/phase11g-source-casl-frame-slot-selection.md](docs/phase11g-source-casl-frame-slot-selection.md): design-only C++ source / Generated CASL slot badges and FramePlan selection wiring without emitted CASL or runtime changes.
- [docs/phase11h-frameplan-circuit-probe-relation.md](docs/phase11h-frameplan-circuit-probe-relation.md): design-only Signal Probe and Slot Detail relation notes for selected FramePlan slots without fake live values or circuit paths.
- [docs/phase11i-editor-frameplan-symbol-hover.md](docs/phase11i-editor-frameplan-symbol-hover.md): design-only Source Editor related-symbol markers for FramePlan slot selection without Monaco architecture changes or runtime frame values.
- [docs/frameplan-relation-qa-checklist.md](docs/frameplan-relation-qa-checklist.md): QA checklist for SourceEditor, Stack Frame View, Signal Probe, Generated CASL, observation modes, and accessibility in the FramePlan relation layer.
- [docs/phase11-frameplan-design-layer-summary.md](docs/phase11-frameplan-design-layer-summary.md): Phase 11 design-layer freeze summary covering current static namespaced labels, FramePlan metadata, slot selection, Signal Probe relation, and deferred advanced lowering.
- [docs/v1-scope-freeze.md](docs/v1-scope-freeze.md): v1.0 scope freeze for included features, excluded features, release baselines, and final QA gates. The v1.0 scope is frozen around the current learning-studio feature set.
- [docs/v1-release-qa-evidence.md](docs/v1-release-qa-evidence.md): v1.0 release QA execution evidence for automated validation, manual checklist coverage review, visual review gallery, and PASS / BLOCKED status.
- [docs/releases/v1.0-rc1.md](docs/releases/v1.0-rc1.md): v1.0-rc1 release candidate notes with scope references, highlights, validation summary, limitations, and local verification commands.
- [docs/v1-manual-signoff.md](docs/v1-manual-signoff.md): manual sign-off preparation checklist for `v1.0-rc1`, including required manual QA, visual review, limitations acceptance, and final `v1.0.0` criteria.
- [docs/v1-security-audit-notes.md](docs/v1-security-audit-notes.md): Phase 12D-SEC notes for the dev dependency audit blocker, patched Vite / Vitest / esbuild versions, validation result, and final tag requirement.
- [docs/phase12d-visual-audit.md](docs/phase12d-visual-audit.md): comprehensive Circuit SVG visual self-audit for marker, arrow, Memory routing, animation, and scroll rules before final v1.0.
- [docs/phase13a-advanced-ui-design-system.md](docs/phase13a-advanced-ui-design-system.md): shared design token and component style foundation for a more mature engineering-learning UI without changing runtime behavior.
- [docs/phase13b-advanced-ui-application.md](docs/phase13b-advanced-ui-application.md): application pass for toolbar grouping, state color semantics, panel/table/tab consistency, circuit styling, motion, and viewport behavior.
- [docs/phase13c-ui-consistency-accessibility-audit.md](docs/phase13c-ui-consistency-accessibility-audit.md): contrast, keyboard tablist, focus, overflow, state consistency, scroll, and viewport audit for the advanced UI baseline.
- [docs/phase14a-i18n-architecture.md](docs/phase14a-i18n-architecture.md): typed locale, fallback, persistence, provider, and limited UI pilot migration for `en`, `ja`, and `zh-CN`.
- [docs/i18n-string-boundary.md](docs/i18n-string-boundary.md): translation boundary for static UI, technical identifiers, diagnostics, lessons, user content, and CASL / Machine Code terminology.
- [docs/i18n-glossary.md](docs/i18n-glossary.md): approved English, Japanese, and Simplified Chinese terminology, compact labels, and untranslated technical terms.
- [docs/i18n-short-string-inventory.md](docs/i18n-short-string-inventory.md): module-by-module short UI string status, length guidance, and viewport risk inventory.
- [docs/phase14b-i18n-glossary-short-strings.md](docs/phase14b-i18n-glossary-short-strings.md): Phase 14B scope, reviewed pilot migration, resource checks, and remaining translation boundaries.
- [docs/phase14c-circuit-learning-compact-localization.md](docs/phase14c-circuit-learning-compact-localization.md): Circuit Focus, timeline, Signal Probe, stack, FramePlan, and Code / Machine compact-label localization with technical-data boundaries.
- [docs/diagnostic-code-contract.md](docs/diagnostic-code-contract.md): stable diagnostic codes, named parameters, identity, fallback, and TS/C++/WASM compatibility.
- [docs/i18n-diagnostic-inventory.md](docs/i18n-diagnostic-inventory.md): diagnostic producer, severity, parameter, parity, localization status, and migration-priority inventory.
- [docs/phase14d-diagnostic-localization-architecture.md](docs/phase14d-diagnostic-localization-architecture.md): Phase 14D structured diagnostic pilot, localized rendering, compatibility boundaries, and remaining raw diagnostics.
- [docs/diagnostic-parameter-schema.md](docs/diagnostic-parameter-schema.md): strict code-to-parameter mapping, runtime payload validation, placeholder checks, and technical-value formatting.
- [docs/source-range-contract.md](docs/source-range-contract.md): 1-based line/column, UTF-16 offsets, exclusive ends, related locations, and TS/C++/WASM range parity.
- [docs/phase14e-diagnostic-schema-source-range.md](docs/phase14e-diagnostic-schema-source-range.md): Phase 14E schema, source-range, identity, UI selection, compatibility, and remaining limitations.
- [docs/phase14f-remaining-diagnostic-migration.md](docs/phase14f-remaining-diagnostic-migration.md): Phase 14F producer audit, P1 parser/assembler/semantic migration, rejected values, parity, and remaining legacy diagnostics.
- [docs/phase14g-p2-diagnostic-stability-audit.md](docs/phase14g-p2-diagnostic-stability-audit.md): evidence-based P2 admission decisions, generated-label conflict localization, blocked storage metadata, and internal/legacy boundaries.
- [docs/diagnostic-localization-baseline-v1.json](docs/diagnostic-localization-baseline-v1.json): non-runtime v1 snapshot of diagnostic codes, producers, schemas, range policies, backend ownership, parity, and compatibility defaults.
- [docs/phase14h-diagnostic-localization-baseline.md](docs/phase14h-diagnostic-localization-baseline.md): Phase 14H baseline freeze, structured/legacy/internal compatibility, Errors/editor UX, accessibility, and viewport QA.
- [docs/phase14i-i18n-diagnostics-final-quality-gate.md](docs/phase14i-i18n-diagnostics-final-quality-gate.md): final Phase 14 manifest, locale, invariance, compatibility, security, accessibility, and visual quality gate.
- [docs/phase15a-file-document-lifecycle-architecture.md](docs/phase15a-file-document-lifecycle-architecture.md): pure Document/Source Unit model, revisions, lifecycle state machine, store migration matrix, and Phase 15B boundary.
- [docs/phase15b-browser-open-file-mvp.md](docs/phase15b-browser-open-file-mvp.md): single-file browser Open flow, Dirty guard, atomic source replacement, failure presentation, and Phase 15C boundary.
- [docs/phase15c-browser-save-save-as-mvp.md](docs/phase15c-browser-save-save-as-mvp.md): honest Save/Save As behavior, revision races, Dirty guard integration, and Phase 15D boundary.
- [docs/phase15d-new-demo-beforeunload.md](docs/phase15d-new-demo-beforeunload.md): unified New/Open/example replacement, intent-aware guards, Untitled presentation, and native Dirty unload safety.
- [docs/source-replacement-intent-contract.md](docs/source-replacement-intent-contract.md): stable replacement intents, continuation rules, no-op handling, and atomic commit boundary.
- [docs/beforeunload-dirty-guard.md](docs/beforeunload-dirty-guard.md): revision-derived native unload protection and listener lifecycle.
- [docs/session-lifecycle-metadata-contract.md](docs/session-lifecycle-metadata-contract.md): future non-source metadata allowlist and prohibited persistence fields.
- [docs/browser-save-strategy.md](docs/browser-save-strategy.md): File System Access confirmed writes and Blob download-copy fallback.
- [docs/transient-write-binding-contract.md](docs/transient-write-binding-contract.md): session-only handle registry and opaque SaveTarget ownership rules.
- [docs/browser-text-file-adapter.md](docs/browser-text-file-adapter.md): hidden-input browser adapter, strict UTF-8 byte handling, cleanup, cancellation, and test injection.
- [docs/document-session-controller.md](docs/document-session-controller.md): guarded Open orchestration, operation identity, stale-result protection, and atomic store commit boundary.
- [docs/file-io-adapter-contract.md](docs/file-io-adapter-contract.md): replaceable browser/Tauri text adapter interface, result, validation, cancellation, security, and concurrency contract.
- [docs/source-ownership-contract.md](docs/source-ownership-contract.md): source-unit ownership and atomic invalidation rules for diagnostics, markers, generated output, VM/Trace, and FramePlan state.
- [docs/unsaved-changes-contract.md](docs/unsaved-changes-contract.md): pure save/discard/cancel decision rules for future New/Open/project replacement flows.
- [docs/file-project-diagnostic-i18n-contract.md](docs/file-project-diagnostic-i18n-contract.md): cross-phase locale, source content, diagnostics, project, and baseline consumption rules.

## Current Limitations

- This is a learning-oriented C++ subset transpiler, not a complete C++ compiler.
- The CASL II assembler supports the current teaching subset, not the full instruction set.
- Index addressing is supported for CASL address operands, but C++ subset code does not generate indexed operands yet.
- C++ subset can lower no-argument and up to three-argument `int` function calls, but it does not support stack arguments, recursion, stack-frame locals, or C++ function-call expressions inside larger expressions.
- The WASM bridge currently uses a single runtime and JSON strings.
- The control-flow view is text and badge based; there is no full CFG graph yet.
- New / Open / Save, language switching, and theme controls are placeholders or limited.
- There is no desktop packaging or deployment target in this milestone.
