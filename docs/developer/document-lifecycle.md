# Document Lifecycle

- Audience: File, editor, and store maintainers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Open, Save, and New](../user/open-save-new.md), [Document Ownership ADR](../adr/0005-document-source-ownership.md)

The application owns exactly one working document. Document and Source Unit identifiers are session-only ownership tokens; they are never persisted or derived from file content.

Dirty state is revision-based. Source replacement for New, Open, or a built-in example passes through one Save/Discard/Cancel guard. A replacement commits source, language, display metadata, and source ownership atomically.

Asynchronous Open and Save operations use operation identity and revision checks so stale results cannot overwrite newer user work. Save failure never marks the document clean.

Source replacement invalidates source-owned diagnostics, markers, generated output, machine code, Trace, VM state, and design metadata. Preferences and built-in lesson progress remain independent.

`beforeunload` is active only while Dirty. External paths and handles are not session-restored.

Debugger mutation and Full Clear do not enter the file lifecycle. Manual machine-state edits never change source revisions, write bindings, Save behavior, or `beforeunload`. Full Clear preserves the current source Dirty value while dropping only machine ownership.
