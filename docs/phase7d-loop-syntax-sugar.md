# Phase 7D Loop Syntax Sugar

Phase 7D adds common C/C++ loop syntax sugar to the TypeScript C++ subset transpiler. It does not add CASL instructions, change COMET VM behavior, change the WASM bridge, or alter machine-code encoding.

## Supported Syntax Sugar

Statement form:

```cpp
i++;
++i;
i--;
--i;
i += 1;
i -= 1;
i += step;
i -= step;
```

For increment form:

```cpp
for (int i = 1; i <= 3; i++) {
    sum += i;
}

for (int i = 3; i > 0; i--) {
    sum += i;
}

for (int i = 1; i <= 3; i += 1) {
    sum += i;
}
```

## Normalization

The parser normalizes syntax sugar into the existing assignment AST:

```text
i++  -> i = i + 1
++i  -> i = i + 1
i--  -> i = i - 1
--i  -> i = i - 1
i += x -> i = i + x
i -= x -> i = i - x
```

This keeps the CASL generator simple: the existing expression lowering emits `LD`, `ADDA` or `SUBA`, and `ST`.

## Lowering

`i++`:

```text
LD    GR1,I
ADDA  GR1,CONST_1
ST    GR1,I
```

`i--`:

```text
LD    GR1,I
SUBA  GR1,CONST_1
ST    GR1,I
```

`i += step`:

```text
LD    GR1,I
ADDA  GR1,STEP
ST    GR1,I
```

If `step` is a literal, it is lowered through a generated `CONST_n` label. If `step` is an identifier, it must be declared and is lowered through the variable label.

## Mapping

New mapping kinds:

- `update-expression`
- `compound-assignment`

For normal statement form, these mapping kinds point from generated CASL lines back to the original C++ source line. Inside `for` increment, the existing `for-increment` mapping is retained so the loop header remains the source line for increment code.

## Machine Code View

Machine Code and Machine Code Explanation require no special handling. The syntax sugar is already lowered to normal CASL instructions, so the existing opcode/register/operand explanation for `LD`, `ADDA`, `SUBA`, and `ST` applies.

## Current Limits

- `break` and `continue` are supported only inside loops as of Phase 7E.
- No `do while`.
- No arrays or function calls.
- No `&&`, `||`, or unary `!`.
- Compound assignment currently accepts only integer literal or declared identifier as the step.
- No full C++ scope model.

## Break / Continue Interaction

Phase 7E lowers `break` and `continue` into CASL `JUMP` instructions. Syntax sugar remains normalized before CASL generation, so `for (...; ...; i++)` and `for (...; ...; i += step)` still use the same increment block that `continue` targets through `FOR_CONTINUE_n`.
