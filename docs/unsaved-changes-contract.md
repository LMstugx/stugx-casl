# Unsaved Changes Contract

## Purpose

Phase 15A defined the unsaved decision model. Phase 15B applied Cancel/Discard to browser Open; Phase 15C adds Save and open while leaving the current Demo selector behavior unchanged.

## Guarded Intents

Dirty documents require a decision before New, Open, source replacement, project switch, application close/reload, or built-in example selection. Clean documents proceed without a guard.

Locale selection, observation mode changes, and tab changes never require the guard and never alter Dirty state.

## Decisions

- `cancel`: preserve the entire document, source-owned state, runtime state, and active selection.
- `discard`: permit the requested replacement.
- `save`: wait for an actual adapter result. Continue only after success.

Save cancellation or failure blocks replacement. It must not mark the document clean or update filename/origin/saved revision. Untitled and example documents use Save As when the user chooses `save`.

## Dirty Definition

Dirty is derived from `revision` and `savedRevision`, not maintained as an independent mutable truth. A new empty untitled document is clean. Its first edit increments revision and makes it dirty. A restored session with unknown saved state is dirty. Successful save records the current revision; execution and presentation actions do not.

## Deferred UI

The Phase 15C dialog exposes Save and open, Discard and open, and Cancel. Save must complete and leave the current revision clean before Open starts. Cancellation, failure, or a concurrent edit blocks replacement. Discard remains provisional: picker cancellation or validation failure preserves the current Dirty document.
