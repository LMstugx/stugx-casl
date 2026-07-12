# Transient Write Binding Contract

## Model

A `DocumentWriteBinding` contains only `DocumentId`, opaque `SaveTargetId`, strategy metadata, and a basename. The real `FileSystemFileHandle` lives in `TransientWriteBindingRegistry`, outside `SourceDocument` and persisted state.

## Invariants

1. A binding belongs to one `DocumentId`.
2. Save and Save As never change `DocumentId` or `SourceUnitId`.
3. A new confirmed Save As replaces the prior binding for that document.
4. Download creates no binding.
5. Replacement, language-mode changes, and adapter disposal release obsolete bindings.
6. A target mismatch is a safe `stale-target` failure.
7. Handles, target IDs, paths, and source are never written to localStorage.
8. Refresh losing the binding is expected and returns the UI to Save As.

## Store Boundary

The store holds only binding metadata so the toolbar can choose Save versus Save As. The adapter validates it against the private registry. Binding metadata is not source ownership, diagnostic identity, locale, or a React key.

Permission failure does not mark the document clean or expose a path. A missing registry target safely routes a later controller request through Save As.
