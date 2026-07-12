# BeforeUnload Dirty Guard

## Policy

The native browser `beforeunload` safeguard is active only while `isDocumentDirty(currentDocument)` is true. Dirty remains the revision/saved-revision result; there is no second unload-specific flag.

The handler calls `preventDefault()` and sets `returnValue` for browser compatibility. It does not provide custom text, open an application dialog, save, write storage, create a diagnostic, or mutate the document.

## Lifecycle

`BeforeUnloadGuardManager` owns at most one listener. Becoming Dirty registers it; becoming clean removes it; unmount/disposal removes it. Missing `window` is safe. Locale changes do not affect the condition.

Successful Save removes protection only when the current revision is clean. A concurrent edit keeps it active. Successful New/Open/example replacement to a clean document removes it through the same derived Dirty update.

## Testing

Unit tests use an injected event target and verify registration, de-duplication, cleanup, `preventDefault`, and non-mutation. Normal E2E does not perform a real page-navigation prompt because browser prompt text and automation behavior are platform controlled.

Phase 15E freezes the policy as `document-dirty-only` and verifies balanced cleanup across unmount/remount. Active operations alone never enable the guard.
