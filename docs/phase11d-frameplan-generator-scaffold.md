# Phase 11D: FramePlan Generator Scaffold

Phase 11D adds a TypeScript-only FramePlan generator scaffold. It does not change emitted CASL, C++ lowering behavior, VM behavior, assembler behavior, WASM behavior, mock-core behavior, UI runtime behavior, or current demos.

Phase 11E connects this metadata to the Stack Frame View as a design-only preview in [phase11e-frameplan-stack-frame-view-preview.md](phase11e-frameplan-stack-frame-view-preview.md). That UI use still does not make frame slots live and still does not change emitted CASL.

The scaffold exists so future stack-frame lowering work can be tested against stable metadata before any runtime or emitted-code change is attempted.

## Purpose

Phase 11A defined the stack-frame teaching direction. Phase 11B described future `StackFramePlan` and `FrameSlot` metadata. Phase 11C added a read-only Stack Frame View placeholder. Phase 11D turns the metadata into a pure design-test generator:

- input: current `CppProgram` AST;
- output: design-only `FramePlanCollection`;
- no integration with normal transpile output;
- no emitted CASL changes.

## Design-Only Nature

`buildFramePlans(program)` is intentionally separate from the current `transpileCppToCasl` path.

It must not:

- allocate real stack-frame locals;
- introduce stack arguments;
- emit prologue or epilogue CASL;
- change static namespaced labels;
- change CALL / RET / PUSH / POP semantics;
- read VM state or UI state.

## StackFramePlan Fields

Each function receives one `StackFramePlan`.

Important fields:

- `functionName`
- `mode: "design-only"`
- `stackGrowth: "down"`
- `usesFramePointer`
- `returnValueRegister: "GR0"`
- `argumentRegisters`
- `returnAddressSlot`
- `argumentSlots`
- `localSlots`
- `temporarySlots`
- `frameSizeWords`
- `warnings`

`frameSizeWords` is approximate design metadata. It is not used by the current lowering pipeline.

## FrameSlot Fields

Each slot records the future frame concept and current lowering reality:

- `name`
- `kind`
- `offset`
- `sizeWords`
- `sourceLine`
- `storage`
- `currentLowering`
- `labelForDebug`

Slot kinds:

- `return-address`
- `saved-fp`
- `argument`
- `local`
- `temporary`

## Current Static Labels

Current local variables and parameter saves still lower to static labels.

Examples:

- `MAIN_RESULT`
- `FUNC_ADD_A`
- `FUNC_ADD_B`
- current non-main locals such as `ADD_C`

FramePlan records those labels as `labelForDebug` so tests and future UI can explain the current behavior without pretending it is a real stack-frame slot.

## GR0 / GR1-GR3 Representation

The current calling convention stays unchanged:

- `GR0` is the return-value register.
- `GR1`, `GR2`, and `GR3` are register arguments.

Argument `FrameSlot` rows use:

- `storage: "register-argument"`
- `currentLowering: "static-label"`

This records that arguments arrive through registers but are currently saved into static parameter labels inside the callee.

## Return Address Representation

Every function plan includes a `returnAddressSlot`.

It uses:

- `storage: "return-address-current"`
- `currentLowering: "call-stack-return-address"`

This reflects the real current CALL / stack-aware RET behavior: CALL writes a return address to the stack, and stack RET reads it back when `callDepth > 0`.

For `main`, FramePlan adds a warning that the final top-level RET still preserves program-finish compatibility.

## Why Emitted CASL Is Unchanged

FramePlan generation is pure metadata. It is not called by `generateCaslFromCpp`, does not mutate the AST, and does not feed into normal transpilation.

Regression tests compare C++ generated CASL before and after `buildFramePlans` and assert the CASL source and mapping remain identical.

In short: emitted CASL is unchanged.

## Future Stack Frame View

The Phase 11C Stack Frame View currently shows `Simple static locals` and `hasLiveFrame=false`.

Future UI can use FramePlan metadata to explain:

- which variables would become frame slots;
- which arguments would be stack or register slots;
- where the return-address slot belongs;
- how source lines map to future frame slots.

Until advanced lowering exists, UI must not display these design slots as live runtime slots.

## Future Stack-Frame Lowering

FramePlan prepares later lowering work:

- function entry;
- prologue;
- argument save;
- local allocation;
- body lowering;
- return value to `GR0`;
- epilogue;
- RET.

Those stages are not implemented in Phase 11D.

## Current Limitations

- No stack-frame locals.
- No stack arguments.
- No recursion.
- No frame pointer runtime state.
- No temporary slots are generated.
- `usesFramePointer` is currently `false`.
- `frameSizeWords` is deterministic but approximate design metadata.

## Future Phases

- Phase 11E: FramePlan-powered Stack Frame View preview, no emitted CASL change.
- Later phase: single-function stack-frame local lowering MVP.
- Phase 11F: register arguments saved to real frame slots.
- Phase 11G: recursion teaching demo.
- Later: optional FP / frame pointer decision, stack arguments, arrays, and pointer-like addressing.
