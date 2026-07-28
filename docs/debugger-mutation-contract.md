# Debugger Mutation Contract

- Audience: Runtime, store, WASM, and debugger UI maintainers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [History Barrier Contract](debugger-history-barrier-contract.md), [COMET II VM](developer/comet-vm.md)

Debugger editing is a runtime transaction. Components request a mutation through the application controller; they never write a VM object directly.

## Ownership DTO

Each request carries a stable mutation ID, `SourceUnitId`, assembly ID, execution epoch, and a discriminated mutation input. `GR0`-`GR7`, `PR`, `SP`, and one Memory address carry one 16-bit `nextWord`. FR carries the exact structured value `{ of, sf, zf }`. IDs never derive from locale text, labels, filenames, or numeric display mode.

The controller rechecks source ownership, assembly ownership, epoch, run state, file operation state, source Dirty, and the single active transaction lock immediately before dispatch. A stale request is ignored. Failures are atomic and never create partial state, a code diagnostic, source Dirty, or a success notice.

## Value Contract

All values resolve to `0x0000` through `0xFFFF`.

- hex accepts raw one-to-four-digit hex, `#` prefix, or `0x` prefix
- signed decimal accepts `-32768` through `32767` and encodes two's complement
- unsigned decimal accepts `0` through `65535`
- binary accepts one through 16 bits, optional `0b`, and optional spaces

There is no wrap, expression evaluation, label evaluation, locale punctuation, or decimal fraction. Form errors stay inline and do not enter the diagnostic registry.

## Register Rules

A GR edit changes only the selected register. It does not execute an instruction or recompute FR. A PR edit clears transient instruction state and permits later explicit Step or Run. An unmapped PR remains safe and does not fabricate a source line. An SP edit updates Stack Preview without changing memory or inventing a stack frame. Values below `#8000` remain valid but receive a non-blocking warning because they are outside the usual high-memory teaching stack area.

FR exposes exactly the three bits defined by COMET II:

| Bit | Flag |
| --- | --- |
| 2 | `OF` |
| 1 | `SF` |
| 0 | `ZF` |

The UI edits those flags atomically through the structured input and never
exposes a generic FR numeric field. Adapters reject missing, mistyped, or
additional flag properties. Packed bits are an internal bridge detail; any bit
outside the low three is rejected. COMET FR remains independent from software
floating-point status.

## Memory Rules

One transaction changes one address. All 65536 addresses and all 65536 word values are valid. Labels and categories are display metadata, not identity.

Program-image edits require explicit confirmation. The original assembled word remains in source-map and assembler output data; the current runtime word is stored separately as an override with `exact`, `runtime-word-modified`, or `unmapped` confidence. Runtime Step decodes the current memory word. Invalid opcodes use the existing VM runtime failure.

Data, `DC`, `DS`, literal, stack, and unassigned words use the same transaction. Symbol addresses and object identity do not change. Arbitrary double bit patterns are preserved and the Double Inspector reads current VM memory.

## Reset, Reload, And Full Clear

Reset restores normal execution state and reapplies runtime memory overrides in stable address order. Reload restores the current assembly-defined image and discards overrides. Full Clear discards the loaded image, all overrides, runtime state, console, input, Trace, and machine ownership while preserving the current document and user-owned non-machine state.

No debugger mutation or Full Clear writes a persistence key, file, source, Generated CASL, or network endpoint.

Finished and WaitingInput are explicit stopped states for this contract. A manual mutation transitions either state to Ready, clears transient instruction presentation, and does not execute or resume the program. Queued input remains owned by the loaded VM until Reload or Full Clear.

Every successful mutation establishes a new history epoch. Reverse Microstep cannot cross it, including a confirmed runtime program-word override. A deterministic invalid-word execution after that override may itself be reversed to Ready, but the edited word remains and the mutation boundary is still the history floor.
