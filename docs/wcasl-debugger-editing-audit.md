# WCASL Debugger Editing Audit

- Audience: Compatibility reviewers and debugger maintainers
- Status: Historical audit
- Last reviewed version: 0.1.0
- Classification: Historical
- Related: [Phase 20A Parity Audit](phase20a-wcasl-parity-audit.md), [Debugger Mutation Contract](debugger-mutation-contract.md)

This audit compares public WCASL-II workflow evidence with the frozen IPA CASL II / COMET II semantics and the existing stugx.CASL state model. The IPA specification remains authoritative for instruction behavior. WCASL material is used only for debugger workflow comparison; no WCASL asset, source, or copied UI is included.

## Decisions

| Capability | Decision | Evidence | stugx.CASL behavior |
| --- | --- | --- | --- |
| `GR0`-`GR7` edit | compatible safe behavior | Public WCASL debugger workflow and local VM state model | Atomic 16-bit edit through the controller; no instruction, FR update, source edit, or persistence write |
| `PR` edit | compatible safe behavior | Debugger workflow and instruction mapping | Atomic 16-bit edit; mapped source is shown when available and otherwise remains explicitly unmapped |
| `SP` edit | compatible safe behavior | Debugger workflow and stack model | Any 16-bit value is accepted; Stack Preview updates without inventing a frame |
| `FR` edit | compatible safe behavior | Current COMET state schema | Only existing `OF`, `ZF`, `CF`, and `SF` bits are editable; soft-float status is excluded |
| `MAR` / `MDR` | intentionally-different | Current microcycle boundary | Read-only because they are exposed observation state, not stable debugger mutation targets |
| Memory edit | compatible safe behavior | Public debugger workflow | Exactly one 16-bit word per transaction at any address |
| Program-image edit | compatible safe behavior | Traditional debugger capability | Allowed only after a warning and explicit confirmation; source and assembled output remain unchanged |
| Reset after edit | compatible safe behavior | Current loaded-image contract | Resets execution state, then reapplies active runtime word overrides |
| Reload after edit | compatible safe behavior | Phase 20A Reload contract | Restores the current assembly image and discards all overrides |
| Full Clear | intentionally-different | Exact WCASL Clear evidence is incomplete | Unloads machine state while preserving source, filename, source Dirty, locale, preferences, startup selection, and lesson progress |

## Evidence Boundary

No reliable public evidence was found that justifies claiming exact parity for the complete WCASL Clear lifecycle or its handling of modern document Dirty state. stugx.CASL therefore uses an explicit safe behavior and records it as `intentionally-different`.

Manual edits never change CASL II instruction semantics. A modified program word is decoded and executed as the actual 16-bit runtime word. An invalid runtime opcode fails during VM execution and does not create an assembler diagnostic.

## Result

Register editing and memory editing are `compatible`. Full Clear is `intentionally-different`. P0/P1 compatibility remains complete. Reverse Step, COMET microcycle runtime, multi-program linking, and undocumented WCASL project import remain outside Phase 20B.
