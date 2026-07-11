# Diagnostic Parameter Schema

## Purpose

Every stable `DiagnosticCode` has a corresponding entry in `DiagnosticParamSchemas` and a runtime descriptor in `diagnosticSchemas`. The TypeScript producer API binds the selected code to its permitted parameters at compile time. This hardening does not add diagnostic triggers or change severity, ordering, assembly success, emitted CASL, or VM behavior.

## Code-To-Parameter Mapping

Assembler codes use `opcode`, `symbol`, `label`, `register`, `indexRegister`, `mnemonic`, `operand`, `literal`, and optional boundary values. C++ parser codes use `token`, `expectedToken`, `actualToken`, `operator`, and documented optional context. Semantic and transpiler codes use `function`, `variable`, `construct`, counts, and retained literal text. VM step-limit diagnostics require numeric `stepLimit`.

No-parameter codes use an explicit empty schema rather than a generic record. Optional fields have a producer reason: legacy address/literal diagnostics may not retain the rejected value, and `actualCount` for the register-argument limit is retained for details while the compact template uses `maximum`.

## Runtime Validation

`validateDiagnosticPayload()` is the untrusted JSON and legacy boundary. It accepts a valid structured payload, accepts the old `line/message/severity` payload, or degrades an invalid structured payload to a safe legacy diagnostic. It validates required names, primitive types, range structure, and related locations. Unknown codes, missing required values, and invalid types do not crash the UI.

The keys `__proto__`, `constructor`, and `prototype` are rejected. Extra keys do not execute code and are reported by validation tests. `message`, `fallbackMessage`, and `rawContext` remain plain text.

## Template Placeholder Contract

`getDiagnosticTemplateSchema(code)` exposes the approved placeholder schema. English, Japanese, and Simplified Chinese templates use the same placeholder set. Every placeholder must exist in the schema, and every required template parameter must be used. Optional parameters may be details-only or cause the renderer to use the legacy fallback when an older producer cannot supply a value.

## Parameter Formatting

`formatDiagnosticParam()` centralizes presentation. Counts, line/column values, and limits are decimal. Numeric addresses use the project word formatter. Symbols, labels, identifiers, registers, opcodes, mnemonics, and tokens remain unchanged. Templates do not manually add an address prefix, execute HTML, or interpolate `rawContext`.

## Compatibility

C++ stores parameter values as `string | int | bool` variants and WASM serializes those JSON types directly. The legacy `message` field remains present. Old WASM payloads remain valid, and invalid new fields do not change the success/failure result carried by the surrounding operation.

## Remaining Limits

Low-frequency parser/semantic boundary sentences, browser exceptions, and internal debug diagnostics remain legacy-only, deferred, or intentionally raw as recorded in the inventory. Adding a new code requires a TypeScript schema, runtime descriptor, locale-template audit, inventory entry, and parity tests.

## Phase 14G P2 Schema Decision

`transpiler.generatedLabelConflict` requires exactly `function: string` and `label: string`. Both values are stable technical data and remain untranslated. The runtime validator drops and reports unknown fields, rejects missing required fields to the legacy fallback, and never uses `rawContext` as a translation parameter. Storage allocation boundaries were not given a broader `value` escape hatch because their producers do not consistently retain one rejected value.

## Baseline Compatibility

Phase 14H snapshots every required and optional parameter name. Schema drift fails tests, but the manifest does not validate runtime payloads. `validateDiagnosticPayload()` remains the only untrusted payload boundary. Message-only, old WASM, unknown-code, and partial structured payloads continue to use safe legacy fallback without invented params.
