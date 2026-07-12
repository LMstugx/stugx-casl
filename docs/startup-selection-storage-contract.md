# Startup Selection Storage Contract

## Purpose And Ownership

Startup selection stores one machine value: the canonical ID of the last built-in example whose user-initiated replacement committed successfully. It is not a recent-document, session, source, or file-reopen contract. The built-in registry in `src/examples/demoPrograms.ts` remains the only source of example definitions.

The version-1 payload uses `stugx.casl.startup-selection.v1`, is limited to 4 KiB, and contains only `version` followed by `lastExampleId`. Locale remains at `stugx.casl.locale`; Phase 16A UI preferences remain at `stugx.casl.preferences.v1`.

## Parsing And Validation

Storage is untrusted. Parsing accepts only a plain own-property object with version `1` and a nonempty canonical candidate ID of at most 256 characters. Leading/trailing whitespace, controls, NUL, arrays, primitives, malformed JSON, unknown versions, accessors, and oversized payloads are rejected. Unknown fields are ignored. Sanitization constructs a new object and performs no prototype merge.

Resolution compares the stored ID exactly against registry entries. It never matches title, translated label, source content, extension, path, or locale. A missing/deleted ID falls back to the configured default; an invalid default falls back to the first registry entry. An empty registry returns unavailable so the existing safe initial factory can retain control. No alias map is needed because the repository has no verified rename history.

## Synchronous Bootstrap

Locale, UI preferences, and startup selection are read through separate adapters before the initial app store is exposed. The resolved immutable example definition is passed directly to the existing example document factory. The store creates one clean working document with new document/source-unit IDs, `save-as-only`, Idle/NotLoaded VM presentation, and no diagnostics, generated output, mappings, Trace, or binding.

Bootstrap is synchronous and controller-idempotent. It does not invoke the replacement controller, file adapter, guard, notice, parser, assembler, VM, or storage write. There is no default-document render followed by an effect replacement, so a user edit cannot be overwritten by a late restore.

## Write And Clear Rules

The app writes only after a valid built-in `select-example` replacement commits atomically. No write occurs for bootstrap, same-example no-op, pending/cancelled/failed/stale replacement, blocked save, Open, New, external/custom state, Save, locale, or UI preference changes. Storage write failure never rolls back the committed replacement or changes Dirty.

Opening an external file or creating Untitled does not clear the stored built-in ID. The next cold start therefore restores the last successfully selected built-in example, not the last document.

`StartupSelectionController.clear()` best-effort removes only the startup-selection key. It does not alter the current document, locale, UI preferences, diagnostics, VM, or file lifecycle. Phase 16B adds no clear UI.

Phase 16D freezes startup selection as the third synchronous bootstrap domain and confirms that malformed/version-incompatible reads, failed writes, and clear failures remain isolated from locale, UI preferences, and lesson progress. No fallback is written back.

## Security And Privacy

The payload contains no source, filename/path, handles/target IDs, document/source IDs, Dirty state, diagnostics/raw context, generated or machine data, VM/Trace, editor state, pending operation, locale, UI preferences, analytics, or telemetry. The ID cannot trigger dynamic import, file access, URL construction, network access, HTML insertion, or CSS selection.
