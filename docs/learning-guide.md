# stugx.CASL Learning Guide

## 1. What This Tool Is

stugx.CASL is a CASL II / COMET II learning studio. It helps you study how several layers connect:

```text
C++ subset
-> CASL II assembly
-> COMET II Machine Code
-> runtime memory and registers
-> trace, control flow, and circuit state
```

You can use it in two ways:

- Write CASL II directly and execute it.
- Write a small C++ subset and inspect the generated CASL II before execution.

The purpose is not to replace a full compiler. The purpose is to make each translation and execution step visible.

## 2. Recommended Learning Order

### Step 1: CASL Direct Execution

Example: `CASL: GR2 Addition`

Follow-up examples: `CASL: Logic Operations`, `CASL: Logical Add Compare`, `CASL: Shift Operations`, `CASL: Index Addressing`, `CASL: Push Pop Stack`, `CASL: Call Return`, `CASL: Nested Call Return`

Learn:

- `LD`, `ADDA`, `ST`, `RET`
- `AND`, `OR`, `XOR` for bitwise ALU operations
- `ADDL`, `CPL`, `JOV` for unsigned arithmetic, unsigned compare, and overflow-flag jump
- `SLL`, `SRL`, `SLA`, `SRA` for shift operations
- `adr,x` for base plus index-register effective addressing
- `PUSH` and `POP` for the first stack-memory convention
- `CALL` and stack-aware `RET` for subroutine return-address flow
- nested `CALL` / `RET` return order through `callDepth`
- how GR registers change
- how shift instructions update GR and FR without reading memory as shift data
- how indexed instructions keep a base operand word but access the effective memory row
- how `PUSH` stores an effective address value on the stack, and how `POP` reads `Memory[SP]`
- how `CALL` stores a return address on the stack, and how `RET` either returns from a call frame or finishes a top-level program
- how the Call Stack card explains `CALL` target, return address, stack `RET`, and top-level `RET`
- how a memory write appears in the Memory Viewer
- how PR advances through instruction words

Suggested actions:

1. Click `Assemble`.
2. Step through `LD`, `ADDA`, and `ST`.
3. Open `Machine Code` and compare addresses with the Source Map.
4. Open `Memory` and confirm label `C` is written.
5. Load `CASL: Logic Operations` and inspect the `AND` / `OR` / `XOR` opcodes.
6. Load `CASL: Logical Add Compare` and observe how `JOV` falls through when OF is not set.
7. Load `CASL: Shift Operations` and confirm the shift count operand is not shown as a memory data read.
8. Load `CASL: Index Addressing` and compare the base address `A` with the effective address `B`.
9. Load `CASL: Push Pop Stack` and watch `SP`, Stack Preview, and `Memory[SP]` during `PUSH` / `POP`.
10. Load `CASL: Call Return` and compare the stack return address with the final top-level `RET`.
11. Load `CASL: Nested Call Return` and watch `callDepth` rise to 2, then return in last-in-first-out order.

### Step 2: C++ to CASL

Example: `C++: Addition`

Learn:

- C++ assignment becomes `LD`, `ADDA`, and `ST`
- `return c;` loads the return value into `GR0`
- Generated CASL II Assembly is the bridge from C++ subset to COMET II execution
- Machine Code rows show the instruction word and operand word

Suggested actions:

1. Click `Assemble`.
2. Open `Generated CASL`.
3. Open `Machine Code`.
4. Click the `1010` instruction word and read the opcode explanation.
5. Step through the program and watch C++ and CASL highlighting.

Function-call follow-up: `C++: Function Call`

Learn:

- a no-argument `int` function becomes a generated `FUNC_*` CASL label
- `x = addOne();` lowers into `CALL FUNC_ADDONE` followed by `ST GR0,MAIN_X`
- `GR0` is the return-value register for the MVP
- the callee `RET` uses the stack return path, while the final `RET` in `main` still finishes the program

