# C++ Double Teaching ABI

- Audience: Users and maintainers of the C++ teaching subset
- Status: Contract
- Last reviewed version: 0.1.0
- Classification: Technical contract
- Related: [Double Reference](reference/cpp-double-support.md), [Double Lowering](developer/double-lowering.md)

## Scope

This contract defines how stugx.CASL presents a limited C++ `double` value on the 16-bit COMET II memory model. COMET II has no native floating-point instruction or 64-bit data path. The implementation exposes binary representation and word-by-word copy behavior only.

## Representation

- A C++ `double` uses the IEEE-754 binary64 representation produced by the transpiler host.
- A value is 64 bits and occupies four consecutive 16-bit COMET II words.
- Logical word order is high word first:
  - word 0: bits 63..48
  - word 1: bits 47..32
  - word 2: bits 31..16
  - word 3: bits 15..0
- The base generated label identifies word 0.
- This logical order is independent of browser, WebView, or host CPU byte order.

Examples:

| Value | Raw bits | Memory words |
| --- | --- | --- |
| `3.5` | `400C000000000000` | `400C 0000 0000 0000` |
| `-1.25` | `BFF4000000000000` | `BFF4 0000 0000 0000` |

## Initialization And Assignment

Literal initialization and literal assignment issue four deterministic 16-bit stores. Double-to-double assignment issues one load and one store for each word, in word order 0 through 3. Self-assignment uses the same safe stable copy. The source object is never cleared.

An uninitialized local receives four allocated words under the current static-label lowering. The simulator may show deterministic zeroed memory, but C++ source must not rely on an uninitialized local having value zero.

## Compatibility Boundary

This is a stugx.CASL teaching ABI. It does not claim to match every C++ platform ABI, physical host endianness, a native floating-point environment, or a COMET II FPU. Web, Tauri, Mock, and WASM presentation must produce the same four logical words.
