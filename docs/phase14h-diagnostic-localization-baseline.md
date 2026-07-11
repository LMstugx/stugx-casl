# Phase 14H: Diagnostic Localization Baseline Freeze And UX Compatibility QA

## Scope

Phase 14H freezes the structured diagnostic and localization contract created in Phases 14A-G. It does not add codes, migrate P2 diagnostics, add triggers, change parser/assembler recovery, alter ASTs or emitted CASL, change lowering, or add VM events. Work is limited to a machine-verifiable manifest, compatibility tests, and presentation/accessibility corrections.

## Frozen Diagnostic Contract

The baseline contains 55 structured codes and the eight existing producers. Runtime TypeScript registries remain the source of truth; [diagnostic-localization-baseline-v1.json](diagnostic-localization-baseline-v1.json) is a checked snapshot. Tests fail when code order, allowed producers, required/optional params, locale coverage, backend ownership, or parity scope drift.

The manifest is not imported by runtime code and cannot change behavior. Future contract changes require an explicit baseline version rather than silently editing v1.

## Structured Payload Baseline

Structured payloads retain `code`, `producer`, strict `params`, `severity`, optional primary range, optional related locations, optional `rawContext`, and canonical fallback text. All 55 codes have English, Japanese, and Simplified Chinese resources. Technical parameters remain verbatim.

## Legacy Compatibility

Message-only and message-plus-range payloads remain valid. A missing producer is inferred only from the known code namespace. Unknown codes and missing/invalid required params degrade to the safe legacy message without fabricating parameters or locations. Old WASM JSON remains accepted. Compatibility conversion preserves diagnostic order and surrounding operation success/failure.

## Internal And Raw Policy

Browser API exceptions, WASM initialization/JSON details, impossible AST states, assertions, and unknown exception objects are not ordinary localized diagnostics. A stable outer wrapper may be localized; raw detail remains collapsed developer context. Presentation removes stack-frame lines and local paths, limits length, safely stringifies circular values, and relies on React text escaping. `rawContext` is never interpolated into the main message.

## Identity Contract

Identity remains based on producer/code or a legacy discriminator, severity, primary range or line fallback, sorted stable parameters, related coordinates, and optional source unit. Locale, rendered message, fallback text, and raw context are excluded. EN/JA/zh-CN changes preserve count, order, severity, selection, primary range, related locations, editor marker, source, emitted CASL, and VM state.

## Source-Range Contract

Phase 14E remains authoritative: line/column are 1-based, TypeScript offset is a 0-based UTF-16 code-unit offset, and end is exclusive. Invalid tokens cover the rejected token. Missing tokens and EOF use zero-length insertion ranges. The existing gutter marker provides a stable insertion location without highlighting an unrelated token.

## Related-Location Policy

Primary ranges continue to identify the current error. Reliable related locations identify the first declaration or opening delimiter. The Errors details view now renders each related location as a native keyboard button. Activating it updates only the editor presentation range and keeps diagnostic identity/selection unchanged. No generated CASL range is presented as C++ source.

## Locale Coverage

All structured diagnostic templates are present in `en`, `ja`, and `zh-CN`, with English fallback. Placeholder sets remain schema-checked. Symbols, identifiers, labels, mnemonics, registers, addresses, machine words, source, Generated CASL, and raw Trace remain untranslated.

## Accessibility Findings

The Errors list now exposes listbox/option semantics, `aria-selected`, an accessible severity/name, a labelled count, native keyboard Details, and keyboard related-location controls. Focus-visible styling uses the shared design system. Diagnostic code and producer are secondary developer details rather than part of the main row. Empty diagnostics retain a compact shared panel state.

## Viewport Findings

EN/JA/zh-CN, long function/generated labels, related locations, multiple errors, expanded details, and insertion markers are reviewed at 1920x1080, 1440x900, and 1280x720. Long text wraps within the panel. Errors do not create horizontal page overflow or a tiny nested scroll trap. Natural page scrolling and bounded long-data panels remain unchanged.

## Compatibility Findings

Structured, legacy, partially structured, unknown-code, and old WASM payloads remain safe. The generated-label conflict stays TypeScript-only. Shared CASL parity claims remain unchanged. Reserved VM codes remain non-user-visible and no event was added.

## Fixed UX Issues

- Related locations are keyboard-activatable and navigate to their existing source range.
- Code and producer moved to low-weight Details.
- Raw developer context is sanitized, bounded, and collapsed.
- Selected diagnostics expose `aria-selected` and severity text.
- Monaco decorations receive locale-current plain-text hover content.
- Zero-length ranges retain a stable gutter marker without a fabricated token highlight.

## Acceptable Limitations

The editor has one active diagnostic decoration at a time. Related locations are summaries/navigation targets, not secondary error-severity markers. Internal lowering wrappers cannot be produced through valid source input, so they are contract-tested rather than exposed through a visual-only trigger. Storage allocation ranges remain partial, and reserved VM codes still have no user event/source mapping.

## Prohibited Future Regressions

Future file import, save, desktop, or UI work must not use localized messages as identity/React keys, import the baseline manifest into runtime behavior, remove legacy WASM compatibility, translate technical values, expose raw stack/path data as the main message, fabricate ranges/parity, or change code/schema/resource coverage without a new reviewed baseline version.

## Phase 14I Recommendation

Phase 14I should perform the final internationalization documentation and release-readiness freeze. It should preserve this diagnostic baseline and avoid lesson-content migration or new storage/VM diagnostic events unless separately scoped.

Phase 14I completed that gate with `PASS`; see [phase14i-i18n-diagnostics-final-quality-gate.md](phase14i-i18n-diagnostics-final-quality-gate.md). The v1 manifest and runtime registry remain aligned without expanding translation or diagnostic scope.
