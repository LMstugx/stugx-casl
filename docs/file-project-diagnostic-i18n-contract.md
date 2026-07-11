# File, Project, Diagnostic, And I18n Contract

## Application Preference

Locale is an application preference stored under `stugx.casl.locale`. It is not part of `SourceDocument`, source content, adapter results, filenames, future project files, or diagnostic identity. New/Open/Save/Save As/project replacement must not change locale. File content and filename never select locale.

## Document Content

A source document contains only source text plus lifecycle metadata. Generated CASL, machine code, Trace, diagnostics, VM state, lesson progress, and localized presentation are not persisted as source content. External content is not executed, parsed, assembled, or run merely because an adapter returned it.

## Diagnostic Ownership

Diagnostics, selected diagnostics, markers, and related locations belong to one `SourceUnitId`. Replacement clears them. Save and filename changes preserve identity/ranges and do not regenerate diagnostics. Locale changes rerender messages while preserving identity, selection, count/order/severity, primary ranges, and related locations.

File operation failures use the file result contract, not parser/assembler diagnostic codes. Raw exceptions stay sanitized developer context. No Phase 14 baseline code or manifest entry is changed by file lifecycle work.

## Project Lifecycle Consumption

A future project/session format must define source ownership explicitly. It must not embed locale by default, use localized text as an ID, retain stale runtime state after source replacement, or persist an external absolute path without a separate reviewed consent/security design.

## Phase 14 Baseline

`diagnostic-localization-baseline-v1.json` remains a test snapshot only. Runtime registries remain authoritative. Phase 15 code consumes runtime diagnostic adapters and cannot import the baseline as business configuration.