Suggested actions:

1. Assemble `C++: Function Call`.
2. Open `Generated CASL` and find `FUNC_ADDONE`.
3. Open `Machine Code` and click `CALL FUNC_ADDONE`.
4. Open `Trace` or Circuit Focus Mode and compare the call stack return with the final top-level `RET`.

Calling convention design note:

- Current C++ calls use `GR0` as the return-value register.
- Current parameter support uses `GR1`, `GR2`, and `GR3` for the first three integer arguments.
- Stack arguments and stack-frame locals are design topics only; they are not implemented in the current C++ subset.
- Read [phase10b-calling-convention-design.md](phase10b-calling-convention-design.md) before trying to design parameter or recursion lessons.
- Read [phase11a-stack-frame-locals-design.md](phase11a-stack-frame-locals-design.md) for the future advanced-mode stack-frame plan. It is design-only and does not change the current static namespaced labels.
- Read [phase11b-stack-frame-lowering-scaffold.md](phase11b-stack-frame-lowering-scaffold.md) for future `StackFramePlan` / `FrameSlot` metadata and prologue / epilogue design constraints.
- In Register / Stack observation mode, the Stack Frame View is a placeholder only. It explains simple static locals and future frame slots; it does not mean current C++ locals are on the stack. See [phase11c-stack-frame-view-placeholder.md](phase11c-stack-frame-view-placeholder.md).
- Read [phase11d-frameplan-generator-scaffold.md](phase11d-frameplan-generator-scaffold.md) for the design-test `buildFramePlans` metadata scaffold. It records future frame slots but emitted CASL is still unchanged.

Single-argument follow-up: `C++: Function Argument`

Learn:

- `GR1` is the first argument register.
- `GR0` remains the return-value register.
- `y = addOne(5);` lowers into `LAD GR1,5`, `CALL FUNC_ADDONE`, and `ST GR0,MAIN_Y`.
- The callee saves `GR1` into `FUNC_ADDONE_X` before reading parameter `x`.
- `FUNC_ADDONE_X` is a static parameter label, not a stack-frame local.

Suggested actions:

1. Assemble `C++: Function Argument`.
2. Open `Generated CASL` and find `LAD GR1,5` before `CALL FUNC_ADDONE`.
3. Find `FUNC_ADDONE ST GR1,FUNC_ADDONE_X`.
4. Run and confirm `GR0 = 0006`.

Multi-register argument follow-up: `C++: Function Arguments`

Learn:

- `GR1`, `GR2`, and `GR3` are the first three argument registers.
- `GR0` remains the return-value register.
- `result = add(2, 3);` lowers into `LAD GR1,2`, `LAD GR2,3`, `CALL FUNC_ADD`, and `ST GR0,MAIN_RESULT`.
- The callee saves `GR1` and `GR2` into `FUNC_ADD_A` and `FUNC_ADD_B` before reading parameters.
- These parameter labels are still static generated labels, not stack-frame locals.
- Future stack-frame locals are documented as an advanced design path, not current behavior.
- The stack-frame lowering scaffold is a future implementation guide only; this demo should still emit static labels.

Suggested actions:

1. Assemble `C++: Function Arguments`.
2. Open `Generated CASL` and find `LAD GR1,2` and `LAD GR2,3` before `CALL FUNC_ADD`.
3. Find `FUNC_ADD ST GR1,FUNC_ADD_A` and `ST GR2,FUNC_ADD_B`.
4. Run and confirm `GR0 = 0005`.

### Step 3: if / else

Example: `C++: If Else`

Learn:

- `CPA` compares a register with memory
- `JZE` is used when the comparison result is zero
- generated labels represent branch destinations
- the Control Flow hints show target label and target address

Suggested actions:

1. Assemble the example.
2. In `Generated CASL`, find `CPA`, `JZE`, and `JUMP`.
3. In `Machine Code`, click the jump instruction and read the target explanation.
4. Step until the branch target is reached.

