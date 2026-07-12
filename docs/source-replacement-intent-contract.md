# Source Replacement Intent Contract

## Purpose

New, Open, and built-in example selection use one source-replacement contract. UI labels and localized text are presentation only and never identify an intent or document.

## Intents

`SourceReplacementIntent` has three variants: `open-file`, `new-document` with a `casl` or `cpp` language, and `select-example` with a stable example ID. Every replacement is prepared before any source state changes.

Preparation returns ready, requires an unsaved decision, no-op, or invalid. Selecting the already active example is a no-op: it allocates no IDs, shows no guard, and invalidates nothing.

## Guard And Continuation

A Dirty document stores the original intent while the user chooses Save, Discard, or Cancel. Locale changes may rerender the dialog but cannot alter that intent. Save continues only when the current revision is clean after the adapter result. Discard for Open is provisional until a file is read and validated; synchronous New and example targets can commit immediately after confirmation.

Cancel clears the pending intent and preserves the complete document/session snapshot. Stale document identity or a concurrent lifecycle operation prevents commit.

## Atomic Commit

All three intents produce a `SourceDocument` and use `replaceCurrentDocument`. The reducer changes source/document metadata and clears diagnostics, markers, Generated CASL, Machine Code, mappings, Trace, VM state, and source-specific selections in one transition. Locale, theme, observation mode, Circuit preference, and global lesson progress are retained.

Replacement never parses, assembles, transpiles, runs, or uses filename/display text as identity.
