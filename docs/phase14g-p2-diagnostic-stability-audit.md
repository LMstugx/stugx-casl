# Phase 14G: Remaining P2 Diagnostic Stability Audit

## Scope

Phase 14G audits the remaining user-visible and implementation-boundary P2 diagnostic candidates after the P1 migration. The admission decision is evidence-based: a candidate is migrated only when its semantic identity, producer, parameters, source location, locale templates, and backend ownership are stable. Parser and assembler acceptance, diagnostic trigger/count/order/severity, ASTs, emitted CASL, lowering, and VM execution remain unchanged.

## Admission Criteria

A `migrate-now` item needs a stable semantic code, an existing producer, a strict parameter schema, a real source token or insertion point, locale-safe English/Japanese/Simplified Chinese templates, and a clear TS/C++/WASM ownership statement. Missing evidence results in `remain-legacy`, `internal-only`, `intentionally-raw`, or a documented blocked decision. No source range or backend parity is inferred from an implementation message.

## Complete P2 Inventory

The audit covers **9 audited P2 units**:

| Unit | Decision | Reason |
| --- | --- | --- |
| Generated function-label conflict | `migrate-now` | Stable source function, generated CASL label, current declaration range, and first declaration are available. |
| Program memory allocation exceeds `0xFFFF` | `blocked-unreliable-params` | The allocation pass does not retain one rejected source value. |
| `DS` allocation address overflow | `blocked-unreliable-range` | The failing allocation has no single rejected token that is valid across TS and C++. |
| `DC` allocation address overflow | `blocked-unreliable-range` | A multi-value directive can cross the boundary without one reliable source operand range. |
| VM invalid memory access | `remain-legacy` | No current user diagnostic trigger; API status behavior must not be changed to create one. |
| VM stack underflow | `remain-legacy` | Reserved code only; no current user diagnostic trigger. |
| VM stack overflow | `remain-legacy` | Reserved code only; no current user diagnostic trigger. |
| Lowerer invariant exceptions | `internal-only` | The stable outer diagnostic already exists; invariant exceptions remain in `rawContext`. |
| WASM JSON/load/browser exceptions | `intentionally-raw` | Browser and loader details are intentionally raw developer context behind existing operation boundaries. |

The audit found no separate user diagnostic for “duplicate generated storage label”, “invalid generated storage request”, or “unresolved generated reference”. Those proposed names are not counted and no trigger was invented.

## Migrate-Now Items

`transpiler.generatedLabelConflict` is the only migrated P2 code. It is emitted when two distinct C++ function names map to the same generated CASL label, such as `foo` and `FOO` mapping to `FUNC_FOO`. The strict parameters are `function` and `label`. The primary range covers the conflicting function declaration; a related location points to the first function declaration.

The fallback English sentence and its original position in the semantic diagnostic sequence are retained. The existing `usedLabels` set still controls collision detection. A separate owner map records metadata only and does not participate in allocation or acceptance.

## Remain-Legacy Items

`vm.invalidMemoryAccess`, `vm.stackUnderflow`, and `vm.stackOverflow` remain reserved/deferred. They have resource/schema entries for compatibility, but no current user diagnostic object is emitted. Producing one would add a trigger or change VM behavior, which this phase explicitly forbids.

## Internal-Only And Intentionally Raw Items

Lowerer throws represent impossible or prevalidated AST states. The user-facing wrapper remains `transpiler.internalLoweringFailure`; raw exception text is details-only `rawContext`. WASM instantiation, JSON parsing, browser API, and unknown exception details remain intentionally raw developer context. They are not relabeled as parser or semantic errors and do not expose stack traces or paths in localized primary messages.

## Blocked Items And Reasons

The three storage-allocation messages continue to normalize to the existing `assembler.addressOutOfRange` compatibility code where possible, but their P2 metadata is not promoted to verified. `Program memory exceeds 0xFFFF` lacks a single rejected value. `DS address out of range` and `DC address out of range` lack a backend-consistent token range for the allocation failure. Line-level fallback remains preferable to a fabricated operand range.

## Producer And Schema Decisions

The migrated conflict uses producer `transpiler`, not `semantic`: C++ source names are valid independently, and the collision arises from the generated CASL label projection. Its schema is exactly `{ function: string; label: string }`; unknown fields are discarded and reported by runtime validation, while missing required fields fall back safely.

## Source Range Findings

The conflict primary range covers the later function name and the related range covers the first function name. Both use the Phase 14E contract: 1-based line/column, 0-based UTF-16 offset in TypeScript, and exclusive end. Generated CASL text is not presented as a C++ source range. Storage and VM candidates remain without fabricated ranges.

## Parity Findings

The generated-label conflict is owned by the TypeScript C++ subset transpiler. TypeScript C++ subset only; C++ core parity is not claimed. Shared CASL storage messages remain compatibility-normalized across TS/C++/WASM, but their rejected-value/range metadata remains partial. The WASM adapter accepts the new code through the generic structured payload contract without inventing a C++ producer.

## Localization Decisions

English, Japanese, and Simplified Chinese templates localize only the surrounding explanation. Function spelling and generated CASL label remain unchanged. Locale switching rerenders the message without reparsing or reassembling and preserves identity, severity, count, order, primary range, related range, and selection.

## Behavior Invariance

Valid C++ input emits identical CASL before and after this phase. The migrated invalid input still emits one error at the same producer loop position and remains unsuccessful. No VM state, instruction encoding, parser recovery, source acceptance, or diagnostic severity changes.

## Remaining Backlog

Storage-allocation diagnostics need producer-owned rejected allocation metadata before further hardening. VM reserved codes need a separately approved user diagnostic event contract and reliable source mapping. Internal browser/WASM details remain outside localization. Lessons, Demo Guide, practice tasks, FramePlan long explanations, and raw Trace payloads remain deferred.

## Phase 14H Recommendation

Phase 14H should freeze the diagnostic localization baseline and run compatibility/QA review. It should not create new VM events or broaden syntax merely to reduce the remaining partial count.
