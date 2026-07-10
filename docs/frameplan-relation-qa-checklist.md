# FramePlan Relation QA Checklist

This checklist freezes the Phase 11 FramePlan relation UX baseline. The feature is a design preview. It is not runtime state, does not create live stack-frame values, and does not change emitted CASL.

## SourceEditor Related Frame Symbols

- Related Frame Symbols are visible only in C++ mode when a FramePlan preview is available.
- Related Frame Symbols are hidden or safely empty in CASL mode.
- Invalid C++ source must not crash the Source Editor or FramePlan preview.
- Selecting a symbol selects the related Stack Frame View slot.
- The selected symbol must not imply a live runtime value.
- The marker text should use short labels and the native title should preserve the full explanation.

## Stack Frame View

- The selected row is highlighted in Stack Frame View.
- Slot Detail shows the symbol, kind, current lowering, future storage, and selection source.
- Slot Detail must clearly say Not runtime state.
- Slot Detail must not show fake live values.
- Current lowering must describe the current static namespaced labels or current register relation.
- Future storage must describe the future frame slot relation without implying it is implemented.

## Signal Probe

- Signal Probe relation is visible when a FramePlan slot is selected.
- Argument slots explain the current GR1-GR3 argument-register path into static namespaced labels.
- Local slots explain current static label lowering and future frame slot storage.
- Return-address slots explain the existing CALL/RET stack return-address relation.
- Signal Probe must not display fake live frame values.
- Signal Probe must not create fake circuit paths for design-only slots.

## Generated CASL

- A Generated CASL slot badge can select the related FramePlan slot.
- The badge relation is design-only.
- Emitted CASL must remain unchanged.
- The relation should show the current static label, such as FUNC_ADD_A, and the related C++ symbol.

## Observation Modes

- Register / Stack Mode shows the full Stack Frame View.
- Code / Machine Mode shows compact FramePlan relation UI and Generated CASL slot badges.
- CPU Flow Mode does not become dense with FramePlan relation details.
- Switching observation modes must not reset VM state or source state.

## Accessibility

- Related Frame Symbols are keyboard accessible.
- Stack Frame View slot rows are keyboard accessible.
- Generated CASL slot badges are keyboard accessible.
- Selected rows and chips use aria-selected or aria-pressed where appropriate.
- Focus-visible styling remains visible.
- Native title text is available for compact or truncated relation text.

## Known Limitations

- No live stack-frame values.
- No real stack-frame locals.
- No stack arguments.
- No FP runtime state.
- No Monaco hover provider yet.
- No inline token click behavior yet.
- FramePlan metadata is design-only until advanced stack-frame lowering is implemented.
