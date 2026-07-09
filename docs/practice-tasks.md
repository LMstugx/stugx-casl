# Practice Tasks

These tasks are for studying stugx.CASL manually. They do not require automatic grading. Use the Source Editor, Generated CASL, Machine Code, Memory Viewer, Trace, and Registers to check your understanding.

Use Study Mode checkpoints to compare your observation with expected behavior while you work through the built-in examples.

## Level 1: CASL Basics

### Task 1. Change A / B constants

Start from `CASL: GR2 Addition`.

Change:

```text
A    DC    3
B    DC    4
```

to:

```text
A    DC    5
B    DC    6
```

Expected observation:

- After `LD`, GR2 should be `0005`.
- After `ADDA`, GR2 should be `000B`.
- After `ST`, Memory[C] should be `000B`.

### Task 2. Replace GR2 with GR1

Change `LD GR2,A`, `ADDA GR2,B`, and `ST GR2,C` to use `GR1`.

Expected observation:

- GR1 changes instead of GR2.
- Memory[C] still stores the final sum.

### Task 3. Add one more variable

Add:

```text
D    DC    2
```

Then add another `ADDA GR2,D` before `ST`.

Expected observation:

- The final result should include D.
- Machine Code should include another instruction word and operand word.

### Task 4. Inspect bitwise logic instructions

Start from `CASL: Logic Operations`.

Before running, predict the value after each operation:

- `#00F0 AND #0F0F`
- result `OR #0003`
- result `XOR #0001`

Expected observation:

- Machine Code should show `AND`, `OR`, and `XOR` opcodes.
- The final GR1 value should be `0002`.
- Memory[RESULT] should be `0002`.

### Task 5. Observe ADDL / CPL / JOV

Start from `CASL: Logical Add Compare`.

Expected observation:

- `ADDL GR1,B` changes GR1 from `0001` to `0003`.
- `CPL GR1,C` sets the zero flag because both values are `0003`.
- `JOV OVER` should fall through because OF is not set.
- Memory[RESULT] should be `0003`.

### Task 5A. Observe shift instructions

Start from `CASL: Shift Operations`.

Step through:

- `SLL GR1,1`
- `SRL GR1,1`
- `SLA GR1,1`
- `SRA GR1,1`

Expected observation:

- Machine Code should show shift opcodes `50`, `51`, `52`, and `53`.
- Circuit Focus Mode should route GR1 and the shift count into the ALU/Shifter path.
- The shift count operand should not appear as a Memory data read.
- FR may update from the shifted result and shifted-out bit.
- The final Memory[RESULT] should be `0003`.

### Task 5B. Observe index addressing

Start from `CASL: Index Addressing`.

Step through:

- `LAD GR2,1`
- `LD GR1,A,GR2`

Expected observation:

- Machine Code should show the `LD` instruction word with x = `GR2`.
- The operand word still points to `A`.
- The Effective Address Unit should show base `A` plus `GR2` resolving to `B`.
- Circuit Focus Mode should mark `GR2` as the index register and highlight the Memory row for `B`.
- `GR1` should become `0014`.
- After `ST`, Memory[RESULT] should become `0014`.

### Task 5C. Observe PUSH / POP stack behavior

Start from `CASL: Push Pop Stack` and open Circuit Focus Mode.

Expected observation:

- `SP` should be visible in the top address/control layer.
- `PUSH A,GR2` should decrement `SP`.
- Stack Preview should mark the new `SP` row as a write.
- The pushed value should be the effective address of `B`, not the value stored at `B`.
- `POP GR1` should read `Memory[SP]` into `GR1`, then increment `SP`.

Answer hint:

- In the built-in demo, `RESULT` should become the address of `B`.

### Task 5D. Observe CALL / stack-aware RET

Start from `CASL: Call Return` and open Circuit Focus Mode.

Expected observation:

- `CALL SUB` should write the return address to the stack.
- Stack Preview should mark the written return-address row.
- Control flow should jump to `SUB`.
- The `RET` inside `SUB` should read the return address from the stack and return to the caller.
- The final top-level `RET` should finish the program without stack activity.

Answer hint:

- `RESULT` should become `0006`.
- The Call Stack card should show `Depth 1` after `CALL SUB`.
- The stack `RET` should show `MEM[SP] -> PR`.
- The final top-level `RET` should show no stack access.

### Task 5E. Trace nested return order

Start from `CASL: Nested Call Return` and open Circuit Focus Mode.

Expected observation:

- The first `CALL` should increase `callDepth` to `1`.
- The second `CALL` should increase `callDepth` to `2`.
- The `RET` inside `SUB2` should return to the instruction after `CALL SUB2`.
- The `RET` inside `SUB1` should return to the instruction after `CALL SUB1`.
- The final top-level `RET` should finish the program.

Answer hint:

- Return order is last-in-first-out.
- `RESULT` should become `0004`.

## Level 2: C++ to CASL

### Task 6. Change addition to subtraction

Start from `C++: Addition`.

Change:

```cpp
c = a + b;
```

to:

```cpp
c = a - b;
```

Expected observation:

- Generated CASL should use `SUBA`.
- Final GR0 should be `FFF6` for `10 - 20` in 16-bit two's-complement form.

### Task 7. Predict generated CASL

