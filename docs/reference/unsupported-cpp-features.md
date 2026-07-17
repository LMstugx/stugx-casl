# Unsupported C++ Features

- Audience: Users checking C++ boundaries
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [C++ Subset Capabilities](cpp-subset-capabilities.md), [Known Limitations](known-limitations.md)

The following are outside the current C++ teaching subset:

- classes, structs, unions, templates, namespaces, and exceptions
- arrays, pointers, references, dynamic allocation, and RAII
- character and string types; floating-point arithmetic, comparison, conversion, parameters, returns, arrays, `float`, and `long double`
- iostreams, containers such as `std::vector`, algorithms, and the complete standard library
- lambdas, overloads, function pointers, recursion, and more than three parameters
- stack arguments and runtime stack-frame locals
- `switch`, `do while`, `&&`, `||`, and unary `!`
- complete C++ scope, conversion, type, preprocessing, and header semantics
- native compiler invocation or native code execution

Unsupported syntax should produce a bounded parser/semantic/transpiler diagnostic. It must not be guessed, ignored, or executed outside the COMET II model.

The one exception to the broader floating-point boundary is the documented four-word `double` storage and assignment observation path. It does not provide floating-point computation; see [C++ Double Support](cpp-double-support.md).
