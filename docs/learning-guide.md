# stugx.CASL Learning Guide

## 1. What This Tool Is

stugx.CASL is a CASL II / COMET II learning studio. It helps you study how several layers connect:

```text
C++ subset
-> CASL II assembly
-> COMET II machine code
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

Learn:

- `LD`, `ADDA`, `ST`, `RET`
- how GR registers change
- how a memory write appears in the Memory Viewer
- how PR advances through instruction words

Suggested actions:

1. Click `Assemble`.
2. Step through `LD`, `ADDA`, and `ST`.
3. Open `Machine Code` and compare addresses with the Source Map.
4. Open `Memory` and confirm label `C` is written.

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

## 3. How To Read Generated CASL

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

## 4. How To Read Machine Code

Machine Code shows the COMET II memory words produced by assembly.

Common row roles:

- instruction word: opcode and register fields
- operand word: address used by the instruction
- data word: value created by `DC`
- reserved word: space created by `DS`

Click a row to see:

- opcode
- register field
- index field
- operand address
- resolved label
- binary text
- human-readable meaning

This is useful for connecting CASL source to actual COMET II words.

## 5. How To Use Memory Viewer

The circuit view includes a small memory window for execution context. The Inspector `Memory` tab is the detailed viewer.

Use it to:

- choose a start address
- select 32, 64, 128, or 256 rows
- jump to Program, PR, MAR, last read, or last write
- inspect labels such as `A`, `B`, `C`, `SUM`, `I`, and generated constants
- see read/write highlighting after Step or Run

The viewer does not render all 65536 memory words at once.

## 6. How To Use Trace

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

## 7. How To Use Control Flow Badges

Control Flow hints appear in Generated CASL, Machine Code, Learning Flow, and Trace.

They help answer:

- Which label does this jump target?
- Is this jump a branch, loop-back, break, or continue?
- Which machine address is the target?
- Which C++ line produced this jump?

For `break` / `continue`, pay attention to:

- `continue -> FOR_CONTINUE_0`
- `break -> FOR_END_0`

## 8. Current Limitations

- C++ support is a learning subset, not a complete compiler.
- CASL II support is a teaching subset, not the full instruction set.
- Index addressing is not fully implemented.
- Arrays, pointers, functions, classes, templates, strings, and floating-point types are not supported.
- Complex boolean expressions such as `&&`, `||`, and `!` are not supported.
- Control Flow is currently text and badge based, not a graph layout.

## 9. Suggested Next Study Topics

- Compare CASL source rows with machine-code instruction and operand words.
- Step through `CPA` and observe FR changes.
- Run a loop and inspect how PR moves between labels.
- Modify demo constants and reassemble to see how data words change.
- Try the same program in Mock and WASM backend and compare behavior.

## Japanese Summary

stugx.CASL は、CASL II / COMET II を学ぶためのツールです。C++ subset、Generated CASL II Assembly、COMET II Machine Code、Opcode explanation、Memory、Trace、Control Flow、Circuit を一つの流れとして観察できます。

おすすめの学習順序は、CASL 直接実行、C++ から CASL、if / else、while、for、break / continue です。完全な C++ compiler ではなく、CASL II / COMET II の理解を助けるための学習用 subset です。
