# Linker Output

- Audience: CASL II learners and instructors
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Multi-program Projects](multi-program-projects.md), [Generated CASL and Machine Code](generated-casl-machine-code.md)

The bounded Linker Output shows the selected Main module, linked entry point, total word count, module placement ranges, exported program symbols, and applied relocation records.

Addresses are final COMET II addresses. A placement row shows the module's contiguous address range. A relocation row shows the symbolic target and resolved address. These values are derived from the same immutable `LinkResult` used to load the VM; the UI does not recalculate them from source text.

Machine Code, Source Mapping, and Trace retain module context during execution. Follow Execution can locate the active linked instruction while Circuit remains visible. The output contains display names and technical values, never local absolute paths, file handles, tokens, or environment details.
