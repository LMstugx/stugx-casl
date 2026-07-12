# Phase 15B: Browser Open File MVP

## Scope

Phase 15B added one user-visible browser Open operation for a single `.cas` or `.cpp` UTF-8 text file. Phase 15C now adds Save/Save As; projects, multiple files, directories, URLs, and path persistence remain out of scope.

Open never parses, assembles, runs, or steps the selected source. Parser/assembler acceptance, emitted CASL, C++ lowering, diagnostic behavior, and VM transitions are unchanged.

## Browser Adapter Choice

`BrowserTextFileAdapter` uses a temporary hidden `<input type="file">` with `accept=".cas,.cpp"` and `multiple=false`. This works across current browsers without making `showOpenFilePicker` a requirement. Each picker removes its listeners and input element after selection, cancellation, failure, or disposal; clearing the input value permits selecting the same file again.

Selected files are read with `arrayBuffer()`. A fatal UTF-8 `TextDecoder` is preferred. The conservative fallback rejects replacement-character output instead of silently accepting malformed bytes.

## Validation And Encoding

- one file only;
- `.cas` and `.cpp`, case-insensitive;
- actual byte length limited to 1 MiB;
- UTF-8 only, with UTF-8 BOM removed;
- NUL/binary-like content rejected;
- LF, CRLF, and mixed line endings detected;
- editor content normalized to LF;
- empty files accepted;
- filename reduced to a safe basename and rendered as text.

The adapter retains neither `File` nor path information and does not modify application state.

## Open Flow

`DocumentSessionController.requestOpen()` checks the document Dirty contract, allocates an operation ID, invokes the adapter, rejects concurrent or stale completion, and constructs a new external `SourceDocument` only after successful validation. The controller returns data; the store remains the commit owner.

The store's `currentDocumentReplaced` action atomically installs the new document/source unit and clears diagnostics, diagnostic presentation state, Generated CASL, C++ mapping, machine/source maps, Trace/output, assembly result, VM loaded state, and FramePlan selection. Locale, observation mode, theme/utility state, and lesson progress remain unchanged.

Assemble/transpile completion carries the source unit that started it. The reducer ignores a completion that arrives after document replacement, preventing old Generated CASL or diagnostics from repopulating the new source.

The document is clean after Open (`revision === savedRevision`), while execution state is `Idle`/not loaded. The user must explicitly Assemble.

## Dirty Guard And Cancellation

A clean document opens the picker directly. A Dirty document first shows an app-owned, keyboard-accessible modal with only `Cancel` and `Discard changes and open`; Save is intentionally absent in Phase 15B. Cancel, Escape, and backdrop activation preserve all state.

Choosing Discard does not clear the current document. Replacement occurs only after a new file is read and validated. Picker cancellation or any failure therefore leaves the Dirty document, diagnostics, markers, source unit, and runtime-derived state intact.

## Failure Presentation

File failures use a separate dismissible notice, not the Phase 14 code-diagnostic registry. Stable localized messages cover unsupported browser, extension, UTF-8, size, binary content, read/permission, and unknown failures. Raw exceptions are sanitized for internal lifecycle detail and never become the primary message.

## Locale, Diagnostics, And Security

Open does not read or change locale. Guard and notice text update when locale changes, while operation ID, document identity, and source remain stable. Successful replacement creates fresh `DocumentId` and `SourceUnitId`; cancelled/failed Open preserves both. The Phase 14 diagnostic baseline is unchanged.

No network request, URL import, directory, archive, automatic execution, source persistence, path storage, or HTML interpretation is introduced.

## Accessibility And Viewports

The toolbar Open command has a localized accessible name, `aria-busy` while opening, and remains grouped with file actions. The guard uses `role="dialog"`, safe initial focus, Escape handling, a contained Tab order, and an explicit destructive action. Long filenames are ellipsized visually while the full basename remains in title/accessibility text. EN, JA, and zh-CN states are reviewed at 1280x720 without horizontal overflow.

## Known Limitations

- Save and Save As remain disabled.
- The browser does not retain a file handle or path.
- Dirty built-in demo switching still follows the pre-existing selector behavior; its guard belongs to a later lifecycle pass.
- Session restore and project ownership are not implemented.

## Phase 15C Recommendation

Phase 15C implemented Save/Save As. Phase 15D retains the Phase 15B Open adapter and routes its replacement through the shared New/Open/example intent contract. Files opened through the input remain Save As only because no writable handle is retained.
