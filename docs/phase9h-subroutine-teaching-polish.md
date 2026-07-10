# Phase 9H: Subroutine Teaching Polish

Phase 9H does not change `CALL` or `RET` execution. It improves how the UI explains the subroutine flow that Phase 9G introduced.

The goal is to make three ideas easier to see:

- `CALL` has a target address and a separate return address.
- `RET` inside a call frame returns through the stack.
- `RET` with no active call frame remains the top-level program finish.

## CALL Target vs Return Address

`CALL SUB` has two address facts:

```text
target address = address of SUB
return address = address of the instruction after CALL
```

During execution:

```text
SP = SP - 1
Memory[SP] = return address
PR = target address
callDepth = callDepth + 1
```

The Circuit Focus view now labels this as a return edge: the visible control path goes to the subroutine, while the return address is stored on the stack for the later `RET`.

## Stack RET vs Top-Level RET

`RET` has two runtime modes:

```text
if callDepth > 0:
    PR = Memory[SP]
    SP = SP + 1
    callDepth = callDepth - 1
else:
    finish program
```

The UI names these modes explicitly:

- Stack return
- Top-level finish

This keeps old examples compatible. A program ending with a final `RET` still finishes without reading stack memory.

## Call Stack View

Circuit Focus Mode includes a compact Call Stack card.

This Call Stack view is deliberately small: it explains stack RET vs top-level RET without pretending to model full call-frame locals or arguments.

It shows:

- current `callDepth`
- top return address
- stack row containing the return address
- current or target routine label
- current `RET` mode
- the active return edge text

The card does not infer arguments, local variables, or full call frames. It is a read-only teaching view for the return-address stack.

## Return Edge Explanation

The return edge is shown differently depending on the instruction:

- `CALL`: `Call target SUB; return 0024`
- stack `RET`: `Return to 0024 from MEM[FFFD]`
- top-level `RET`: `Program finish`

This avoids implying that every `RET` reads the stack.

## Trace Reading Guide

Trace rows are phrased for the subroutine lesson.

Example `CALL` row:

```text
CALL target 0027; return 0024; SP FFFE -> FFFD; MEM[FFFD] write; callDepth 0 -> 1
```

Example stack `RET` row:

```text
RET stack return; MEM[FFFD] -> PR 0024; SP FFFD -> FFFE; callDepth 1 -> 0
```

Example top-level `RET` row:

```text
RET top-level finish; no stack access
```

## Machine Code Reading Guide

`CALL` machine-code explanation now includes:

- target base / effective address
- return address
- stack write address when runtime state is available
- `callDepth` before / after when runtime state is available

`RET` explanation distinguishes:

- stack return with `MEM[SP] -> PR`
- top-level finish with no stack access

## Demo Examples

`CASL: Call Return` remains the main subroutine demo.

`CASL: Nested Call Return` adds a small nested example:

```casl
MAIN START
     LAD   GR1,1
     CALL  SUB1
     ST    GR1,RESULT
     RET
SUB1 CALL  SUB2
     ADDA  GR1,ONE
     RET
SUB2 ADDA  GR1,TWO
     RET
ONE  DC    1
TWO  DC    2
RESULT DS  1
     END
```

Expected result: `RESULT = 0004`.

This demo is useful for seeing `callDepth` reach `2`, then return in last-in-first-out order.

## Current Limitations

- Phase 10A adds no-argument C++ function-call lowering on top of this subroutine teaching layer.
- No function arguments, recursion, stack-frame locals, or frame-pointer model.
- No static full call graph.
- `CALL` return edges are explained through runtime state, Trace, and the Call Stack card.

## Future Work

- Function argument and local-variable teaching examples.
- C++ stack-frame lowering when parameters and locals are introduced.
- Optional call graph / return edge visualization.
- More detailed stack-frame display when the language subset needs it.
