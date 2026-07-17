# Diagnostics

- Audience: Users resolving source errors
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Diagnostic Codes](../reference/diagnostic-codes.md), [Diagnostics and i18n](../developer/diagnostics-and-i18n.md)

The Errors panel lists structured parser, assembler, semantic, transpiler, and VM diagnostics. Selecting an item links its source marker and opens localized context, source location, related location when present, and technical details.

Long diagnostic lists use bounded internal scrolling so they do not extend the entire page. Raw context remains collapsed by default.

Diagnostic identity is independent of locale. Switching among EN, JA, and zh-CN rerenders known messages without reparsing or reassembling source. Codes, tokens, register names, labels, and machine values remain technical text.

Some internal or legacy failures can use a safe fallback message. Storage and application-level startup failures are not source-code diagnostics.
