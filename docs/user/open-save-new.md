# Open, Save, and New

- Audience: Users working with local source files
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [File Formats and Encoding](../reference/file-formats-and-encoding.md), [Document Lifecycle](../developer/document-lifecycle.md)

The application uses a single working document.

- `New` creates a clean Untitled CASL or C++ document after the shared Dirty guard.
- `Open` accepts `.cas` and `.cpp` text files through the browser adapter.
- `Save` writes to a confirmed browser file handle when the File System Access API is available.
- `Save As` requests a new target. Where direct writes are unavailable, it creates an explicit download copy.

Download fallback does not claim that an existing file was overwritten. File names, paths, and handles are not persisted.

Open uses strict UTF-8, accepts an optional UTF-8 BOM, rejects NUL data, and limits files to 1 MiB. The editor normalizes line endings while retaining relevant session metadata.

Dirty replacement operations use Save, Discard, and Cancel. A dirty document also enables `beforeunload` protection when the browser supports it.