### Step 4: while loop

Example: `C++: While Sum`

Learn:

- a loop has a condition block, body block, and loop-back jump
- Trace shows repeated execution
- Memory Viewer shows variable updates
- Run is protected by `maxSteps`

Suggested actions:

1. Assemble the example.
2. Find the loop labels in `Generated CASL`.
3. Open `Trace` and `Memory`.
4. Click `Run`.
5. Confirm `SUM = 0006` and `GR0 = 0006`.

### Step 5: for loop

Example: `C++: For Sum Sugar`

Learn:

- for-loop initializer, condition, body, increment, and loop end
- `i++` lowers into load, add, and store instructions
- `sum += i` lowers into the same arithmetic pattern
- Machine Code is still ordinary COMET II words

Suggested actions:

1. Assemble the example.
2. Find `FOR_BEGIN`, `FOR_BODY`, `FOR_CONTINUE`, and `FOR_END`.
3. Open `Machine Code`.
4. Run the program and confirm `GR0 = 0006`.

### Step 6: break / continue

Example: `C++: Break Continue`

Learn:

- `continue` jumps to the for-loop increment block
- `break` jumps to the loop end
- both become ordinary CASL `JUMP` instructions
- Trace and Machine Code explain the jump target

Suggested actions:

1. Assemble the example.
2. Open `Generated CASL`.
3. Find `JUMP FOR_CONTINUE_0` and `JUMP FOR_END_0`.
4. Open `Machine Code` and click the jump rows.
5. Run the program.
6. Open `Trace` and confirm the continue and break jumps are visible.

## 3. How To Use Guided Lesson

Each built-in example has a `Guided Lesson` section in the left-side Demo Guide.

Use it as a study checklist:

1. Read the lesson level and concepts before assembling.
2. Click `Assemble`.
3. Follow the suggested steps in order.
4. Open the recommended tab for each step.
5. Use the checkpoints to confirm what changed.
6. If you edit the source manually, the guided lesson is hidden and the panel shows `No guided lesson for custom source.`

The checkpoints are not automatic grading. They are prompts for manual observation, such as:

- `GR2 should be 0003 after LD.`
- `Generated CASL should contain LD / ADDA / ST.`
- `continue should jump to FOR_CONTINUE.`

## 4. How To Use Study Mode

Study Mode turns the suggested steps into a manual checklist for the current example.

Use it this way:

1. Open `Guided Lesson`.
2. Follow the suggested steps from top to bottom.
3. Check a step when you have done it.
4. Read the `Recommended tab` hint beside the step.
5. Compare your observation with the checkpoints.

The checklist is manual, not automatic grading. It does not inspect your answer or decide whether the program is correct. It only helps you keep your place during one study session.

Progress is stored only while the app is open. Switching examples keeps separate progress for each built-in example during the session. Editing custom source hides the lesson and shows `No guided lesson for custom source.`

To start over, click `Reset lesson progress` in the Guided Lesson section.

## 5. How To Use Recommended Tab Hints

Each suggested step can point to the most useful tab:

These recommended tab hints are there to reduce guessing during study.

- `Generated CASL`: read the assembly produced from C++ subset.
- `Machine Code`: inspect instruction words, operand words, and opcode explanation.
- `Trace`: follow repeated execution and jumps.
- `Memory`: inspect variables, labels, and writes.
- `Output`: read summary messages such as assemble and run results.

The hint is intentionally simple. It tells you where to look next; it does not switch tabs automatically.

## 6. How To Use Checkpoints

Treat checkpoints as questions to answer while stepping or running:

- Where should I look?
- What value or label should appear?
- What instruction caused the change?
- Does the machine-code explanation match the CASL row?

The checkbox in the UI is only local and temporary. It is meant to help you follow a lesson during one study session.

## 7. Example-Specific Study Order

Use the examples in this order:

