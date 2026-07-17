# ADR 0007: Browser File Lifecycle

- Audience: File-adapter and document-lifecycle maintainers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Open, Save, and New](../user/open-save-new.md), [Document Lifecycle](../developer/document-lifecycle.md)

## Context

Browser file capabilities vary, and a download cannot honestly be described as overwriting an existing file.

## Decision

Use an injectable browser text-file adapter. Prefer File System Access for user-confirmed direct writes and use a clearly identified download-copy fallback otherwise. All destructive replacement paths share the Dirty Save/Discard/Cancel guard.

## Consequences

- Open is user-initiated, strict UTF-8, bounded, and extension-aware.
- Save success is revision-checked before marking clean.
- Download fallback does not retain a write handle or claim overwrite.
- File paths, handles, and reopen metadata are not persisted.
