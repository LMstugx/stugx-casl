# COMET II VM

- Audience: Runtime and visualization maintainers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Application States](../reference/application-states.md), [Circuit Visualization](circuit-visualization.md)

The COMET II VM executes assembled 16-bit machine words and exposes GR0-GR7, PR, SP, FR, IR, MAR, MDR, memory, Trace, and source mapping to the UI.

`Step` executes one instruction. `Run` repeats execution within an explicit safety limit and can be stopped. `Reset` restores the loaded program's runtime state. Source edits do not automatically reassemble or replace the VM.

`PUSH` stores the effective-address value after decrementing SP. `POP` reads from `Memory[SP]` and then increments SP. `CALL` pushes the return address and jumps. `RET` uses the stack when a call frame exists and otherwise preserves the top-level finish behavior.

VM faults are structured runtime diagnostics. They do not mutate source or persistence stores.

Changes to opcode semantics, flags, stack behavior, Trace ordering, or machine-state DTOs require dedicated compatibility work and are outside documentation-only changes.
