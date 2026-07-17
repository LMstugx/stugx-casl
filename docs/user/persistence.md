# Persistence

- Audience: Users who want to know what the application remembers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Storage Keys](../reference/storage-keys.md), [Persistence Architecture](../developer/persistence-architecture.md)

The application keeps four independent browser-local settings:

1. locale
2. safe UI preferences
3. last selected built-in example
4. built-in lesson progress

These values are stored locally in the browser or Tauri WebView. They are not synchronized to a server.

The application does not persist source text, external files, file names or paths, file handles, document/source IDs, Dirty state, diagnostics, Generated CASL, Machine Code, Trace, registers, memory, or VM state.

Each storage adapter fails independently. Corruption or unavailability falls back to safe defaults without clearing the other stores or changing the current document.
