# Session Lifecycle Metadata Contract

## Version 1

`SessionLifecycleMetadataV1` is a future-only, non-source contract. It may contain:

- `version: 1`;
- last document language;
- last built-in example ID;
- observation mode;
- Circuit Focus enabled state.

Phase 15D validates this shape but does not persist or restore it.

## Prohibited Data

Metadata must not contain source content, Generated CASL, Machine Code, diagnostics, diagnostic selection, VM state, Trace, `DocumentId`, `SourceUnitId`, file handles, save-target IDs, absolute paths, raw exceptions, or transient operation state.

Locale remains the independent application preference at `stugx.casl.locale` and is not duplicated here. Unknown versions or prohibited fields are ignored safely. A future deleted example ID must fall back without restoring Dirty source or claiming to reopen an external file.

Phase 15E validates the allowlist against the persistence prohibitions in the file-lifecycle baseline. Storage and restore remain unimplemented.

Phase 16A gives Observation Mode and Circuit Focus an actual, independent application-preference owner at `stugx.casl.preferences.v1`. This dormant session-metadata shape remains frozen for Phase 15 compatibility and is still not stored. Future session work must remove any duplicate ownership before enabling metadata persistence; `lastExampleId` remains deferred to Phase 16B.
