# Phase 20A WCASL-II Parity Audit

Phase 20A was audited on 2026-07-28 against this hierarchy:

1. [IPA CASL II / COMET II public specification](https://www.ipa.go.jp/en/it-examinations/nph2g600000007uh-att/000009652.pdf)
2. [WCASL-II simulator manual](https://www.ics.teikyo-u.ac.jp/wcasl2/wcasl2-applet/doc/usage_sim.html), [command reference](https://www.ics.teikyo-u.ac.jp/wcasl/ref.html), and [usage index](https://www.ics.teikyo-u.ac.jp/wcasl2/usage/index.html)
3. frozen stugx.CASL runtime, diagnostic, file, persistence, and visualization contracts
4. independently written conformance programs

The IPA specification decides instruction semantics. WCASL material is used only to audit workflow and display expectations. No WCASL source, binary, logo, screenshot, manual text, or installer is included.

## Result

The machine-readable result is [wcasl-compatibility-baseline-v1.json](wcasl-compatibility-baseline-v1.json). All official machine instructions, register forms, address/index forms, directives, literals, and standard macros have runtime evidence across the assembler, machine decoder, VM, Mock, C++ Core, and WASM boundary.

CASL Mode uses the same machine state as existing Observation Modes. It adds no runtime, persistence key, network call, source mutation, or automatic execution. Console input is queued and nonblocking. Reload cannot restore a stale assembly over Dirty source.

## Deliberate Differences

- the interface is responsive and multilingual rather than a WCASL UI copy
- structured diagnostics and source ranges are a modern superset
- top-level `RET` is the established teaching-runtime completion rule
- `IN` / `OUT` clear otherwise undefined `FR` deterministically
- console history is bounded
- register and memory editing, reverse execution, and full clear remain deferred debugger features

## P0 And P1 Gate

No P0 feature is missing or unclassified. Every P1 feature is `exact`, `compatible`, or `superset`. Remaining `partial`, `missing`, and `blocked-needs-spec-evidence` items are P2: microcycles, debugger mutation/reverse execution, multi-program linking, and undocumented WCASL project import.

## Baseline Protection

Phase 14 diagnostic identity is unchanged. Phase 15 single-document file lifecycle and Phase 16 independent persistence stores are unchanged. Existing C++ lowering, double storage, COMET II opcodes, and clean-wire behavior remain regression-tested.

Final wording is **WCASL-II replacement candidate** and **WCASL-compatible workflow in progress**, not perfect replacement.
