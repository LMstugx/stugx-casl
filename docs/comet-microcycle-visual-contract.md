# COMET Microcycle Visual Contract

This historical contract froze the Phase 20A design input. Phase 20C implements it as [the canonical runtime contract](comet-microcycle-runtime-contract.md). The matrix remains a verification input and is not loaded by production runtime code.

The machine-readable companion is [comet-instruction-cycle-matrix-v1.json](comet-instruction-cycle-matrix-v1.json). Every official machine instruction has instruction-specific phases, visible registers, memory access, `FR`, `PR`, stack, source mapping, active-node, and forbidden-fake-node fields.

The common vocabulary is Fetch, Decode, Effective-address generation, Operand read, Execute, Write-back, Flag update, and Complete. An instruction uses only applicable phases:

- register-register forms have no operand effective-address or data-memory read
- `LAD`, shifts, and branches use an effective address as a value and do not read operand memory
- stack, `CALL`, and active-frame `RET` use real stack memory
- macros expand before any machine cycle
- `SVC` uses the documented teaching OS boundary

The runtime UI states:

> This is the stugx.CASL teaching microarchitecture for explaining the specified COMET II behavior.

It does not claim to be the only physical COMET II implementation. Instruction mode completes the same real phases internally; COMET Mode exposes one phase per Step.

The clean-wire contract remains active-flow-only, with no arrows, circular markers, inactive ghost wires, invented 64-bit bus, or FPU.
