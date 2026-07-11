# Source Range Contract

## Position Basis

User-facing `line` and `column` are 1-based. TypeScript `offset`, when present, is a 0-based UTF-16 code-unit offset into the exact source string. A `SourceRange` starts inclusively and ends exclusively. An insertion point is a valid empty range where start equals end. Multi-line ranges are valid, ordered, and bounded by the known source length.

## Newlines, Tabs, And Unicode

LF and CRLF produce the same user-visible line and column for the same token. Offsets differ because the exact source strings differ. Column is a source UTF-16 code-unit column, not a rendered tab-stop column. A tab advances one source column. CJK characters consume one UTF-16 code unit; a surrogate-pair character consumes two.

The TypeScript C++ lexer records exact UTF-16 start/end offsets. The C++ CASL core records byte offsets; supported CASL identifiers and technical tokens are ASCII, so verified pilot positions match the UTF-16 contract. Non-ASCII CASL identifiers are not a supported syntax feature and are not claimed as parity-complete.

## Location Policy

- `assembler.missingStart`: insertion at the first meaningful source character, or file start.
- `assembler.missingEnd`: EOF insertion point.
- Unknown opcode/symbol and invalid register/index: the corresponding token.
- Duplicate label/function: primary range on the duplicate and a related location on the first declaration.
- Malformed operand list: the malformed comma or operand boundary.
- Unknown variable/function and recursion: the identifier or call target.
- Argument-count mismatch: the call target in the current AST metadata boundary.
- `break` / `continue` outside a loop: the keyword.
- Parameter/local conflict: the local declaration with the parameter declaration as related location.
- Missing C++ semicolon: zero-length insertion at the current token or EOF.
- Unterminated C++ block comment: EOF insertion point with the opening delimiter as a related location.
- CASL missing operand: zero-length insertion at the trimmed line end.
- CASL trailing operand and invalid literal: the rejected token.
- VM diagnostics: no source range unless reliable runtime source mapping exists; a machine address is never fabricated as a source line.

## Lexer And Parser Expectations

Tokens carry start-inclusive/end-exclusive ranges, including EOF as an empty range. Parser recovery retains the current token range. A missing token uses the parser insertion point instead of an unrelated previous token. Range metadata may be corrected without changing parser acceptance, recovery, AST shape, or diagnostic order.

## Related Locations

`DiagnosticRelatedLocation` carries an optional localized label key, a stable source range, and optional file name. The primary location always points at the current error. Phase 14E verifies duplicate CASL labels, duplicate C++ functions, and parameter/local conflicts. Legacy payloads may omit related locations.

## UI Behavior

Selecting a diagnostic decorates and reveals its valid range in the existing Monaco editor. Empty ranges remain insertion points. Incoming ranges are structurally validated and clamped to the current editor model before selection, so stale or malformed payloads do not crash the editor. Locale changes rerender text but do not move the selection.

## TS, C++, And WASM Parity

Mock, C++ direct, and WASM pilot tests verify unknown opcode/symbol, duplicate label, invalid register, malformed comma, and missing START/END metadata. WASM adds optional `sourceRange` and `relatedLocations` while retaining old payload compatibility. Diagnostic conditions, ordering, severity, and operation success are unchanged.

## Phase 14G Generated-Label Location

For `transpiler.generatedLabelConflict`, the primary range covers the later C++ function name and a related location covers the first function name that projected to the same generated CASL label. The generated label itself is a parameter, not a fabricated C++ source range. Program-memory, `DS`, and `DC` allocation overflows remain line-level/partial because no single rejected token is reliable across producers.

## Baseline Presentation

Phase 14H does not alter producer coordinates. The editor renders a stable gutter marker for a zero-length insertion range and a token decoration for non-empty ranges. Related-location activation swaps the presentation range only; identity and primary metadata remain unchanged. Locale-current hover text is presentation-only and cannot calculate or move a range.
