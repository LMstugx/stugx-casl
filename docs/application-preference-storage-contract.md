# Application Preference Storage Contract

## Model And Key

`ApplicationPreferencesV1` is stored under `stugx.casl.preferences.v1`. The payload is limited to 16 KiB and may contain only the four Phase 16A fields. Locale remains independently stored under `stugx.casl.locale`.

## Parsing And Sanitization

Storage is untrusted input. Parsing requires JSON, version 1, a plain object, and valid enum/boolean values. Unknown and unsafe keys are ignored. Invalid individual fields fall back to current defaults; malformed, oversized, primitive, array, or unknown-version payloads fall back completely. Sanitization reads own data descriptors and never merges the input object into application state.

## Adapter

`ApplicationPreferenceStorage` exposes `read`, `write`, and `clear`. `WebLocalStorageApplicationPreferenceStorage` owns all direct localStorage access and catches unavailable-window, access, quota, parse, write, and clear failures. Storage failures do not create diagnostics, notices, Dirty changes, or source/file operations.

## Hydration And Writes

`ApplicationPreferenceController.hydrate()` is idempotent and runs synchronously before store initialization, avoiding a visible default-to-restored transition. The store receives a resolved snapshot without changing document/source IDs, source, diagnostics, VM, Dirty, locale, or file lifecycle.

The store selector emits only the allowlist. A write occurs only after an allowlisted value changes; source/runtime/file/locale changes do not write. Duplicate snapshots are suppressed. Auto-opening Generated CASL is source-driven component presentation and does not overwrite the saved Output Dock preference.

## Reset

`reset()` restores the four defaults and best-effort removes only `stugx.casl.preferences.v1`. It does not clear locale, source, diagnostics, file lifecycle, or lesson state. Phase 16A adds no Reset Settings UI.

## Security And Privacy

The payload contains no user-entered strings, source, filename/path, handles/target IDs, document/source IDs, diagnostics/raw context, runtime state, Trace, editor state, operation state, analytics, or telemetry. There is no network synchronization and no complete-store serialization.
