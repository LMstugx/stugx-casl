# Phase 14A: Internationalization Architecture Foundation

## 1. Goal

Phase 14A establishes a small, typed, client-only internationalization boundary. It validates locale selection, fallback, persistence, document metadata, and a limited pilot migration without changing execution, emitted CASL, layout, or technical learning content.

## 2. Supported Locales

`SupportedLocale` is exactly `en | ja | zh-CN`. The default locale is `en`, and the fallback locale is also `en`. Japanese and Simplified Chinese are supported locale selections, but their Phase 14A resources are intentionally incomplete.

## 3. Default And Fallback Locale

The provider reads a valid saved locale first, then normalizes `navigator.language`, then uses English. Missing Japanese or Chinese strings fall back to the complete English resource. An unknown runtime key returns the key instead of throwing, so a resource defect cannot crash production UI.

## 4. Locale Normalization

Normalization accepts `en`, `en-US`, `en-GB`, `ja`, `ja-JP`, `zh`, `zh-CN`, `zh-Hans`, and `zh-SG`. These normalize to `en`, `ja`, or `zh-CN`; unknown values normalize to `en`. Invalid saved values are ignored before browser-locale resolution.

## 5. Typed Translation Keys

`TranslationKey` is a semantic union such as `toolbar.assemble`, `status.ready`, and `inspector.sourceMap`. English uses a complete `Record<TranslationKey, string>`. Japanese and Chinese use typed partial records, so unknown keys are compile errors while missing reviewed translations remain an expected fallback condition.

English sentences are not keys. Components do not access resource objects and do not branch on a specific locale.

## 6. Resource Structure

The implementation lives under `src/i18n/`:

- `locale.ts`: supported locale and normalization contract
- `types.ts`: locale, key, params, translator, and context types
- `resources.ts`: fallback and plain-text interpolation
- `localeStorage.ts`: replaceable persistence adapter
- `I18nProvider.tsx` and `useI18n.ts`: React boundary
- `locales/en.ts`, `locales/ja.ts`, and `locales/zh-CN.ts`: resources

## 7. Provider And Hook API

`I18nProvider` owns only locale state. `useI18n()` exposes `locale`, `setLocale(locale)`, and `t(key, params)`. It wraps the application store instead of becoming part of the reducer, so locale changes cannot Assemble, Reset, mutate source, clear Trace, replace FramePlan selection, or alter VM state.

## 8. Locale Persistence

`WebLocalStorageLocaleStorage` uses `stugx.casl.locale`. Read and write failures are caught. Persistence is best-effort and never blocks rendering. The `LocaleStorage` interface can later be implemented by a desktop shell without changing component APIs.

## 9. Document Language

The provider synchronizes `document.documentElement.lang` to `en`, `ja`, or `zh-CN`. This metadata change does not alter Source Editor language, source contents, Monaco mode, or generated code.

## 10. Pilot Migration Scope

Phase 14A migrates only:

- Toolbar command labels and the existing JP / EN / CN selector
- CPU Flow, Registers / Stack, and Code / Machine labels
- Inspector heading and Registers, Memory, Source Map, and Trace tabs
- compact machine states including Ready, Running, Stopped, and Finished

The selector uses real buttons, `aria-pressed`, stable short labels, keyboard focus, English fallback, and persistence.

## 11. Excluded String Categories

Guided Lessons, demo descriptions, checkpoints, long empty-state explanations, Machine Code teaching explanations, FramePlan teaching text, and help copy remain for reviewed later phases. CASL mnemonics, C++ source, Generated CASL, machine words, labels, symbols, registers, addresses, values, user output, and technical Trace payloads are not UI translation resources.

## 12. Diagnostics Boundary

Assembler and transpiler diagnostics are deliberately excluded. A future `diagnostics.*` namespace must use stable diagnostic identifiers and explicit parameters. Phase 14A does not wrap existing diagnostic sentences in static UI keys.

## 13. Future Tauri Compatibility

The provider depends on `LocaleStorage`, not directly on a desktop API. A future Tauri adapter can replace web localStorage while retaining `SupportedLocale`, normalization, resources, and component behavior. Phase 14A does not add Tauri or file persistence.

## 14. Limitations

- Japanese and Chinese resources are intentionally incomplete and display English fallback.
- There is no plural, date, number, or currency formatter.
- Interpolation replaces named text parameters only and returns plain text; it does not evaluate HTML or expressions.
- Diagnostics, lessons, and long teaching content are not migrated.
- Phase 14A is an architecture and pilot pass, not a translation release.

## 15. Phase 14B Plan

Phase 14B should add a reviewed string inventory and reviewed Japanese pilot translations for short shell/navigation strings. It should verify text expansion and terminology before migrating lessons or diagnostics. Translation work must remain separate from layout redesign, runtime changes, and compiler behavior.

Phase 14B is documented in `phase14b-i18n-glossary-short-strings.md`. It adds the reviewed glossary, short-string inventory, resource-integrity checks, and a bounded Japanese and Simplified Chinese pilot while retaining this provider, fallback, storage, and normalization contract.
