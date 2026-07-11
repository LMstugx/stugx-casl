# I18n String Boundary

## Translatable UI Strings

Static application chrome belongs in the typed UI resource layer: commands, panel titles, navigation tabs, modes, short statuses, accessible control names, and shared empty-state labels. Keys describe meaning (`toolbar.run`), not the current English sentence.

Phase 14A includes only a small pilot. Phase 14B adds reviewed short strings. Phase 14C adds Circuit Focus and compact learning-panel labels. Phase 14D adds parameterized localization for an inventoried diagnostic pilot, while Lessons, Demo Guide text, practice tasks, FramePlan prose, and other long copy still require a separate content review.

## Technical Identifiers That Remain Unchanged

The following are technical data and must not be translated:

- CASL II mnemonics and directives
- COMET II register and flag names
- C++ source and identifiers
- Generated CASL source
- machine-code addresses, words, opcodes, operands, and labels
- FramePlan symbol names and debug labels
- memory addresses and values
- user-selected demo source

Translated surrounding UI may explain these values, but must preserve the value itself.

## User-Generated And Runtime Content

User source, program output, console data, labels, symbols, and runtime Trace payloads remain verbatim. The UI must never pass these strings through `t()` or use them as translation keys.

## Diagnostics Strategy

Phase 14D uses a separate `diagnostics.*` namespace backed by stable diagnostic codes and named parameters. Phase 14F extends that boundary to existing P1 parser/semantic producers without translating rejected tokens or raw technical context. Locale changes rerender messages without rerunning producers. Legacy English messages remain compatibility fallbacks; source ranges and raw context stay outside templates. Raw diagnostic sentences must not be copied into the static UI namespace.

Phase 14E binds every stable code to a typed parameter schema and validates untrusted WASM/legacy payloads at runtime. Technical parameter values remain untranslated. Source ranges, related locations, identity fields, and raw context never enter translation templates; localized messages cannot change their coordinates or selection identity.

Phase 14G localizes the stable generated-function-label conflict while preserving the function spelling and generated CASL label verbatim. Storage allocation messages without reliable rejected values/ranges remain compatibility fallbacks. Lowerer invariants and browser/WASM implementation exceptions remain internal or intentionally raw details rather than localized user syntax errors.

Phase 14H freezes this boundary in a non-runtime baseline manifest. Localized summary text is presentation only. Identity, source locations, related locations, raw context, legacy payloads, generated labels, and backend ownership remain outside translation-resource control.

## Lesson And Example Content Strategy

Guided Lessons, demo descriptions, checkpoints, practice tasks, and long help text need a reviewed content model beyond the Phase 14B short-string inventory. They are not automatic string extraction. Example source and expected technical identifiers remain verbatim inside any future translated teaching copy.

## Machine Code And CASL Terminology Policy

CASL, COMET II, mnemonic, register, address, word, opcode, operand, label, PR, SP, FR, GR0-GR7, MAR, MDR, ALU, and EAU are controlled technical terms. A future locale glossary may translate explanations around them, but code tokens and values stay unchanged.

## Safety Rules

- Components call `useI18n().t()` and never import locale resources.
- Components do not contain locale-specific branches.
- Interpolation returns plain text and never uses `dangerouslySetInnerHTML`.
- Missing localized strings use the English fallback.
- Empty localized values are invalid and cannot suppress English fallback.
- Approved terminology and compact labels come from `i18n-glossary.md`; components do not invent variants.
- A locale switch changes presentation metadata only; it does not mutate source, execution, Trace, lessons, examples, or FramePlan state.
- Compact Circuit Focus labels may be translated around technical values, but mnemonics, register names, addresses, Generated CASL, machine words, and raw Trace payloads remain verbatim.

## Phase 14 Final Gate

Phase 14I closes the current locale and diagnostic boundary with a `PASS`; see [phase14i-i18n-diagnostics-final-quality-gate.md](phase14i-i18n-diagnostics-final-quality-gate.md). File/project lifecycle work must preserve locale as an application preference and keep localized diagnostic text out of source ownership, identity, and persistence keys.
