# Browser Text File Adapter

`BrowserTextFileAdapter` is the production browser implementation of the Phase 15A `TextFileAdapter` Open boundary.

## Selection Port

`BrowserInputFileSelectionPort` creates one hidden file input per operation, accepts `.cas,.cpp`, disables multiple selection, clears its value, and removes listeners/DOM after completion. The `cancel` event is supported, with a focus-return fallback for browsers that do not dispatch it consistently. `dispose()` resolves an active picker as cancelled during unmount.

The selection port returns only a short-lived file-like object. The adapter immediately obtains an `ArrayBuffer`; neither `File`, directory data, nor handles enter the store.

## Decode And Validation

Actual bytes are checked against the configurable limit before decoding. Strict UTF-8 decoding precedes the shared Phase 15A validation pipeline. Validation strips BOM, rejects NUL content, validates the case-insensitive extension, records original line-ending style, and normalizes editor text to LF.

## Results

- `success`: validated `OpenedTextFile` metadata and normalized text;
- `cancelled`: no notice, diagnostic, or state mutation;
- `failure`: stable kind plus optional raw context for sanitization.

`saveTextFile()` returns `unsupported` in Phase 15B. No download or save picker is present.

## Testing

Unit tests inject a selection port and byte payload. DOM tests verify temporary input cleanup. Playwright intercepts the controlled file chooser with `setFiles()`; tests never require a real operating-system picker.
