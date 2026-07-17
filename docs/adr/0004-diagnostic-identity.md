# ADR 0004: Diagnostic Identity

- Audience: Diagnostic, i18n, and backend maintainers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Diagnostics and i18n](../developer/diagnostics-and-i18n.md), [Diagnostic Codes](../reference/diagnostic-codes.md)

## Context

Raw localized messages are unstable identities and cannot preserve selection, source mapping, or backend parity across locale changes.

## Decision

Diagnostic identity uses producer, stable code, severity, source range, named parameters, related locations, and source ownership. Localized rendered text is excluded. Parameters follow strict per-code schemas, and technical values remain untranslated.

## Consequences

- Locale changes rerender without reparsing or reassembly.
- Existing code/range/severity/producer semantics are baseline-protected.
- New diagnostics require all locales, schemas, precise ranges, tests, and explicit baseline changes.
- Storage or application startup failures do not enter the code diagnostic registry.
