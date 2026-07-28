# COMET Microcycle Visual Contract

This historical contract freezes Phase 20B inputs. It is not a production feature and is not a runtime source of truth.

The machine-readable companion is [comet-instruction-cycle-matrix-v1.json](comet-instruction-cycle-matrix-v1.json). Every official machine instruction has instruction-specific phases, visible registers, memory access, `FR`, `PR`, stack, source mapping, active-node, and forbidden-fake-node fields.

The common vocabulary is Fetch, Decode, Effective-address generation, Operand read, Execute, Write-back, Flag update, and Complete. An instruction uses only applicable phases:

- register-register forms have no operand effective-address or data-memory read
- `LAD`, shifts, and branches use an effective address as a value and do not read operand memory
- stack, `CALL`, and active-frame `RET` use real stack memory
- macros expand before any machine cycle
- `SVC` uses the documented teaching OS boundary

Any future UI must state:

> This is the stugx.CASL teaching microarchitecture for explaining the specified COMET II behavior.

It must not claim to be the only physical COMET II implementation. Phase 20A exposes instruction-level Step only and contains no hidden or fake microcycle state.

The clean-wire contract remains active-flow-only, with no arrows, circular markers, inactive ghost wires, invented 64-bit bus, or FPU.
