# Phase 14D: Diagnostic Code And Parameterized Localization Architecture

## Scope

Phase 14D introduces stable structured diagnostic metadata and localized presentation for a low-risk pilot. It preserves every existing diagnostic trigger, order, severity, source line, assembly result, emitted CASL result, and VM transition.

## Structured Diagnostic Architecture

The new contract separates stable `DiagnosticCode`, named `DiagnosticParams`, source metadata, raw context, and rendered message. Existing `line/message/severity` fields remain compatible. Locale and rendered text are not diagnostic identity.

## Migrated Pilot Codes

The pilot covers required START/END directives, unknown opcode/symbol, duplicate label, register/index errors, malformed/incorrect operand lists, range errors, missing/duplicate C++ functions, unknown function/variable, argument mismatch, recursion, loop-control misuse, register-argument limits, complex call arguments, and existing C++ core VM not-loaded/step-limit/invalid-instruction diagnostics.

VM invalid-memory and stack underflow/overflow codes are reserved but remain deferred because current runtime APIs do not emit user diagnostic objects for those conditions. Phase 14D does not add new error paths.

## Resource Templates

English is canonical. Approved Japanese and Simplified Chinese templates use identical named placeholders. Symbols, labels, opcodes, mnemonics, registers, addresses, values, functions, and variables are interpolated verbatim as plain text.

## UI Rendering

Errors and diagnostic Messages render from the current locale at React render time. The stable source line is shown separately, the code is secondary metadata, and long CJK messages wrap safely. Raw technical context remains available to future details UI and is never translated.

## Locale Switch Behavior

Switching EN -> JA -> zh-CN rerenders only the message and source-line label. It does not assemble, transpile, reset, run, mutate source, alter generated CASL, change VM/memory state, or change diagnostic count/order/identity.

## Fallback Behavior

Missing localized templates use English. Missing required parameters use the producer's legacy `fallbackMessage` rather than leaking an unresolved placeholder. Unknown codes and old payloads keep their original message. Renderer failures do not crash the application.

## Compatibility And Parity

TS mock results and C++ core results normalize equivalent assembler errors to shared codes. WASM JSON carries optional structured fields while retaining legacy fields. Old payloads remain accepted, and current golden execution output is unchanged.

## Tests

Tests cover the stable union, structured parameters, message-independent identity, preserved severity/location/order, resource completeness and placeholder parity, assembler/C++ pilot producers, C++ CTest codes, WASM structured/legacy payload parsing, localized UI rendering, locale state preservation, wrapping, 1280px overflow, and visual review scenes.

## Remaining Raw Diagnostics

Lexer/parser grammar sentences, low-frequency assembler boundaries without reliable parameters, browser/WASM loader exceptions, internal exceptions, and unsupported VM stack diagnostics remain raw or deferred. Lessons, Demo Guide, practice tasks, FramePlan prose, source, Generated CASL, machine words, registers, and Trace payloads remain outside diagnostic translation.

## Phase 14E Recommendation

Phase 14E should audit parser token/range diagnostics and remaining P1 inventory entries. It should add typed per-code parameter schemas before broad migration and keep lesson content as a separate editorial phase.
