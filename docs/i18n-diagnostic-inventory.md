# I18n Diagnostic Inventory

## Status And Priority

Localization status is one of `structured`, `localized`, `pending-structure`, `intentionally-raw`, `internal-only`, or `deferred`. Priority is P0 (frequent user error), P1 (common structural error), P2 (boundary error), or P3 (internal/debug only). `message` remains the canonical English fallback during migration.

## CASL Assembler

| Code | Current producer / English sentence | Severity | Params | Range | TS mock | C++ core | WASM | Status | JA / zh-CN | Priority | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `assembler.missingStart` | assembler / `CASL source must contain START directive` | error | none | line | yes | yes | yes | localized | complete / complete | P0 | Trigger/order unchanged. |
| `assembler.missingEnd` | assembler / `CASL source must contain END directive` | error | none | line | yes | yes | yes | localized | complete / complete | P0 | Trigger/order unchanged. |
| `assembler.unknownOpcode` | parser / `Unknown opcode: ...` or mock unsupported operation | error | `opcode` when known | line | yes | yes | yes | localized | complete / complete | P0 | Missing producer token uses legacy fallback. |
| `assembler.unknownSymbol` | address resolver / `Undefined symbol/label: ...` | error | `symbol` | line | yes | yes | yes | localized | complete / complete | P0 | Mock/C++ share code despite legacy wording. |
| `assembler.duplicateLabel` | pass 1 / `Duplicate label: ...` | error | `label` | line | yes | yes | yes | localized | complete / complete | P0 | Label remains verbatim. |
| `assembler.invalidRegister` | operand parser / `Unsupported/Invalid register ...` | error | `register` | line | yes | yes | yes | localized | complete / complete | P0 | Register token remains verbatim. |
| `assembler.invalidIndexRegister` | index parser / invalid index or GR0 restriction | error | `indexRegister` | line | yes | yes | yes | localized | complete / complete | P0 | GR0 is not translated. |
| `assembler.malformedOperandList` | comma validator | error | none | line | yes | yes | yes | localized | complete / complete | P0 | Exact legacy condition retained. |
| `assembler.invalidOperandCount` | instruction operand validation | error | `mnemonic` | line | yes | yes | yes | localized | complete / complete | P0 | Mnemonic remains verbatim. |
| `assembler.addressOutOfRange` | address/storage bounds | error | `value` when known | line | yes | yes | yes | localized | complete / complete | P1 | Missing value uses legacy fallback. |
| `assembler.literalOutOfRange` | literal parser/storage bounds | error | `value` when known | line | yes | yes | yes | localized | complete / complete | P1 | Literal remains verbatim. |
| `assembler.missingOpcode` | CASL parser / missing operation after label | error | optional `label` | line-end insertion | yes | yes | yes | localized / verified | complete / complete | P1 | Producer is `casl-parser`; no new parser rejection. |
| `assembler.invalidLiteral` | numeric parser / invalid literal | error | required `literal` | rejected literal | yes | yes | yes | localized / verified | complete / complete | P1 | Distinct from numeric range errors. |
| `assembler.missingOperand` | operand validation / existing requires-operand messages | error | required `mnemonic` | line-end insertion | yes | yes | yes | localized / verified | complete / complete | P1 | Existing trigger and fallback sentence retained. |
| `assembler.unexpectedTrailingOperand` | operand validation / existing extra/index operand messages | error | required `mnemonic`, `operand` | rejected operand | yes | yes | yes | localized / verified | complete / complete | P1 | Rejected operand retained from source. |

## C++ Parser, Semantic, And Transpiler

