# Generated CASL and Machine Code

- Audience: Users comparing source, assembly, and execution
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [C++ Subset Workflow](cpp-subset-workflow.md), [CASL Assembler](../developer/casl-assembler.md)

Generated CASL is the assembly emitted from C++ subset input. Direct CASL input does not require this lowering stage.

Machine Code lists COMET II addresses and words produced by the assembler. Explanations identify opcode, register fields, address operands, index fields, resolved labels, and effective-address context where available.

Source Mapping relates C++ source, Generated CASL, and machine rows without changing any of them. Control Flow annotations show known branch and label relationships; they are not a replacement for execution Trace.

Generated CASL and Machine Code are derived output. They are cleared when source ownership changes and are never persisted as user session data.