Before clicking `Assemble`, predict the CASL shape for:

```cpp
c = a + b;
return c;
```

Answer hint:

- `LD GR1,A`
- `ADDA GR1,B`
- `ST GR1,C`
- `LD GR0,C`
- `RET`

### Task 8. Find the machine word for LD

Assemble `C++: Addition` and open Machine Code.

Expected observation:

- The first instruction word should encode `LD GR1,A`.
- The next word should be the address of `A`.

### Task 8B. Observe C++ function-call lowering

Start from `C++: Function Call`.

Expected observation:

- Generated CASL should contain `FUNC_ADDONE`.
- The call site should lower to `CALL FUNC_ADDONE`.
- After the callee returns, `GR0` should contain the function return value.
- `ST GR0,MAIN_X` should store that return value in the caller's static local label.
- Trace should show a stack return for the callee `RET` and a top-level finish for the final `RET` in `main`.

Answer hint:

- Final `GR0` should be `0001`.
- The MVP does not support multiple parameters, recursion, or calls inside larger expressions such as `foo() + 1`.

### Task 8C. Read the future calling convention design

Start from `C++: Function Call`, then read `docs/phase10b-calling-convention-design.md`.

Expected observation:

- `GR0` is already the return-value register.
- Future small arguments are planned for register slots such as `GR1` and `GR2`.
- Stack arguments are a later design topic, not current syntax.
- Static namespaced labels such as `MAIN_X` are not stack-frame locals.

Answer hint:

- Write only one simple `int` parameter if you try the implemented path; multiple parameters and complex arguments should still be rejected.
- The useful study question is: which values would be easiest to observe in Registers, and which values would need Stack Preview?

### Task 8D. Observe single-argument function lowering

Start from `C++: Function Argument`.

Expected observation:

- The call site should contain `LAD GR1,5` before `CALL FUNC_ADDONE`.
- The function entry should contain `ST GR1,FUNC_ADDONE_X`.
- `FUNC_ADDONE_X` should be a static parameter label, not a stack-frame local.
- After the callee returns, `GR0` should contain `0006`.

Answer hint:

- `GR1` carries the first argument.
- `GR0` carries the return value.
- Multiple parameters and stack arguments are still unsupported.

## Level 3: If / Else

### Task 9. Change condition from == to !=

Start from `C++: If Else`.

Change:

```cpp
if (a == b)
```

to:

```cpp
if (a != b)
```

Expected observation:

- Generated CASL should use a not-zero conditional jump.
- With both values still 10, the else path should run.

### Task 10. Predict branch target

Before running, find the conditional jump row in Generated CASL.

Expected observation:

- The control-flow target text should point to a generated IF label.
- Machine Code explanation should show the target address.

### Task 11. Step until CPA

Step through the program until `CPA`.

Expected observation:

- FR changes after comparison.
- The next conditional jump uses the flag result.

## Level 4: Loops

### Task 12. Change while sum from 3 to 5

Start from `C++: While Sum`.

Change:

```cpp
int i = 3;
```

to:

```cpp
int i = 5;
```

Expected observation:

- The final sum should be `000F`.
- Trace should show more loop iterations.

### Task 13. Convert while to for

Use the same sum logic with a supported for loop:

```cpp
int main() {
    int sum = 0;

    for (int i = 1; i <= 3; i++) {
        sum += i;
    }

    return sum;
}
```

Expected observation:

- The result should still be `0006`.
- Generated CASL should use `FOR_BEGIN`, `FOR_BODY`, `FOR_CONTINUE`, and `FOR_END`.

### Task 14. Compare LOOP_BEGIN and FOR_BEGIN

Assemble `C++: While Sum` and `C++: For Sum Sugar`.

Answer hint:

- `LOOP_BEGIN` belongs to while lowering.
- `FOR_BEGIN` belongs to for lowering.
- Both are condition-check entry points.

## Level 5: break / continue

### Task 15. Change continue condition

Start from `C++: Break Continue`.

Change:

```cpp
if (i == 2)
```

to:

```cpp
if (i == 3)
```

Expected observation:

- The skipped value changes.
- Trace should show a jump to `FOR_CONTINUE`.

### Task 16. Change break condition

Change:

```cpp
if (i == 4)
```

to:

```cpp
if (i == 5)
```

Expected observation:

- The loop runs longer before exiting.
- Trace should show a jump to `FOR_END` later.

### Task 17. Predict final sum

Using the original `C++: Break Continue`:

```cpp
for (int i = 1; i <= 5; i++) {
    if (i == 2) {
        continue;
    }

    if (i == 4) {
        break;
    }

    sum += i;
}
```

Answer hint:

- `i = 1` adds 1.
- `i = 2` continues.
- `i = 3` adds 3.
- `i = 4` breaks.
- Final sum is `0004`.

### Task 18. Find JUMP target in Machine Code

Open Machine Code for `C++: Break Continue`.

Expected observation:

- `JUMP FOR_CONTINUE_0` explains the continue target.
- `JUMP FOR_END_0` explains the break target.
- The operand word stores the target address.

## Japanese Note

これらの練習問題は、自動採点ではなく観察用です。Generated CASL、Machine Code、Trace、Memory Viewer を見ながら、ソースコードがどのように CASL II と COMET II の状態変化につながるかを確認してください。
