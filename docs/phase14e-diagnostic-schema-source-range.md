# Phase 14E: Diagnostic Schema And Source-Range Hardening

## Scope

Phase 14E hardens the Phase 14D presentation contract. It adds typed code-to-parameter schemas, validates untrusted diagnostic payloads, freezes source-position semantics, introduces related declaration locations, and connects valid ranges to the existing source editor. It does not add error detection or change emitted CASL, ASTs, lowering, VM transitions, severity, or diagnostic order.

## Audit Findings

Phase 14D parameters were structurally named but still represented by a generic record. C++ serialized all parameter values as strings, token end positions were absent in the TypeScript C++ lexer, and the Errors panel could not select an exact source range. Duplicate diagnostics had no first-declaration relation. These were contract gaps rather than execution defects.

## Typed Schema And Runtime Validation

`DiagnosticParamSchemas` binds every `DiagnosticCode` to required and optional fields. `diagnosticSchemas` provides the equivalent runtime descriptor for WASM, JSON, and legacy inputs. Invalid structured data degrades to the legacy message; prototype-pollution keys and malformed location objects are rejected or removed safely.

## Source-Range Policy

Lines and columns are 1-based, TypeScript offsets are 0-based UTF-16 code units, and range ends are exclusive. LF/CRLF, tabs, CJK text, surrogate pairs, EOF insertions, and multi-line ordering are covered by tests. Supported ASCII CASL tokens have matching mock/C++/WASM positions; unsupported non-ASCII CASL identifiers remain outside the syntax contract.

## Related Locations

Duplicate labels and functions point primarily to the duplicate declaration and secondarily to the first declaration. Parameter/local conflicts point to the local declaration and retain the parameter declaration as a related location. Related coordinates remain stable across locale changes.

## Identity And Formatting

Identity uses code, severity, stable sorted parameters, primary coordinates, related coordinates, and optional file name. It excludes locale, rendered text, fallback text, raw stack data, and transient UI list indexes. Parameter formatting is centralized so technical values remain identical in all locales.

## TS, C++, And WASM Parity

The TypeScript mock enriches existing assembler diagnostics from the original source. The C++ catalog produces equivalent pilot ranges and typed parameter values. WASM serializes typed params, source ranges, and related locations while continuing to emit `line`, `message`, and `severity`. Old payloads remain accepted.

## UI Behavior

Errors are keyboard-focusable selection buttons. Selecting one reveals the precise token or insertion point using the existing Monaco integration. Related locations appear in a native `details` control. Source edits clear stale selection; locale switching preserves identity and editor selection. Long localized messages wrap without horizontal overflow.

## Tests

Tests cover compile-time schemas, runtime validation, unsafe keys, template placeholder parity, line/column/offset semantics, CRLF/LF, Unicode code units, assembler and C++ token ranges, duplicate related locations, identity stability, C++ CTest metadata, WASM DTO parsing, browser selection, 1280px overflow, and visual evidence.

## Remaining Limitations

Raw lexer/parser diagnostics without stable codes remain legacy-only. C++ semantic diagnostics are TypeScript-only because the C++ core does not compile the C++ subset. VM errors receive no fabricated source range. Multi-file related locations, Monaco hover providers, non-ASCII CASL identifiers, and broad P1/P2 diagnostic migration remain deferred.

## Next Recommendation

Phase 14F should inventory and structure the remaining parser diagnostics in small producer-owned groups, preserving the Phase 14E schema/range contract. Lessons, Demo Guide, practice tasks, FramePlan prose, and runtime Trace localization should remain separate editorial work.
