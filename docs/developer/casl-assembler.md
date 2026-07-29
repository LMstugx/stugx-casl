# CASL Assembler

- Audience: Assembler and bridge maintainers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [CASL Syntax Support](../reference/casl-syntax-support.md), [Diagnostic Codes](../reference/diagnostic-codes.md)

The C++ core parses the documented CASL II profile, resolves labels, validates operands and ranges, expands the four standard macros, and emits COMET II words plus source mapping.

Directives are `START`, `END`, `DC`, and `DS`. The exact instruction allowlist is maintained in [Supported CASL Instructions](../reference/supported-casl-instructions.md). `DC` handles numeric/address lists and character strings; literal operands create collision-safe generated storage.

Address operands support labels or numeric values and, where defined, index addressing with `GR1` through `GR7`. `GR0` is rejected as an index register. Effective addresses wrap to 16 bits in execution.

Assembler diagnostics use stable producer/code/parameter/range contracts. Existing machine words are regression-protected; documentation work must never alter encoding.

The TypeScript Mock and C++/WASM paths are tested for DTO parity. Production must not substitute Mock output when WASM assembly fails.

The assembler result also drives CASL Mode assembler output. Symbol, literal, entry-point, source-line, and machine-word views must be derived from that result rather than maintained independently.

For a project module, the same assembler emits module-relative words, scoped symbols, per-module literals, source mappings, and explicit address-word relocation records. An unresolved cross-module `CALL` is retained as a relocation; an unresolved local reference remains an assembly error. Final addresses are owned by the [CASL Linker](casl-linker.md), not the parser.
