# ADR 0005: Document and Source Ownership

- Audience: Store, file, editor, and diagnostic maintainers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Document Lifecycle](../developer/document-lifecycle.md), [Frontend State Management](../developer/frontend-state-management.md)

## Context

Stale diagnostics, machine rows, or VM state can become misleading when source is replaced or asynchronous file operations finish out of order.

## Decision

One working document and one current Source Unit own all source-derived state. Replacement is atomic, uses explicit intent, and invalidates diagnostics, markers, generated output, machine code, Trace, VM, and related design data. Identifiers are session-only and never content- or locale-derived.

## Consequences

- Dirty state is revision-based.
- Asynchronous operations need operation and revision guards.
- Source replacement never partially preserves incompatible derived state.
- Persistence cannot restore source, external identity, paths, handles, or source-owned runtime output.
