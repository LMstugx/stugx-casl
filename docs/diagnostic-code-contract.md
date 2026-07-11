# Diagnostic Code Contract

## Purpose

Diagnostics use stable machine-readable codes and named parameters while retaining the legacy English `message` as a compatibility fallback. This is a presentation-contract increment: it does not change when a diagnostic is emitted, its severity, source location, ordering, assembly success, emitted CASL, or VM behavior.

## Code Naming

`DiagnosticCode` is a TypeScript string union. Codes use semantic namespaces such as `assembler.*`, `cppParser.*`, `semantic.*`, `transpiler.*`, and `vm.*`; dynamic values never appear in a code. Component names and full English sentences are not codes. Equivalent mock and C++ core diagnostics use the same code when both producers expose the same semantic error.

`DiagnosticProducer` is a separate stable machine field: `casl-parser`, `assembler`, `cpp-lexer`, `cpp-parser`, `semantic`, `transpiler`, `vm`, or `wasm-adapter`. It is not localized and does not replace the code namespace. Legacy structured payloads may infer it from the code.

## Severity

`DiagnosticSeverity` is `error | warning | info`. Existing diagnostics retain their original severity. Phase 14D does not promote, demote, add, or suppress any error.

## Parameters

`DiagnosticParamValue` supports `string | number | boolean`. Stable names include `symbol`, `label`, `opcode`, `mnemonic`, `register`, `indexRegister`, `address`, `value`, `function`, `variable`, `expectedCount`, `actualCount`, `argumentCount`, `maximum`, and `stepLimit`. Technical values remain verbatim and are interpolated as plain text; no HTML is evaluated.

## Source Location

The existing 1-based `line` field remains compatible. Optional `sourceRange`, `fileName`, and `rawContext` fields can carry richer producer data without entering translation templates. A producer must not invent columns or ranges it does not know.

## Renderer And Fallback

`renderDiagnostic(diagnostic, locale)` resolves `diagnostics.<code>` through the existing typed i18n adapter. Missing locale templates fall back to English. An unresolved placeholder falls back to `fallbackMessage` or legacy `message`; an unknown/legacy code safely preserves the old message. Rendering never throws into the UI.

## Diagnostic Identity

`diagnosticIdentity()` uses producer, code, severity, source location, stable sorted parameters, and optional file name. It does not use locale or rendered message. EN -> JA -> zh-CN therefore rerenders the same item without changing count, order, selection, or source state.

## TS, C++, And WASM Parity

- TS mock diagnostics are normalized after the existing producer logic runs.
- C++ assembler and VM results pass through the equivalent `DiagnosticCatalog` normalization.
- WASM JSON adds optional `code`, `producer`, `params`, `rawContext`, and `fallbackMessage` fields.
- The old `line`, `message`, and `severity` payload remains valid and supported.
- Unknown future WASM codes are treated as legacy messages by the UI adapter.

The mock and C++ assembler currently differ in some legacy English wording (`Undefined symbol` versus `Undefined label`), but both normalize to `assembler.unknownSymbol` with the same `symbol` parameter.

## Compatibility

The legacy `message` field remains required during migration. Existing consumers may continue to display it. Structured fields are optional in DTOs, old WASM payloads parse unchanged, and successful assembly output is byte-for-byte unaffected.

## Untranslated Technical Values

Source code, identifiers, labels, symbols, mnemonics, register names, opcodes, addresses, numeric literals, machine words, filenames, raw context, stack traces, and Trace payloads are never translated. Only the surrounding diagnostic sentence is localized.

## Future Extensions

Phase 14E adds the per-code typed schema, runtime payload validation, source ranges, related locations, and editor selection described in [diagnostic-parameter-schema.md](diagnostic-parameter-schema.md) and [source-range-contract.md](source-range-contract.md). Phase 14F adds the verified P1 producer group. Phase 14G admits only `transpiler.generatedLabelConflict` from the remaining P2 set; storage boundaries, reserved VM codes, and implementation exceptions retain their documented legacy/internal decisions. Plural rules and rich diagnostic help remain out of scope.

## P2 Admission Rule

A P2 code is not promoted because a raw English sentence exists. It needs a stable semantic identity, producer, strict parameters, reliable primary location, locale-safe templates, and an explicit backend ownership statement. `transpiler.generatedLabelConflict` meets that rule with `function` and generated `label` parameters. The original exception text of a lowerer or WASM/browser failure remains `rawContext`, not a localized parser or semantic message.

## Baseline Freeze

Phase 14H freezes 55 structured codes in `diagnostic-localization-baseline-v1.json`. Runtime registries remain authoritative; tests compare the snapshot against code order, producer allowlists, schemas, locale resources, backend ownership, and parity scope. The v1 manifest is never imported by runtime code. A future intentional contract change requires a reviewed new baseline version.
