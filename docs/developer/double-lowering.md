# Double Lowering

- Audience: Transpiler and visualization maintainers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [C++ to CASL Pipeline](cpp-to-casl-pipeline.md), [Double Teaching ABI](../cpp-double-teaching-abi.md)

The double path extends the typed C++ teaching model without changing CASL II or COMET II semantics.

## Type And Storage Model

`CppScalarType` distinguishes `int` and `double`. Shared storage helpers return one word for `int` and four words for `double`. A `CppStorageObject` owns stable object metadata, a base generated label, four word labels, source ownership, and declaration range. It is source-derived runtime metadata and is never persisted.

## Literal Representation

The parser retains literal source text and source range. Semantic analysis validates the bounded decimal/scientific syntax and converts the finite ECMAScript Number to binary64 words immediately. `DataView` uses explicit byte order, and lowering consumes raw words rather than locale-formatted decimal text.

## Generated CASL

Literal initialization and assignment use `GR1` as the existing scratch register:

```casl
        LAD GR1,#400C
        ST GR1,MAIN_X
        LAD GR1,#0000
        ST GR1,MAIN_X_W1
```

The sequence continues for all four words. Variable copy emits `LD GR1,sourceWord` followed by `ST GR1,destinationWord` for word 0 through word 3. Double parameters and returns are rejected, so this scratch strategy does not alter the `GR1` to `GR3` argument convention.

Generated mapping kinds distinguish storage, initializer, literal assignment, copy read, and copy write while keeping every word instruction attached to the original C++ source range and semantic operation.

## Isolation

Existing integer lowering remains on its original one-word path. Unsupported double arithmetic, comparison, conversion, parameter, return, suffix, and array forms stop before CASL generation. No partial generated program is returned.
