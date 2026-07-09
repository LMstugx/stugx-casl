# Phase 8I: Circuit Focus UI Semantics and Lab Feel

Phase 8I does not change CASL execution, the C++ subset transpiler, the VM, or the WASM bridge. It only tightens how Circuit Focus Mode explains the existing runtime state.

## Current vs Next Rule

Circuit Focus Mode now treats the last executed instruction as the main teaching object.

- Program panel: primary highlight is the last executed CASL line.
- Current Instruction: shows the same instruction and address.
- Current Source Mapping: shows the same CASL address and instruction.
- Source Context: shows the same source line.
- Trace: the newest trace row should match that instruction.
- PR: shown as the next address only.
- Next Instruction: shown only as a secondary hint.

Example after stepping `LD GR2,A`:

- Current: `LD GR2,A` at `0020`
- Next PR: `0022`
- Next Instruction: `ADDA GR2,B`

## Machine State vs Pipeline Stage

The UI separates two concepts that were easy to confuse:

- Machine State: `Ready`, `Running`, `Stopped`, `Finished`, `Error`
- Pipeline Stage: `Fetch`, `Decode`, `Operand Read`, `Execute`, `Write Back`, `Next`

Circuit Focus Mode labels machine state explicitly as `Machine: Ready`. The Current Instruction card and Step Timeline show the pipeline stage.

## Instruction Participation Rules

The active circuit path should show only the modules that participate in the current instruction.

- `LD`: MAR, Memory row, MDR, target GR row. ALU is not active.
- `ST`: source GR row, MDR, target Memory row. ALU is not active.
- arithmetic and logic: GR row, Memory row, MDR, ALU, target GR row, FR.
- `CPA` / `CPL`: GR row, Memory row, MDR, ALU compare, FR. No GR writeback path.
- `LAD`: address/immediate to GR. No fake memory read.
- jumps: control path to PR. No fake ALU/data path.
- `RET`: control/end state only.
- `NOP`: sequential execution only.

## Bus Visual Rules

The circuit keeps row-level anchors from Phase 8E and adds clearer bus labeling:

- `DATA BUS`
- `ADDR BUS`
- `CTRL`

Active path arrows are directional but intentionally small. They should clarify flow without becoming decorative arrows.

## Display and Output Naming

Circuit Focus Mode distinguishes these surfaces:

- `OUT Display`: program output device. It shows `No output` while the supported subset has no OUT instruction.
- `Display Device`: the circuit module representation of the same output device.
- `Output Log`: the bottom dock summary log.

The display surfaces never show PR as fake output.

## Remaining Limitations

- The circuit is still a teaching schematic, not a transistor-level or bus-cycle-accurate hardware diagram.
- Trace before/after values are shown only when the runtime event already provides them.
- The active path still uses simplified instruction-level flow, not every micro-operation.

## Next Visual Direction

Future visual work can continue toward a stronger lab-instrument style:

- stronger schematic styling for buses and junctions
- optional schematic/lab display mode
- configurable circuit display density
- more detailed micro-step visualization if the VM later exposes it
