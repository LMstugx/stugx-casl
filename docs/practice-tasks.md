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
