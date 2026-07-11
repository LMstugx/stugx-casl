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
| parser token/grammar messages | lexer/parser raw English | error | varies | line | yes | n/a | pending-structure | pending / pending | P1 | Requires token/range audit in Phase 14E. |

## VM And Adapter

| Code | Current producer | Severity | Params | TS mock | C++ core | WASM | Status | Priority | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `vm.notLoaded` | C++ `step()` / `No program loaded` | error | none | no diagnostic event | yes | yes | localized | P1 | Mock currently returns unchanged state; no new trigger added. |
| `vm.stepLimitReached` | C++ `run()` | error | `stepLimit` when known | app stop reason, not diagnostic | yes | yes | localized | P1 | Missing parameter uses fallback. |
| `vm.invalidInstruction` | C++ `step()` illegal/missing instruction | error | `address` when known | output-only error | yes | yes | localized | P1 | No new mock diagnostic was introduced. |
| `vm.invalidMemoryAccess` | memory/PR API bounds | error | `address` | no user diagnostic | no diagnostic object | no | deferred | P2 | Existing API status remains unchanged. |
| `vm.stackUnderflow` | not currently exposed | error | none | no | no | no | deferred | P2 | Reserved stable code; no fake trigger. |
| `vm.stackOverflow` | not currently exposed | error | none | no | no | no | deferred | P2 | Reserved stable code; no fake trigger. |
| browser/WASM loader exception | adapter wrapper | error | raw exception | yes | n/a | n/a | intentionally-raw | P3 | Raw developer detail is not localized. |

## Technical Boundary

Source text, symbol spelling, opcode/mnemonic, register name, address, numeric literal, machine word, filename, `rawContext`, browser exception, stack trace, and runtime Trace payload remain unchanged in all locales. Lessons, Demo Guide, practice tasks, and FramePlan long explanations remain deferred.
