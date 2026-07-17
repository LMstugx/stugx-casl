# C++ Double Support

- Audience: Users and maintainers checking the double boundary
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [C++ Subset Capabilities](cpp-subset-capabilities.md), [Double Teaching ABI](../cpp-double-teaching-abi.md)

## Accepted Forms

- function-local `double` declaration
- declaration without an initializer
- finite decimal floating literal initialization
- finite scientific-notation literal initialization
- unary minus applied to a floating literal
- double literal assignment
- double-to-double assignment
- double self-assignment

Examples include `0.0`, `-0.0`, `1.5`, `-2.25`, `1.0e3`, `2.5e-2`, and `1E6`.

## Rejected Forms

- double arithmetic or comparison
- integer-to-double or double-to-integer conversion
- double function parameters or return values
- double arrays
- `float` and `long double`
- `f`, `F`, `l`, or `L` suffixes
- hexadecimal floating literals and digit separators
- pointers, references, members, heap storage, vector, lambda, and library operations

Rejected forms produce structured diagnostics and no partial CASL.

## Storage

Each object occupies four consecutive COMET II words in logical high-word-first order. Initialization and assignment are observable 16-bit load/store sequences. The Double Value Inspector decodes current VM memory; it does not model floating-point computation.
