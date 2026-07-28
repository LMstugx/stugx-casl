# ADR 0013: WCASL-compatible Workflow Without UI Replication

- Audience: Maintainers and compatibility reviewers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Parity Audit](../phase20a-wcasl-parity-audit.md), [CASL Compatibility Mode](../user/casl-compatibility-mode.md)

## Decision

stugx.CASL follows the IPA CASL II / COMET II specification for machine semantics and uses public WCASL-II material only to audit expected learning workflows. Compatibility is recorded with explicit statuses in a non-runtime baseline.

CASL Mode is a modern projection of the existing VM state. Standard macros expand to real machine instructions. Input uses a nonblocking queue. Reload modes affect only documented `DS` spans and never bypass source/assembly ownership.

## Rationale

Instruction semantics and reproducible results matter more than copying a legacy window layout. A separate emulator or duplicated UI would create state divergence and copyright risk. Sharing the same assembler, VM, DTO, persistence boundaries, and file lifecycle preserves parity across Web and Tauri.

## Consequences

- no WCASL assets, binaries, copied help text, or branding
- no claim of endorsement or official status
- no P0/P1 semantic gap may be hidden behind a richer UI
- debugger editing, reverse-step, and linking remain explicit later gates
- microcycle visualization requires a separate instruction-specific contract
- compatibility changes require an explicit baseline update and tests