1. `CASL: GR2 Addition`: learn direct CASL execution.
2. `CASL: Logic Operations`: learn bitwise ALU operations and memory write.
3. `CASL: Logical Add Compare`: learn unsigned ADDL / CPL and JOV fallthrough.
4. `CASL: Shift Operations`: learn logical and arithmetic shifts, shift counts, and FR / OF updates.
5. `CASL: Index Addressing`: learn x-field encoding, index registers, and effective address calculation.
6. `CASL: Push Pop Stack`: learn `SP`, Stack Preview, stack memory writes, and `POP` register updates.
7. `CASL: Call Return`: learn `CALL`, return-address stack writes, stack-aware `RET`, and top-level `RET` finish compatibility.
8. `CASL: Nested Call Return`: learn nested `CALL`, LIFO return order, and call-depth changes.
9. `C++: Addition`: learn C++ to CASL and machine-code rows.
10. `C++: If Else`: learn compare, flags, conditional jump, and target labels.
11. `C++: While Sum`: learn repeated execution with Trace.
12. `C++: For Sum`: learn initializer, condition, increment, and loop exit.
13. `C++: For Sum Sugar`: learn `i++` and `+=` lowering.
14. `C++: Break Continue`: learn jump targets for loop control.

## 8. How To Verify Your Understanding

After each lesson, try one small change:

- Change a constant and predict the new register value.
- Change a target register and confirm the UI follows that register.
- Change an if condition and predict the jump target.
- Change a loop end value and predict the final sum.
- Compare a Generated CASL row with its Machine Code row.
- Click the machine-code word and explain the opcode/operand fields in your own words.

For structured exercises, see [practice-tasks.md](practice-tasks.md).

## 9. How To Read Generated CASL

Generated CASL is the CASL II source produced from C++ subset input.

Useful columns:

- Line: generated CASL line number
- Label: generated or user-visible label
- Opcode: CASL operation
- Operand: register, label, or address operand
- Mapping: why the row was generated, such as assignment, return, for-condition, break, or continue
- C++: related C++ source line when available
- Flow: jump target and control-flow role

If the source mode is CASL, this tab still shows CASL rows, but it is not generated from C++.

## 10. How To Read Machine Code

Machine Code shows the COMET II memory words produced by assembly.

Common row roles:

- instruction word: opcode and register fields
- operand word: address used by the instruction
- data word: value created by `DC`
- reserved word: space created by `DS`

With `adr,x`, the operand word still stores the base address. The instruction word carries the x field, and runtime calculates `effective address = base + GRx`.

Click a row to see:

- opcode
- register field
- index field
- operand address
- effective address when an index register is used
- resolved label
- binary text
- human-readable meaning

This is useful for connecting CASL source to actual COMET II words.

## 11. How To Use Memory Viewer

The circuit view includes a small memory window for execution context. The Inspector `Memory` tab is the detailed viewer.

Use it to:

- choose a start address
- select 32, 64, 128, or 256 rows
- jump to Program, PR, MAR, last read, or last write
- inspect labels such as `A`, `B`, `C`, `SUM`, `I`, and generated constants
- see read/write highlighting after Step or Run

The viewer does not render all 65536 memory words at once.

## 12. How To Read Circuit Focus Mode

Circuit Focus Mode is the dedicated hardware view opened from the toolbar. It keeps the normal IDE available, but reorganizes the same runtime state for teaching:

- left: Program, OUT Display, Current Instruction
- center/right: selected Observation Mode panels

Use the Observation Mode selector to choose the learning focus:

- `CPU Flow`: large COMET II circuit, active path, compact main-memory window, Signal Probe, recent Trace, and Step Timeline. Use this for `LD`, `ADDA`, `ST`, indexed memory access, and active circuit movement.
- `Registers / Stack`: all GR0-GR7 rows, PR / SP / FR, Stack Preview, Call Stack, main-memory rows, Signal Probe, and recent Trace. Use this when you want to observe register, stack, and memory values numerically.
- `Code / Machine`: Source / Generated CASL, Machine Code meaning rows, Trace, and Current Source Mapping. Use this for C++ examples and for explaining how source code becomes CASL and machine words.

