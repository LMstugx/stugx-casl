# ADR 0006: Independent Persistence Stores

- Audience: Storage, bootstrap, and privacy maintainers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Persistence Architecture](../developer/persistence-architecture.md), [Storage Keys](../reference/storage-keys.md)

## Context

Combining unrelated settings into session restore would increase failure coupling and risk persisting source, file, or runtime state.

## Decision

Locale, UI preferences, startup built-in example, and lesson progress use four independent keys, schemas, adapters, size limits, reset actions, and failure boundaries. They never form a general session payload.

## Consequences

- One malformed/unavailable key cannot clear or block the others.
- Writes are action-specific and hydration is read-only.
- Future versions require explicit pure migration.
- Source, paths, handles, diagnostics, generated output, and VM state remain prohibited.
