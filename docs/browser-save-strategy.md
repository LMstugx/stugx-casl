# Browser Save Strategy

## Strategy Selection

`BrowserTextFileAdapter` feature-detects `window.showSaveFilePicker` in a secure context. Save As uses File System Access when available. Unsupported environments use a UTF-8 Blob download as a copy-only fallback. Cancellation never falls through to download; permission and I/O failures remain failures.

## File System Access

The picker is constrained to `.cas` or `.cpp`. The returned handle name is validated before writing. The adapter creates a writable stream, writes captured bytes, and closes it before returning `confirmedWrite: true`. Only then is the handle registered. Ordinary Save requires a `SaveTargetId` matching the current `DocumentId`; a mismatch returns `stale-target`.

## Download Fallback

The fallback creates a `text/plain;charset=utf-8` Blob, temporary object URL, and hidden download anchor, then releases both. Its result is `strategy: download`, `confirmedWrite: false`, and `downloadRequested: true`. It creates no binding, so the next action remains Save As.

## Encoding And Filename Policy

Internal LF text is serialized as LF or CRLF according to document policy; mixed/unknown uses LF. UTF-8 output has no BOM and no added trailing newline. Suggested names are non-localized basenames. Missing extensions are appended, mismatches are rejected, unsafe path/control characters are removed, and empty/reserved names use `main.cas` or `main.cpp`.

## Failures

Cancellation is normal. Permission, invalid filename/extension, size, stale target, I/O, and unknown failures are file-operation results. Raw exceptions remain developer context and never become source diagnostics.
