# Unsaved Changes Contract

## Purpose

Phase 15A defines the unsaved decision model without adding a dialog or changing the current Demo selector behavior.

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

Phase 15B may add a decision dialog and connect guarded operations. It must use this decision model and keep the existing behavior until the complete guard flow is available. No partial dialog or demo-only branch belongs in Phase 15A.
