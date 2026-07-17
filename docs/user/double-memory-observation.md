# Double Memory Observation

- Audience: Users studying multi-word C++ storage
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [C++ Subset Workflow](cpp-subset-workflow.md), [Double Reference](../reference/cpp-double-support.md)

The `C++: Double Storage` example demonstrates how one binary64 value occupies four consecutive 16-bit COMET II words.

## Workflow

1. Select `C++: Double Storage`.
2. Assemble the source.
3. Inspect the generated storage labels and CASL instructions.
4. Open Memory and choose `x` or one of `x.word0` through `x.word3`.
5. Use Step while `y = x` executes.
6. Observe each source word load and destination word store.
7. Confirm that `y` ends with raw hex `400C000000000000` and decoded value `3.5`.

The Double Value Inspector decodes the current four words from VM memory. It does not reuse the source literal as the current value. Raw hex, binary, sign, exponent, fraction, classification, and decoded value remain technical machine data in every locale.

This observation path has no floating-point arithmetic and no 64-bit hardware bus. Circuit Focus continues to display the actual 16-bit Memory, MDR, and GR paths for the current CASL instruction.

An uninitialized `double` occupies four words, but its source-level value is indeterminate. Deterministic zeroed simulator memory is a visualization convenience, not a C++ initialization guarantee.
