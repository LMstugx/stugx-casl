# C++ to CASL Pipeline

- Audience: Transpiler and compiler maintainers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [C++ Subset Capabilities](../reference/cpp-subset-capabilities.md), [CASL Assembler](casl-assembler.md)

The TypeScript pipeline parses a bounded C++ teaching language into typed AST nodes, performs semantic checks, and lowers supported constructs into deterministic CASL II.

Supported statements include `int` variable declarations, assignments, returns, `if`/`else`, `while`, `for`, `break`, and `continue`. Expressions are identifiers, integer literals, calls, and binary addition/subtraction. Conditions use the six supported comparison operators.

Function results use `GR0`. Up to three integer arguments use `GR1`, `GR2`, and `GR3`. Static namespaced labels represent current local storage; stack-frame locals and arguments are not emitted.

Generated labels and source mappings are compiler-owned data. Failures are structured diagnostics, and unsupported syntax must not be guessed or passed to a native compiler.

Any expansion of this language requires AST, parser, semantic, lowering, diagnostic, WASM parity, documentation, and regression updates together.
