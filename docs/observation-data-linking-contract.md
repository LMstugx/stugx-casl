# Observation Data Linking Contract

- Audience: Runtime adapter, UI, and visualization maintainers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Observation Workspace Layout](developer/observation-workspace-layout.md), [COMET Microcycle Runtime](developer/comet-microcycle-runtime.md), [Reverse History Integrity](reverse-history-integrity.md)

Circuit and auxiliary data views are projections of one runtime DTO. The UI must not infer execution from source text or maintain a second observation runtime.

## Runtime Relations

| Runtime event | Circuit relation | Auxiliary relation |
| --- | --- | --- |
| Register write | register and active path | changed register and current value |
| Memory read | MAR, Memory, MDR path | read address and row |
| Memory write | register/MDR/Memory path | written address, previous/current value when available |
| PUSH, POP, CALL, RET | SP and real Memory path | stack word, SP, call context |
| Fetch and Decode | PR, Memory, IR, decoder | current machine word and source mapping |
| Flag update | ALU/result to FR | OF, SF, and ZF change |

Read, written, manual-edit, restored-by-reverse, active, and selected states are distinct presentation identities. Color may reinforce them but cannot be their only indication.

## Selection And Following

Follow Execution may ensure a target is visible only when it leaves the current view. Disabling it stops automatic scrolling without changing the runtime target. User selection is presentation state and does not alter source ownership or VM state.

## Reverse

Reverse restores the runtime DTO first. Circuit, Register, Memory, Stack, Machine Code, Source Mapping, Trace, and change markers then render that restored state. The UI must not replay an animation, reconstruct state from source, or label a restored word as a forward write.

## Boundaries

- auxiliary tab and layout changes are not history barriers;
- locale and number-format changes are not history barriers;
- debugger edits remain mutation barriers;
- Reset, Reload, Full Clear, SVC, and I/O retain their existing barrier semantics;
- no observation state is stored in the source document or a new persistence key.
