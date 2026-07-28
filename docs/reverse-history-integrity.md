# Reverse History Integrity

- Audience: Runtime and security reviewers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Reverse Runtime Contract](reverse-microstep-runtime-contract.md), [Debugger Barriers](debugger-history-barrier-contract.md), [Security Model](developer/security-model.md)

Microcycle history is a bounded sequence of reversible transactions, not a list of screenshots.

## Entry Contents

Each C++ entry owns a stable sequence, history epoch, timeline revisions before and after, machine address, phase, architectural and teaching snapshots excluding full Memory, sparse Memory deltas, microcycle context, and exact Trace additions/removals.

A memory delta is an address plus one before-value and one after-value. Addresses are deterministic and unique within an entry. The Core does not copy all 65536 words into every history record.

Trace rollback removes only the exact suffix introduced by the reversed microcycle and restores any rows removed from the front by the bounded Trace capacity. Reverse never appends a fake execution event.

## Capacity

At most 1000 entries are retained. When capacity removes the oldest entry, the runtime records a floor ID and dropped count. Reverse may consume all retained entries but cannot cross the `history-capacity` floor. The UI reports that earlier history is unavailable.

## Hard Barriers

These operations start a new `historyEpoch` or establish an equivalent floor:

- GR, PR, SP, FR, or Memory debugger mutation
- runtime program-word override
- Reset, Reload, or Full Clear
- new assembly, source replacement, or program/backend replacement
- input submission or queue consumption
- output side effects and SVC commit
- Console side-effect mutation when it becomes a Core operation
- history-capacity truncation

Locale, number format, panel selection, view-mode selection, and Stop without an external side effect are not barriers.

## Errors

A deterministic runtime failure caused while beginning a machine instruction can be a reversible zero-memory-delta transaction. Reverse clears that error and restores the pre-error runtime state without crossing the earlier program-mutation barrier.

Backend initialization, file, network, Tauri-native, SVC, and I/O failures are not reversible runtime transactions.

History is not persisted, serialized into a document, or sent over the network.
