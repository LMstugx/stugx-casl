# Getting Started

- Audience: Students, teachers, and first-time users
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Interface Overview](interface-overview.md), [CASL Workflow](casl-workflow.md)

stugx.CASL is a learning studio for CASL II, COMET II, and a small C++ teaching subset. The public Web version is available at <https://stugx-casl.pages.dev/>. A Windows Tauri demo can also be built for offline local demonstrations.

Use a current browser with WebAssembly and ES module support. File System Access is optional; browsers without it use the documented download fallback.

## First Run

1. Select a built-in CASL or C++ example above the Source editor.
2. Choose `Assemble` to produce machine code and load the COMET II VM.
3. Use `Step` to inspect one instruction, or `Run` to continue.
4. Use `Reset` to return the loaded program to its initial runtime state.
5. Inspect Registers, Memory, Trace, Generated CASL, Machine Code, and Circuit Focus.
6. Switch among EN, JA, and zh-CN with the locale controls.

Source is never assembled or run automatically. The tool is not a complete C++ compiler, and it is not an official school product.

For precise support boundaries, see [CASL Syntax Support](../reference/casl-syntax-support.md) and [C++ Subset Capabilities](../reference/cpp-subset-capabilities.md).
