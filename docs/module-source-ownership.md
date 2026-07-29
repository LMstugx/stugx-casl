# Module Source Ownership

- Audience: File lifecycle and linker maintainers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Document Lifecycle](developer/document-lifecycle.md), [Linker Profile](casl-multi-program-linker-profile.md)

`ProjectId`, `ModuleId`, `SourceUnitId`, `ModuleAssemblyId`, and `LinkId` are separate identities. None is derived from filename, array index, localized text, or final address.

- Rename and reorder preserve `ModuleId`.
- Source replacement creates a new `SourceUnitId`.
- Assembly creates a new `ModuleAssemblyId`.
- A successful link creates a new `LinkId` and increments `LinkRevision`.
- Runtime ownership follows `LinkId`, not the selected editor tab.

Each module owns its document, Dirty state, file binding, diagnostics, local symbols, literal pool, and source mappings. Save does not Assemble or Link. Assemble does not Save or Link. Link does not Save, alter source, or clear Dirty state.

The Web version opens `.cas` files only after an explicit user choice and does not scan directories or persist handles. Tauri reuses the same session model and existing file adapter. Project files, recent projects, autosave, cloud sync, and source persistence are outside Phase 20F.