| Code | Current producer / English sentence | Severity | Params | Range | TS | C++ core / WASM | Status | JA / zh-CN | Priority | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `semantic.mainFunctionMissing` | semantic / `must define int main()` | error | none | line | yes | n/a | localized | complete / complete | P0 | Empty source follows the same existing condition. |
| `semantic.duplicateFunction` | semantic / duplicate declaration | error | `function` | line | yes | n/a | localized | complete / complete | P0 | Function name verbatim. |
| `semantic.unknownFunction` | call validation / not defined | error | `function` | line | yes | n/a | localized | complete / complete | P0 | Function name verbatim. |
| `semantic.unknownVariable` | assignment/expression validation | error | `function`, `variable` | line | yes | n/a | localized | complete / complete | P0 | Covers existing undeclared/use-before-declaration cases. |
| `semantic.argumentCountMismatch` | call validation | error | `function`, `expectedCount`, `actualCount` | line | yes | n/a | localized | complete / complete | P0 | Message fallback unchanged. |
| `semantic.recursionUnsupported` | call validation | error | `function` | line | yes | n/a | localized | complete / complete | P1 | Recursion remains unsupported. |
| `semantic.breakOutsideLoop` | statement validation | error | none | line | yes | n/a | localized | complete / complete | P0 | Keyword remains `break`. |
| `semantic.continueOutsideLoop` | statement validation | error | none | line | yes | n/a | localized | complete / complete | P0 | Keyword remains `continue`. |
| `semantic.parameterLocalConflict` | declaration validation | error | `function`, `variable` | line | yes | n/a | localized | complete / complete | P1 | Variable name verbatim. |
| `transpiler.tooManyRegisterArguments` | parameter validation | error | `function`, `maximum`, `actualCount` | line | yes | n/a | localized | complete / complete | P0 | Calling convention remains GR1-GR3. |
| `transpiler.unsupportedCallArgument` | call argument validation | error | `function`, `argumentCount` | line | yes | n/a | localized | complete / complete | P1 | Does not add syntax. |
| remaining parser fallback messages | lexer/parser low-frequency or internal English | error | varies | existing location | audited | n/a | internal-only / deferred | English fallback | P2/P3 | No additional stable user-visible parser P2 site was found in Phase 14G. |
| `cppParser.unexpectedToken` | C++ lexer/parser / unsupported character or syntax token | error | required `token`; optional `expected` | offending token | yes | n/a | localized / verified | complete / complete | P1 | `cpp-lexer` or `cpp-parser` producer is explicit. |
| `cppParser.expectedToken` | C++ parser consume boundary | error | required `expectedToken`; optional `actualToken` | current token or EOF | yes | n/a | localized / verified | complete / complete | P1 | Recovery unchanged. |
| `cppParser.unterminatedBlock` | C++ lexer / unterminated block comment | error | optional `construct` | EOF insertion | yes | n/a | localized / verified | complete / complete | P1 | Opening delimiter is a related location. |
| `cppParser.missingSemicolon` | C++ parser / existing expected-semicolon messages | error | none | insertion point | yes | n/a | localized / verified | complete / complete | P1 | Does not highlight the next statement. |
| `cppParser.invalidFunctionDeclaration` | C++ parser / unsupported return/declaration form | error | optional `token` | offending token | yes | n/a | localized / verified | complete / complete | P1 | Pointer syntax remains rejected. |
| `cppParser.invalidParameterList` | C++ parser / unsupported parameter form | error | optional `token` | offending token | yes | n/a | localized / verified | complete / complete | P1 | Grammar unchanged. |
| `cppParser.invalidVariableDeclaration` | C++ parser / unsupported variable declaration | error | optional `token` | offending token | yes | n/a | localized / verified | complete / complete | P1 | Grammar unchanged. |
| `cppParser.invalidAssignment` | C++ parser / invalid assignment/update form | error | optional `token` | offending token | yes | n/a | localized / verified | complete / complete | P1 | Parser recovery unchanged. |
| `cppParser.invalidIfStatement` | C++ parser / existing unsupported else-if form | error | optional `token` | offending token | yes | n/a | localized / verified | complete / complete | P1 | No `else if` support added. |
| `cppParser.invalidForStatement` | C++ parser / existing initializer/condition/increment limits | error | optional `token` | offending token | yes | n/a | localized / verified | complete / complete | P1 | Existing multiple diagnostics/order retained. |
| `cppParser.invalidCallExpression` | C++ parser / call used as statement | error | optional `token` | call target | yes | n/a | localized / verified | complete / complete | P1 | Call-expression feature set unchanged. |
| `cppParser.unsupportedExpression` | C++ parser / unsupported primary expression | error | required `token` | offending token | yes | n/a | localized / verified | complete / complete | P1 | Source text stays technical. |
| `cppParser.unsupportedOperator` | C++ parser / invalid condition operator | error | required `operator`; optional `construct` | operator/current token | yes | n/a | localized / verified | complete / complete | P1 | Approved operators unchanged. |
| `semantic.unsupportedMainParameters` | semantic / existing main-parameter rejection | error | required `actualCount` | first parameter | yes | n/a | localized / verified | complete / complete | P1 | Trigger unchanged. |
| `semantic.duplicateParameter` | semantic / duplicate parameter name | error | required `variable`; optional `function` | duplicate identifier | yes | n/a | localized / verified | complete / complete | P1 | First declaration related location when reliable. |
| `semantic.duplicateVariable` | semantic / duplicate local declaration | error | required `variable`; optional `function` | duplicate identifier | yes | n/a | localized / verified | complete / complete | P1 | First declaration related location retained. |
| `semantic.unsupportedInitializer` | semantic / non-literal variable initializer | error | required `variable` | declaration identifier | yes | n/a | localized / verified | complete / complete | P1 | Expression analysis/order unchanged. |
| `semantic.invalidCondition` | semantic / existing condition-shape restriction | error | required `construct` | condition owner when reliable | yes | n/a | localized / verified | complete / complete | P1 | No condition syntax added. |
| `semantic.integerLiteralOutOfRange` | semantic / signed 16-bit bound | error | required raw `literal` | literal token when reliable | yes | n/a | localized / verified | complete / complete | P1 | Raw spelling is retained. |
| `semantic.forwardDeclarationUnsupported` | semantic / call before definition | error | required `function` | call target | yes | n/a | localized / verified | complete / complete | P1 | Forward declarations remain unsupported. |
| `transpiler.unsupportedExpression` | semantic/transpiler validation / unsupported expression shapes | error | required `construct` | existing line metadata | yes | n/a | localized / verified | complete / complete | P1 | No internal invariant is exposed as this code. |
| `transpiler.generatedLabelConflict` | generated function-label projection | error | required `function`, `label` | conflicting function name; related first declaration | yes | n/a | localized / verified | complete / complete | P2 | TypeScript C++ subset only; C++ core parity is not claimed. |
| `transpiler.internalLoweringFailure` | transpiler catch boundary | error | none | none | yes | n/a | localized / verified | complete / complete | P2 | Raw exception is details-only `rawContext`. |

