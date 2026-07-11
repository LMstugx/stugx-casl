# Phase 14B: I18n Glossary And Short UI Strings

## 1. Scope

Phase 14B formalizes terminology and migrates a bounded set of short UI strings. It does not change the Phase 14A provider, fallback, storage, locale normalization, runtime behavior, emitted CASL, or application information architecture.

## 2. Glossary Policy

English remains the canonical key language. Japanese and Simplified Chinese terms are approved in `docs/i18n-glossary.md`. Components use semantic keys and never branch directly on locale. Missing translations fall back to English; empty resource values are rejected.

## 3. Canonical Terminology

The glossary fixes one translation for actions, execution states, main panels, learning terms, machine concepts, and status relations. Technical names such as mnemonics, registers, addresses, labels, and machine words remain unchanged.

## 4. Compact And Full Labels

Toolbar and tab surfaces use approved compact labels. Explanatory prose may use an approved full form. For example, Step is `ステップ実行` / `单步执行` in full prose and `ステップ` / `单步` in the toolbar. Components must not invent further variants.

## 5. Short-String Inventory

`docs/i18n-short-string-inventory.md` records the key, English source, migration and locale status, recommended visual length, compact-label requirement, viewport risk, and context. The inventory distinguishes migrated, approved, pending, intentionally untranslated, and deferred long content.

## 6. Pilot Migration

The pilot adds translations for Output Dock tabs, common empty states, common table headings, Memory controls, and Details/Compact/Show more/Show less controls. Japanese and Simplified Chinese provide complete values for these approved pilot keys.

## 7. Untranslated Technical Boundary

Generated CASL lines, Machine Code words, CASL mnemonics, register names, addresses, source code, raw Trace payloads, identifiers, and labels remain untouched. Lessons, diagnostics, full Demo Guide text, Machine Code explanations, and FramePlan long explanations remain deferred.

## 8. Locale Length Risks

The 1280x720 checks cover toolbar stability, non-wrapping Output Dock tabs, non-overlapping Inspector tabs, Memory controls, empty states, and horizontal overflow. Compact terms are approved where needed; fixed widths and unreadably small type are not used.

## 9. Tests

Resource tests verify English completeness, partial-resource key validity, nonempty values, matching interpolation placeholders, and approved pilot coverage. UI and E2E tests verify Japanese and Chinese output/memory strings, accessible names, persistence, English fallback, technical content stability, and 1280px layout behavior.

## 10. Remaining Limitations

Japanese and Chinese resources are intentionally partial outside the approved pilot. Plural rules, rich text, diagnostics localization, lesson content, long teaching copy, and professional linguistic review across every screen remain future work.

## 11. Phase 14C Recommendation

Phase 14C should review and migrate compact Circuit Focus and learning-panel labels using the glossary, then separately design parameterized diagnostics. It should not mix long lesson translation with diagnostics or technical payload localization.

Phase 14C completed that bounded compact-label migration in `docs/phase14c-circuit-learning-compact-localization.md`. The glossary and inventory now distinguish migrated Circuit Focus labels from deferred teaching prose.
