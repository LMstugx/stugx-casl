# Diagnostics and i18n

- Audience: Diagnostic, i18n, and UI maintainers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Diagnostic Codes](../reference/diagnostic-codes.md), [Diagnostic Identity ADR](../adr/0004-diagnostic-identity.md)

Supported locales are `en`, `ja`, and `zh-CN`, with `en` as the safe fallback. Static UI resources are typed and placeholder-checked.

Structured diagnostic identity is composed from producer, stable code, severity, source range, named parameters, related locations, and source ownership. Rendered language is excluded.

Known diagnostic messages are localized at render time. Technical tokens, labels, register names, opcodes, file names, machine values, and generated identifiers remain unchanged.

Locale changes must not parse, assemble, reorder diagnostics, change ranges, or replace source. Raw internal context is bounded and collapsed in the UI.

Adding a diagnostic requires a stable code, strict parameter schema, all locale messages, precise ranges, parity checks where applicable, and an explicit baseline update.
