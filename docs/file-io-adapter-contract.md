# File I/O Adapter Contract

## Purpose

`TextFileAdapter` is the replaceable boundary between document lifecycle logic and browser or future Tauri file implementations. Phase 15B implements browser Open; Phase 15C implements Save As through File System Access with an honest download-copy fallback. No persistent file handle, directory operation, URL load, or network fetch is implemented.

## Operations

`openTextFile(options)` returns a `FileOperationResult<OpenedTextFile>`. `saveTextFile(request)` returns a `FileOperationResult<SavedTextFile>`. The adapter receives validated intent data and returns data; it never parses CASL/C++, assembles, runs, resets, chooses locale, or modifies the store.

Only `.cas` and `.cpp` text files are in scope. The default maximum is 1 MiB. Extension matching is case-insensitive and does not trust MIME type.

## Result Contract

- `success` contains validated text/file metadata.
- `cancelled` is a normal user outcome, not an error diagnostic.
- `failure` also distinguishes `invalid-filename` and `stale-target`; neither is a source-code diagnostic.
- `safeMessage` is optional presentation-safe context, not a diagnostic identity.
- `rawContext` is optional developer detail and follows the Phase 14 sanitization/collapse policy.

The result contains no locale. Paths, stack traces, browser exceptions, and implementation details are not primary messages. An adapter failure does not become an assembler/parser diagnostic and does not add a diagnostic code.

## Open Validation

The pure validation layer:

1. removes directory information from the display filename;
2. maps `.cas` to `casl` and `.cpp` to `cpp`;
3. accepts UTF-8 text with an optional UTF-8 BOM;
4. rejects NUL-containing/binary-like content;
5. checks measured UTF-8 byte length against the configured limit;
6. allows empty files;
7. detects LF, CRLF, or mixed endings;
8. normalizes editor content to LF while retaining the preferred/original line-ending classification.

Source ranges are calculated from normalized editor content. Save serialization uses the document's preferred line ending and emits no BOM by default.

## Save Boundary

Save does not parse, assemble, reset, or run. A document becomes clean only after adapter success and a matching active operation. Save cancellation/failure leaves filename, origin, revision, saved revision, source ownership, diagnostics, ranges, and runtime-derived state unchanged. Untitled/example documents require Save As.

## Concurrency

The lifecycle layer, not the adapter, owns `operationId`. A stale completion is ignored. The adapter cannot commit a document directly, and successful open/save results are committed atomically by pure lifecycle transitions.

## Future Implementations

Phase 15C provides browser Open, confirmed writes, and download-copy results behind this interface. A future Tauri adapter must preserve revision snapshots, confirmed-write semantics, cancellation, and the no-path/no-locale boundary.

Phase 15E freezes this adapter boundary in `file-lifecycle-baseline-v1.json`. Runtime constants remain authoritative; the manifest is a test snapshot and is never loaded by an adapter.

Phase 18A keeps the browser adapter unchanged inside WebView2 and grants no native filesystem/dialog permission. Any Tauri-native implementation is deferred to Phase 18B and must preserve this contract rather than bypassing the session controller.