## VM And Adapter

| Code | Current producer | Severity | Params | TS mock | C++ core | WASM | Status | Priority | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `vm.notLoaded` | C++ `step()` / `No program loaded` | error | none | no diagnostic event | yes | yes | localized | P1 | Mock currently returns unchanged state; no new trigger added. |
| `vm.stepLimitReached` | C++ `run()` | error | `stepLimit` when known | app stop reason, not diagnostic | yes | yes | localized | P1 | Missing parameter uses fallback. |
| `vm.invalidInstruction` | C++ `step()` illegal/missing instruction | error | `address` when known | output-only error | yes | yes | localized | P1 | No new mock diagnostic was introduced. |
| `vm.invalidMemoryAccess` | memory/PR API bounds | error | `address` | no user diagnostic | no diagnostic object | no | deferred | P2 | Existing API status remains unchanged. |
| `vm.stackUnderflow` | not currently exposed | error | none | no | no | no | deferred | P2 | Reserved stable code; no fake trigger. |
| `vm.stackOverflow` | not currently exposed | error | none | no | no | no | deferred | P2 | Reserved stable code; no fake trigger. |
| browser/WASM loader exception | adapter wrapper | error | raw exception | yes | n/a | n/a | intentionally-raw | P3 | Raw developer detail is not localized; no stable user action/source range exists. |

## Phase 14G P2 Stability Decisions

Phase 14G records **9 audited P2 units**. Every actual remaining unit has one explicit decision.

