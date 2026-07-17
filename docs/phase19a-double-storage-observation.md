# Phase 19A: Double Storage Observation

## Scope

Phase 19A adds a bounded binary64 storage and copy observation path to the C++ teaching subset. It does not add floating-point arithmetic, comparison, conversion, function calling, arrays, native execution, or VM instructions.

## Contract

The [Double Teaching ABI](cpp-double-teaching-abi.md) fixes four consecutive 16-bit words in logical high-word-first order. Initializers and assignments lower to real CASL word stores and copies. Existing `int` output remains unchanged.

## Presentation

Memory groups four rows as one object. The Double Value Inspector reads live VM memory. Trace, Source Mapping, Machine Code, and Signal Probe retain one C++ semantic operation while identifying the current word. Circuit Focus uses only existing 16-bit paths and the clean-wire contract.

## Diagnostics

Nine structured semantic codes cover unsupported arithmetic, comparison, parameters, returns, scalar conversions, invalid or out-of-range literals, suffixes, and arrays. The Phase 14 manifest is explicitly extended without renaming or reordering prior codes.

## Security And Privacy

No native compiler, shell, network request, storage key, source persistence, path persistence, or runtime floating-point operation is introduced. Literal parsing uses the transpiler host's binary64 conversion once, then lowering operates only on the captured raw words. Source-derived object metadata is discarded when the source unit changes.

## Result

Local implementation gate: **PASS**.

Unit, documentation, Web, WASM, C++, stress, production root/subpath, visual,
and Tauri release validation passed on the feature branch. The public deployment
gate remains pending until this commit is merged to `master`; the deployed result
is recorded after Cloudflare Pages serves the merged source commit.
