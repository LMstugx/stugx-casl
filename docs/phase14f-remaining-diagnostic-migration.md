# Phase 14F: Remaining Parser And P1 Diagnostic Migration

## Scope

Phase 14F migrates existing user-visible P1 parser, assembler, semantic, and transpiler messages to the Phase 14E structured diagnostic contract. It does not add error detection, alter parser recovery, change severity or ordering, modify ASTs or emitted CASL, or change VM execution.

## Initial Producer Audit

The audit searched the TS CASL mock, C++ assembler/catalog, C++ subset lexer/parser/semantic/transpiler, VM, WASM adapter, and Errors UI. Sites were classified as P1 structured, P2 deferred, internal-only, or intentionally raw. Browser exceptions, JSON parser internals, invariant failures, stack traces, `rawContext`, source snippets, and Trace payloads remain outside localized primary messages.

Each structured item now carries a stable producer: `casl-parser`, `assembler`, `cpp-lexer`, `cpp-parser`, `semantic`, `transpiler`, `vm`, or `wasm-adapter`. Legacy payloads infer the producer from the diagnostic namespace when possible.

## Migrated CASL Diagnostics

- `assembler.missingOpcode`
- `assembler.invalidLiteral`
- `assembler.missingOperand`
- `assembler.unexpectedTrailingOperand`

The TS mock and C++ catalog retain their original trigger and fallback text. Missing operands use a line-end insertion range. Trailing operands retain the rejected operand and cover that token. Invalid literals retain the rejected literal. Existing range-limit diagnostics remain separate.

## Migrated C++ Lexer And Parser Diagnostics

The lexer now structures unsupported characters and unterminated block comments. The parser structures expected/unexpected tokens, missing semicolons, invalid function/parameter/variable declarations, invalid assignments, unsupported call statements, invalid `if`/`for` forms, unsupported expressions, and unsupported comparison operators.

The verified group includes `cppParser.unexpectedToken`, `cppParser.expectedToken`, `cppParser.unterminatedBlock`, `cppParser.missingSemicolon`, declaration/statement-specific codes, `cppParser.unsupportedExpression`, and `cppParser.unsupportedOperator`.

Missing semicolons use an insertion range. EOF errors use the EOF token range. Unterminated block comments use EOF as the primary insertion point and the opening delimiter as a related location. Parser synchronization and AST production are unchanged.

## Migrated Semantic And Transpiler Diagnostics

P1 migrations cover unsupported `main` parameters, duplicate parameters and variables, unsupported initializers, invalid conditions, signed 16-bit integer literal bounds, unsupported forward declarations, unsupported expression forms, and the existing lowering exception wrapper. Rejected identifiers/literals remain unchanged technical values. Internal lowering details are retained only in `rawContext`.

## VM And WASM Wrappers

Existing stable VM codes remain unchanged. No VM source range is fabricated. WASM JSON now carries the optional stable producer field and continues to accept legacy diagnostics. Browser/WASM loader exceptions remain internal or intentionally raw because they do not have a stable actionable source location in this phase.

## Schemas And Rejected Values

Every migrated code has a strict TypeScript parameter schema and matching runtime schema. `token`, `literal`, `operator`, `mnemonic`, `operand`, and `construct` are used only when the producer reliably has them. Long source fragments are not placed in message parameters. Templates in English, Japanese, and Simplified Chinese use identical placeholder sets.

## Source-Range Policies

Phase 14E remains authoritative: lines and columns are 1-based, TypeScript offsets are 0-based UTF-16 code units, and ends are exclusive. Migration adds metadata only. It does not change lexer/parser acceptance or recovery. Non-ASCII CASL identifiers remain unsupported.

## TS, C++, And WASM Parity

Shared CASL tests cover invalid literals, missing operands, trailing operands, producer values, rejected parameters, and source ranges across TS mock, C++ direct, and WASM. C++ subset diagnostics remain TypeScript-only; no C++ compiler parity is claimed. Legacy payload compatibility and operation success semantics remain intact.

## Locale Rendering

English is canonical. Japanese and Simplified Chinese templates localize only the surrounding diagnostic sentence. Tokens, operators, symbols, labels, mnemonics, registers, addresses, machine words, source code, and raw context remain unchanged. Locale switching rerenders messages without parsing or assembling again and does not change identity, count, order, range, or selection.

## Remaining Legacy Diagnostics

Generated-label conflicts, some specialized semantic shape errors, low-frequency storage/directive boundaries, and browser/WASM implementation failures remain P2, legacy-only, internal-only, or intentionally raw as recorded in the inventory. Lessons, Demo Guide, practice tasks, FramePlan long explanations, and Trace payloads remain deferred.

## Tests

Tests cover typed schemas, locale placeholder parity, producer attribution, C++ lexer/parser codes and insertion ranges, CASL rejected values, semantic/transpiler P1 codes, locale-independent identity, C++ catalog metadata, WASM parity, legacy compatibility, unchanged valid output, and 1280px visual review coverage.

## Next Recommendation

The next phase should audit the remaining P2 diagnostic inventory and decide which items have sufficiently stable producer semantics for migration. It should not broaden parser syntax or mix lesson-content localization into the diagnostic contract.
