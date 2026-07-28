# Phase 20B.1 FR Specification Alignment

- Audience: Maintainers and QA reviewers
- Status: Historical implementation record
- Last reviewed version: 0.1.0
- Classification: Historical
- Related: [Phase 20B](phase20b-debugger-state-editing.md), [ADR 0015](adr/0015-comet-flag-register-three-bit-contract.md)

## Scope

Phase 20B.1 corrects the debugger branch before merge by aligning every public
FR boundary with the official COMET II `OF` / `SF` / `ZF` schema. It does not
change opcodes, assembler output, normal instruction results, file lifecycle,
persistence, diagnostics, or clean-wire behavior.

## Finding

The conflict was an implementation defect, not only a report typo. A fourth
carry field existed in TypeScript and C++ machine state, DTO/WASM JSON, UI,
debugger input, fixtures, and documentation.

## Corrected Contract

- Public machine state: exactly `OF`, `SF`, and `ZF`.
- DTO/WASM JSON: exactly `frOF`, `frSF`, and `frZF`.
- Packed bridge value: `OF=0x4`, `SF=0x2`, `ZF=0x1`; higher bits rejected.
- Debugger input: exact structured `{ of, sf, zf }`, applied atomically.
- Shift family: final shifted-out bit is written to `OF`.
- `ADDL`/`SUBL`: private carry/borrow intermediate determines `OF`.
- Logical and compare instructions expose only the three official fields.
- Full Clear initializes all three fields to false.

## Isolation

Internal carry/borrow variables are scoped to arithmetic helper functions and
are never stored, serialized, rendered, persisted, or logged. Software
floating-point status remains a separate non-COMET contract.

## Compatibility

The WCASL compatibility baseline retains its Phase 20A feature classifications
and counts. The register-edit entry now identifies the official three-field FR
limitation and atomic edit test. Historical Phase documents link this
correction instead of being rewritten as though the defect never existed.

## Result

**PASS.** Phase 20B.1 removes the non-standard public flag without changing
instruction encodings or normal VM results.

- complete Vitest run with rebuilt WASM: 1,515 passed
- Mock/WASM browser E2E: 69 passed
- WASM-focused browser E2E: 17 passed
- native C++ CTest: 71 passed
- WASM adapter: 24 passed
- visual review: 3 viewport galleries passed, including three locales and
  1,180/1,280 FR editing
- production static smoke: root and configured subpath passed
- stress corpus: 61 passed; WASM and C++ follow-up suites passed
- Tauri release executable, NSIS bundle, and offline verification passed
- dependency audit: no known vulnerabilities

The existing production main-chunk size warning remains an accepted Phase 17
limitation. It is unrelated to FR state and does not alter this result.
