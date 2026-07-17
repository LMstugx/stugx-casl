# File Formats and Encoding

- Audience: Users and file-adapter maintainers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Open, Save, and New](../user/open-save-new.md), [Document Lifecycle](../developer/document-lifecycle.md)

Supported source file extensions are:

- `.cas` for CASL II
- `.cpp` for the C++ teaching subset

Extension matching is case-insensitive. Open accepts strict UTF-8 with an optional UTF-8 BOM, rejects invalid UTF-8 and NUL data, and limits input to 1 MiB.

Line endings are normalized for the editor. Saved text uses the document's current encoding/line-ending contract; it is never converted to a locale-specific legacy encoding.

File type follows the selected or opened source language. The application does not persist absolute paths, browser handles, external file contents, or reopen metadata.
