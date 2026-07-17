# Phase 14I: I18n And Diagnostics Final Quality Gate

## Scope

Phase 14I closes the Phase 14 internationalization and diagnostic work with a final compatibility and presentation gate. It adds no locale, translation scope, diagnostic code, producer, trigger, parser behavior, assembler behavior, AST change, emitted CASL change, lowering change, VM event, or file lifecycle feature.

## Phase 14 Completed Capabilities

- Typed `en`, `ja`, and `zh-CN` locale selection with English fallback, normalization, best-effort persistence, and document language synchronization.
- Reviewed static UI terminology and compact Circuit Focus localization while preserving machine data and source text verbatim.
- 55 structured diagnostic codes at the Phase 14I freeze point across eight producers with typed parameters, localized templates, source ranges, related locations, stable identity, and legacy/WASM compatibility. Phase 19A later adds nine explicitly reviewed double-boundary codes.
- Accessible Errors presentation with localized summaries, secondary code/producer details, sanitized raw context, keyboard related-location controls, and locale-current editor hover text.

## Final Audit Matrix

| Area | Result | Status | Phase 15 consumption requirement |
| --- | --- | --- | --- |
| Locale architecture | Supported locales, normalization, fallback, persistence, and `document.lang` agree with tests. | frozen | File/project actions must not change application locale. |
| Locale resources | English is complete; JA/zh-CN keys are known and non-empty; placeholders match. | compatible | New file metadata must not become a translation resource. |
| String boundary | UI copy is localizable; source, CASL, machine data, identifiers, and Trace payload remain verbatim. | frozen | Open/save must preserve technical content byte-for-byte apart from an explicitly documented file encoding policy. |
| Diagnostic registry | The original 55-code Phase 14 set remains unchanged; Phase 19A explicitly extends the reviewed manifest to 64 entries. | frozen with reviewed extension | Contract changes require explicit registry, resource, test, inventory, and baseline review. |
| Diagnostic identity | Locale and rendered text are excluded; ranges, stable params, producer, severity, and source unit remain stable. | compatible | Project replacement must clear stale selection; locale changes must not. |
| Payload compatibility | Structured, legacy, partial, unknown, and old WASM payloads degrade safely. | compatible | File/project adapters must normalize diagnostics before presentation. |
| Presentation | Errors, details, raw context, markers, related locations, focus, and wrapping retain the Phase 14H contract. | frozen | Future UI work must not use localized text as a key or range source. |
| Visual/viewport | Required EN/JA/zh-CN diagnostic scenes pass at 1920x1080, 1440x900, and 1280x720. | compatible | New lifecycle UI must preserve natural page scroll and bounded long-data panels. |

No blocker was found. Existing partial metadata and intentionally raw/internal boundaries remain documented acceptable limitations.

## Baseline Manifest Result

`diagnostic-localization-baseline-v1.json` remains a non-runtime verification snapshot. Runtime registries remain the source of truth. Tests compare the manifest's ordered 64 codes, producers, required and optional parameter names, locale coverage, range policies, related-location policies, backend ownership, parity scope, and internal/raw defaults with runtime declarations. Runtime source files are checked to ensure they do not import or reference the manifest.

The manifest order follows the frozen runtime registry order. A future code or schema change therefore fails until maintainers explicitly review and update the baseline contract.

## Locale Resource Result

The final resource audit confirms `en`, `ja`, and `zh-CN` diagnostic templates are present and non-empty. Placeholder sets match each other and the diagnostic schemas. Complete sample parameter sets render without unresolved `{param}` markers. Unknown locales normalize to English, unknown keys safely return the key, storage failures remain non-fatal, and `document.documentElement.lang` tracks the active locale.

Locale state remains outside the app store. Switching locale does not set Dirty or mutate source, last assembled source, diagnostics, assembly status, selected example, lesson progress, generated CASL, observation mode, or COMET state.

## Diagnostic Invariance Result

Locale changes only rerender presentation. Diagnostic identity, selection, count, order, severity, primary source range, related locations, editor marker coordinates, source, Generated CASL, and VM state remain unchanged. Locale changes do not invoke parser, assembler, transpiler, or VM operations.

## Compatibility Result

Structured payloads retain strict code/producer/params validation. Legacy message-only and message-plus-range payloads remain supported. Missing producers are inferred only for known namespaces. Unknown codes, partial payloads, invalid params, and old WASM shapes fall back without fabricating technical data, ranges, ownership, or parity.

## Presentation And Accessibility Result

Localized text is the primary Errors message. Diagnostic code, producer, and sanitized raw context remain in collapsed secondary details. Technical values use monospace presentation and wrap without page overflow. Severity has accessible text, selected rows expose `aria-selected`, details use native keyboard semantics, and reliable related locations are keyboard-activatable without replacing diagnostic identity.

Insertion ranges retain a stable gutter marker without highlighting an unrelated token. The editor range adapter depends on source coordinates, not localized text.

## Viewport And Visual Result

`pnpm visual:review` and `pnpm visual:capture` cover the baseline in English, Japanese, and Simplified Chinese, generated-label conflict, related locations, long technical tokens, legacy fallback, multiple 1280px diagnostics, and expanded details. The reviewed gallery has no clear clipping, page-level horizontal overflow, tiny nested scroll trap, marker displacement, or Circuit clean-wire regression.

## Security And Raw Context Result

Raw context is never interpolated into localized summaries. Presentation safely stringifies unknown and circular values, removes stack-frame lines, redacts local absolute paths, bounds output length, and relies on text rendering rather than injected markup. Browser, WASM, JSON, assertion, and internal implementation details do not masquerade as parser or semantic diagnostics.

## Acceptable Limitations

- The editor presents one active diagnostic decoration at a time.
- Related locations are accessible summaries/navigation targets, not secondary severity markers.
- Storage allocation diagnostics retain partial rejected-value/range metadata where producers cannot provide reliable fields.
- Reserved VM diagnostic codes remain non-user-visible without fabricated source mapping.
- Lessons, Demo Guide, practice tasks, FramePlan long explanations, raw Trace payloads, and remaining legacy/internal diagnostics remain deferred.

## Deferred Content

Phase 14 does not localize long learning content, raw technical payloads, source code, Generated CASL, machine words, register names, mnemonics, labels, identifiers, or implementation exceptions. No file open/save/project lifecycle was introduced.

## Final Result: PASS

The Phase 14 i18n and diagnostic baseline is internally consistent, compatible with existing TS/C++/WASM contracts, accessible at the current UI boundary, and protected by deterministic regression tests. Phase 14 is complete.

## Phase 15A Consumption Requirements

Phase 15A may begin file/project lifecycle work only if it treats locale as an application preference rather than file content, keeps diagnostics bound to their source unit, clears stale diagnostic selection when source ownership changes, preserves selection on locale-only changes, normalizes legacy/structured payloads through the existing adapter, and does not use localized messages as persistence keys, React keys, equality values, or source-range inputs.

Phase 15A defines that consumption boundary in [file-project-diagnostic-i18n-contract.md](file-project-diagnostic-i18n-contract.md), without changing the frozen Phase 14 baseline or adding file I/O behavior.
