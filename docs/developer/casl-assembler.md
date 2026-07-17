# CASL Assembler

- Audience: Assembler and bridge maintainers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [CASL Syntax Support](../reference/casl-syntax-support.md), [Diagnostic Codes](../reference/diagnostic-codes.md)

The C++ core parses the documented CASL teaching subset, resolves labels, validates operands and ranges, and emits COMET II words plus source mapping.

Directives are `START`, `END`, `DC`, and `DS`. The exact instruction allowlist is maintained in [Supported CASL Instructions](../reference/supported-casl-instructions.md).

Address operands support labels or numeric values and, where defined, index addressing with `GR1` through `GR7`. `GR0` is rejected as an index register. Effective addresses wrap to 16 bits in execution.

Assembler diagnostics use stable producer/code/parameter/range contracts. Existing machine words are regression-protected; documentation work must never alter encoding.

The TypeScript Mock and C++/WASM paths are tested for DTO parity. Production must not substitute Mock output when WASM assembly fails.