The circuit itself is read by layers:

- Top control/address layer: `IR`, `PR`, `+2`, `SP`, and `MAR`.
- Middle execution/data layer: General Registers, `ALU`, `MDR`, and Memory.
- Bottom flag layer: `FR`.

The active data path targets specific rows where possible. For example, `LD GR2,A` highlights the Memory row for `A`, routes it through `MDR`, and lands on the `GR2` row. Arithmetic and compare instructions route the selected GR row and `MDR` into the ALU, then update either the GR row and `FR` or only `FR`.

`SP` is visible as an independent register. Ordinary arithmetic, memory, shift, and jump instructions do not use it. `PUSH` and `POP` activate the stack data path: `PUSH` decrements `SP` and writes an effective address value to `Memory[SP]`; `POP` reads `Memory[SP]` into a register and increments `SP`.

`CALL` also activates the stack path. It writes the return address to `Memory[SP]`, then redirects `PR` to the subroutine target. `RET` is stack-aware only when a call frame exists: it reads the return address from the stack and returns to the caller. A top-level `RET` with no call frame still finishes the program, so existing examples keep their original ending behavior.

The Stack Preview card is read-only but now reflects real `PUSH` / `POP` / `CALL` / stack-`RET` execution. It shows the current `SP` value, nearby stack memory, written return-address rows, and read return-address rows.

The Call Stack card is also read-only. It shows `callDepth`, the top return address, the stack row that stores it, the current or target routine label, and whether the current `RET` explanation is a stack return or top-level finish. It does not show arguments, locals, or a full call-frame model.

Circuit Focus Mode uses a deliberate current/next split. The main teaching target is the last executed instruction: Program, Current Instruction, Current Source Mapping, Source Context, and the latest Trace row should all point to that same instruction. `PR` is the next address and is shown only as a secondary hint together with the next instruction.

Machine state and pipeline stage are also separate. `Machine: Ready` describes the VM state, while the Current Instruction card and Step Timeline show the teaching stage such as `Operand Read`, `Execute`, or `Write Back`.

The schematic separates `DATA BUS`, `ADDR BUS`, and `CTRL` lanes. `LD` and `ST` use a data-bypass lane between Memory, `MDR`, and the selected GR row without activating the ALU. Arithmetic, logic, compare, and shift instructions are the paths that enter the ALU / Shifter lane.

Shift instructions use the ALU/Shifter path. The operand word is a shift count / effective address value, so Circuit Focus Mode routes the count into the ALU/Shifter input and does not show `Memory[addr] -> MDR` as shift data.

Indexed instructions show an `IDX` badge on the index register row and an Effective Address Unit in the address layer. The EAU displays the compact calculation, such as `BASE 0027 + GR2(0001)` and `EA 0028`. The Memory row highlight follows the effective address. For example, `LD GR1,A,GR2` with `GR2 = 0001` keeps `A` as the base operand word, but the active Memory row is `B`.

Active wires have a lightweight signal-flow animation in the live app. The animation is only a direction cue for the current active path; it does not represent extra VM micro-cycles, and it is disabled when the operating system asks for reduced motion.

Small signal indicators such as `READ`, `WRITE`, `EXEC`, and `FLAG` are visual hints derived from the current instruction and VM state. They are not separate simulator state.

Focus Mode is layered intentionally. Current Instruction and the active path are the primary teaching objects in CPU Flow. Register / Stack makes GR, SP, stack, and memory values primary. Code / Machine makes Generated CASL, Machine Code, Trace, and mapping primary. Bus labels, inactive wires, older trace rows, Source Context, and Output Log remain tertiary context.

