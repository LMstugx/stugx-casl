# C++ Subset Workflow

- Audience: Users studying compiler lowering
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [C++ Subset Capabilities](../reference/cpp-subset-capabilities.md), [Unsupported C++ Features](../reference/unsupported-cpp-features.md)

The C++ teaching path is:

```text
C++ teaching subset
-> parser and semantic checks
-> Generated CASL II
-> CASL assembler
-> COMET II machine code
-> COMET II execution
```

The application does not read system headers and does not invoke a native C++ compiler. C++ input is processed by the project's bounded parser and lowering pipeline, then executed only as generated COMET II code.

This is not complete C++, and it does not provide the complete C++ standard library. A bounded `double` path exposes binary64 storage and word-by-word assignment only. It does not provide floating-point arithmetic, comparison, conversion, function parameters, returns, or arrays. Other unsupported features include pointers, references, classes, templates, vectors, lambdas, iostreams, recursion, overloads, and stack-frame locals.

Always consult [C++ Subset Capabilities](../reference/cpp-subset-capabilities.md) for the current allowlist. Use [Double Memory Observation](double-memory-observation.md) for the four-word teaching workflow.
