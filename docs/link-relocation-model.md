# Link Relocation Model

- Audience: Assembler and linker developers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Linker Profile](casl-multi-program-linker-profile.md), [CASL Assembler](developer/casl-assembler.md)

A module is assembled at relative base zero. Its opcode words, address words, data/storage words, symbols, and source mappings remain module-relative until Link.

Phase 20F relocation kinds are:

- `call-target`: the address operand word of a cross-module `CALL`
- `absolute-address-word`: an address-bearing machine operand
- `data-address-constant`: a symbolic `DC` address word

The linker applies a relocation only to its declared target word. It never rewrites an opcode word or reparses Machine Code text. Relocation records contain stable identity, module/assembly ownership, word offset, normalized symbol, addend, source range, and instruction identity when applicable.

Application is deterministic and atomic. Duplicate target relocations, unresolved exported programs, 16-bit overflow, stale assemblies, and total-memory overflow are structured link diagnostics. Literal pools and generated-private symbols remain owned by their source module and are not merged or exported.