The compact Signal Probe card is read-only. It shows current or recent values for the selected GR row, `MDR`, `ALU.Y` when involved, `FR`, target memory, and recent trace changes. It is a study aid, not an automatic grader or custom circuit editor.

When stack activity is relevant, Signal Probe also shows `SP` before/after, the stack memory row, and the stack value. For non-stack instructions it stays compact and does not show fake stack activity.

Signal Probe, Call Stack, and Trace use compact rows by default. Read the primary value first, then use the secondary note or details row when a CALL, RET, index-addressing, or stack instruction needs more context.

At small desktop viewports such as `1280x720`, Focus Mode keeps the same three-column teaching layout but tightens spacing. If a label or instruction is shortened with ellipsis, hover it to read the native `title` text. Signal Probe and Call Stack details use keyboard-focusable summaries, so they can be opened without a mouse.

Display naming is intentionally narrow:

- `OUT Display`: the output device panel. It shows `No output` until an OUT-like instruction exists.
- `Display Device`: the same concept inside the circuit schematic.
- `Output Log`: the bottom dock for assemble/run summaries.

## 13. How To Use Trace

Trace records recent execution steps.

Each entry shows:

- step count
- PR
- instruction text
- visual path kind
- changed register
- changed memory
- run state
- jump target information when the instruction affects control flow

Use Trace for loops. It is easier to understand repeated execution from Trace than from Output, because Output is intentionally a summary log.

## 14. How To Use Control Flow Badges

Control Flow hints appear in Generated CASL, Machine Code, Learning Flow, and Trace.

They help answer:

- Which label does this jump target?
- Is this jump a branch, loop-back, break, or continue?
- Which machine address is the target?
- Which C++ line produced this jump?

For `break` / `continue`, pay attention to:

- `continue -> FOR_CONTINUE_0`
- `break -> FOR_END_0`

## 15. Current Limitations

- C++ support is a learning subset, not a complete compiler.
- CASL II support is a teaching subset, not the full instruction set.
- Index addressing is supported for CASL address operands, but C++ subset code does not generate indexed operands yet.
- No-argument and up to three-argument `int` functions are supported, but stack arguments, recursion, overloads, stack-frame locals, and calls inside larger expressions are not supported.
- Phase 10D implements `GR1` / `GR2` / `GR3` register argument paths. Stack arguments and real stack-frame locals remain future design work.
- Arrays, pointers, references, classes, templates, strings, and floating-point types are not supported.
- Complex boolean expressions such as `&&`, `||`, and `!` are not supported.
- Control Flow is currently text and badge based, not a graph layout.

## 16. Suggested Next Study Topics

- Compare CASL source rows with machine-code instruction and operand words.
- Step through `CPA` and observe FR changes.
- Run a loop and inspect how PR moves between labels.
- Modify demo constants and reassemble to see how data words change.
- Try the same program in Mock and WASM backend and compare behavior.

## Japanese Summary

stugx.CASL 銇€丆ASL II / COMET II 銈掑銇躲仧銈併伄銉勩兗銉仹銇欍€侰++ subset銆丟enerated CASL II Assembly銆丆OMET II Machine Code銆丱pcode explanation銆丮emory銆乀race銆丆ontrol Flow銆丆ircuit 銈掍竴銇ゃ伄娴併倢銇ㄣ仐銇﹁Τ瀵熴仹銇嶃伨銇欍€?
銇娿仚銇欍倎銇缈掗爢搴忋伅銆丆ASL 鐩存帴瀹熻銆丆++ 銇嬨倝 CASL銆乮f / else銆亀hile銆乫or銆乥reak / continue 銇с仚銆傚畬鍏ㄣ仾 C++ compiler 銇с伅銇亸銆丆ASL II / COMET II 銇悊瑙ｃ倰鍔┿亼銈嬨仧銈併伄瀛︾繏鐢?subset 銇с仚銆?

