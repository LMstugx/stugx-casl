# Persistence Architecture

- Audience: State and storage maintainers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Storage Keys](../reference/storage-keys.md), [Independent Stores ADR](../adr/0006-independent-persistence-stores.md)

Four independent adapters own locale, UI preferences, startup example selection, and lesson progress. They are intentionally not combined into a session payload.

Bootstrap order is locale, UI preferences, startup selection, lesson progress, then initial store/document exposure. Each read fails independently and hydration does not write storage.

Parsers treat stored values as untrusted. Versioned payloads use allowlists, plain own-data objects, bounded strings/counts/bytes, deterministic serialization, and safe defaults. Future versions require explicit pure migrations; field-shape, text, index, and locale guessing are prohibited.

Writes occur only for the owning user action. Reset and clear helpers affect only their own key and never source, Dirty state, diagnostics, VM, or other stores.

Source text, external files, paths, handles, IDs, generated output, diagnostics, and runtime state are prohibited persistence categories.
