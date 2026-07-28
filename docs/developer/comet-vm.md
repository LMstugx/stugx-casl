# COMET II VM

- Audience: Runtime and visualization maintainers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Application States](../reference/application-states.md), [Circuit Visualization](circuit-visualization.md)

The COMET II VM executes assembled 16-bit machine words and exposes GR0-GR7, PR, SP, FR, IR, MAR, MDR, memory, Trace, and source mapping to the UI.

Public FR state contains exactly `OF`, `SF`, and `ZF`. Shift instructions put
the final shifted-out bit in `OF`. `ADDL` carry and `SUBL` borrow may exist only
as function-local implementation intermediates used to compute `OF`; they are
not VM state and never cross the DTO or WASM boundary.

`Step` in instruction mode completes one machine instruction through the same real phase engine used by COMET Mode. COMET Mode advances one Fetch/Decode/EA/Read/Execute/Write-back/Flag/Complete phase at a time as applicable. `Run` repeats the selected granularity within an explicit safety limit and can be stopped. See [COMET Microcycle Runtime](comet-microcycle-runtime.md).

The staged model is named **stugx.CASL Teaching Microarchitecture v1**. It explains specified instruction behavior and is not a claim about a unique physical COMET II implementation.

`PUSH` stores the effective-address value after decrementing SP. `POP` reads from `Memory[SP]` and then increments SP. `CALL` pushes the return address and jumps. `RET` uses the stack when a call frame exists and otherwise preserves the top-level finish behavior.

VM faults are structured runtime diagnostics. They do not mutate source or persistence stores.

`SVC` services used by expanded `IN` / `OUT` are nonblocking. Input without a queued record enters `WaitingInput` without advancing `PR`. Input and output are bounded to 256 characters; output history is bounded to 256 records. Reset and Reload clear Console and pending input.

Reload uses the current assembly owner. Optional zero or `FFFF` initialization changes only `DS` source-map spans after restoring the assembled image; code, `DC`, literals, source, and Dirty state are unchanged.

Debugger mutation is an explicit runtime API for GR, PR, SP, the exact
three-field FR object, and one Memory word. It clears transient instruction
state but does not execute, increment the step count, recompute FR after a GR
edit, or alter source. Runtime instruction fetch decodes the current program
word at an original instruction start address, so a confirmed program override
executes honestly. Invalid runtime opcodes use the existing VM failure path.

Reset reapplies controller-owned Memory overrides. Reload removes them. Full Clear unloads the VM, clears runtime data and ownership, and requires a new Assemble. See the [Debugger Mutation Contract](../debugger-mutation-contract.md).

Changes to opcode semantics, flags, stack behavior, Trace ordering, or machine-state DTOs require dedicated compatibility work and are outside documentation-only changes.