| Producer | Actual trigger/message | Decision | Stable params | Primary/related range policy | Parity and reason |
| --- | --- | --- | --- | --- | --- |
| transpiler | generated function-label conflict | `migrate-now` | `function`, `label` | conflicting declaration / first declaration | TS C++ subset only; localized and verified. |
| assembler | `Program memory exceeds 0xFFFF` | `blocked-unreliable-params` | no single rejected value | line fallback only | TS/C++ text mapping exists; metadata parity is partial. |
| assembler | `DS address out of range` | `blocked-unreliable-range` | allocation count is not a stable rejected value | no fabricated operand range | TS/C++ condition exists; exact token ownership differs. |
| assembler | `DC address out of range` | `blocked-unreliable-range` | no single failing value for multi-value storage | no fabricated operand range | TS/C++ condition exists; exact token ownership differs. |
| vm | invalid memory access reserved code | `remain-legacy` | schema requires `address` | none without reliable mapping | No current user diagnostic trigger. |
| vm | stack underflow reserved code | `remain-legacy` | none | none | No current user diagnostic trigger. |
| vm | stack overflow reserved code | `remain-legacy` | none | none | No current user diagnostic trigger. |
| transpiler | lowerer invariant exceptions | `internal-only` | raw exception excluded | none | Invariant exceptions remain in `rawContext`; stable wrapper already localized. |
| wasm-adapter | JSON/load/browser implementation exceptions | `intentionally-raw` | raw exception excluded | none | Browser and loader details are intentionally raw developer context. |

No actual trigger was found for separate generated-storage-conflict, invalid-generated-storage-request, or unresolved-generated-reference diagnostics. No code or trigger was created for those hypothetical names.

## Technical Boundary

Source text, symbol spelling, opcode/mnemonic, register name, address, numeric literal, machine word, filename, `rawContext`, browser exception, stack trace, and runtime Trace payload remain unchanged in all locales. Lessons, Demo Guide, practice tasks, and FramePlan long explanations remain deferred.

## Phase 14E Schema And Range Verification

| Pilot group | Parameter schema | Required / optional params | Primary range policy | Related location policy | TS range | C++ range | WASM range | Schema validation | Parity status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Missing START / END | verified | none | first meaningful insertion / EOF | none | verified | verified | verified | verified | verified |
| Unknown opcode / symbol | verified | `opcode` / `symbol` required | offending token | none | verified | verified for supported ASCII CASL | verified | verified | verified |
| Duplicate label | verified | `label` required; first/duplicate line optional | duplicate label | first label declaration | verified | verified | verified | verified | verified |
| Invalid register / index | verified | register token required | offending register | none | verified | verified | verified | verified | verified |
| Malformed comma | verified | none | malformed comma | none | verified | verified | verified | verified | verified |
| Address / literal range | verified | rejected value and limits optional for legacy producers | token when retained | none | partial | partial | partial | verified | partial |
| C++ semantic pilot | verified | code-specific | identifier, keyword, or call target | duplicate function and parameter/local conflict | verified | n/a | n/a | verified | verified within TS producer |
| VM pilot | verified | step limit numeric; runtime address optional/required by code | reliable mapping only | none | partial | partial | partial | verified | legacy location only |
| C++ parser P1 group | verified | code-specific token/construct params | token or insertion point | opening delimiter when reliable | verified | n/a | n/a | verified | verified within TS producer |
| Remaining P2 parser/internal messages | audited | producer-specific | reliable location only | reliable location only | verified decision | n/a | n/a | verified decision | see Phase 14G table |

`verified` means exercised by automated tests. `partial` means the producer cannot reliably retain every value or source range. `legacy-only` means the old message remains the supported contract; no location is fabricated.

## Phase 14H Baseline Freeze

The Phase 14 inventory originally froze 55 structured codes. Phase 19A appended nine double-boundary semantic codes, and Phase 20F appends twelve linker codes, for 76 reviewed entries in `diagnostic-localization-baseline-v1.json`. Tests compare code order, producer allowlists, parameter schemas, locale coverage, backend ownership, and parity scope. Internal/raw payload classes are excluded from user localization. The three reserved VM codes remain `userVisible: false`; `transpiler.generatedLabelConflict` remains `ts-only`.
