# C++ to CASL Pipeline

- Audience: Transpiler and compiler maintainers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [C++ Subset Capabilities](../reference/cpp-subset-capabilities.md), [CASL Assembler](casl-assembler.md)

The TypeScript pipeline parses a bounded C++ teaching language into typed AST nodes, performs semantic checks, and lowers supported constructs into deterministic CASL II.

Accepted statements include `int` variable declarations, bounded local `double` storage declarations, assignments, returns, `if`/`else`, `while`, `for`, `break`, and `continue`. Integer expressions are identifiers, integer literals, calls, and binary addition/subtraction. Conditions use the six integer comparison operators.

Function results use `GR0`. Up to three integer arguments use `GR1`, `GR2`, and `GR3`. Static namespaced labels represent current local storage; stack-frame locals and arguments are not emitted.

Generated labels and source mappings are compiler-owned data. Failures are structured diagnostics, and unsupported syntax must not be guessed or passed to a native compiler.

The double path uses typed object metadata and four consecutive high-word-first 16-bit words. Literal writes and object copies map every word instruction back to one C++ semantic operation. It does not alter integer lowering or add VM floating-point behavior. See [Double Lowering](double-lowering.md).

Any expansion of this language requires AST, parser, semantic, lowering, diagnostic, WASM parity, documentation, and regression updates together.
