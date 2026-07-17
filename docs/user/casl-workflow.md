# CASL Workflow

- Audience: CASL II learners
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Supported CASL Instructions](../reference/supported-casl-instructions.md), [Generated CASL and Machine Code](generated-casl-machine-code.md)

The direct CASL path is:

```text
CASL II source
-> Assemble
-> COMET II machine words
-> COMET II VM
-> Step or Run
-> Registers, Memory, Trace, and Circuit
```

Select or enter CASL source, then choose `Assemble`. Successful assembly replaces the loaded machine program; editing source afterward marks the document Dirty but does not silently replace the loaded VM.

`Step` executes one instruction. `Run` executes until completion, stop, error, or the configured safety limit. `Reset` restores the assembled program's runtime state without changing source.

Use source mapping and Machine Code to connect source rows to emitted words. Use Trace and Circuit Focus to inspect effects after execution.
