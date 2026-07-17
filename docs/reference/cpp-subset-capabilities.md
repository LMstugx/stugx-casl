# C++ Subset Capabilities

- Audience: C++ subset users and transpiler maintainers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Unsupported C++ Features](unsupported-cpp-features.md), [C++ to CASL Pipeline](../developer/cpp-to-casl-pipeline.md)

The accepted language is an explicit teaching subset.

## Functions

- `int main()`
- additional `int` functions
- zero to three `int` parameters
- direct function calls
- return values in `GR0`
- argument registers `GR1`, `GR2`, and `GR3`

## Statements

- `int` variable declarations
- assignment
- `return`
- `if` / `else`
- `while`
- `for`
- `break` and `continue` inside loops

## Expressions and Conditions

- integer literals and identifiers
- binary `+` and `-`
- direct function calls in supported positions
- `==`, `!=`, `<`, `<=`, `>`, `>=`
- `i++`, `++i`, `i--`, `--i`, `+=`, and `-=`

The implementation parses this subset itself, emits CASL II, assembles it, and executes COMET II code. It does not use native C++ execution or system headers.
