# Final CASL II / COMET II Conformance Report

- Audience: Teachers, maintainers, and conformance reviewers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Supported Instructions](reference/supported-casl-instructions.md), [WCASL Final Gate](wcasl-replacement-final-gate.md)

## Reference Profile

The primary normative reference is the IPA [Specifications for Assembly Language, Annex 1](https://www.ipa.go.jp/en/it-examinations/nph2g600000007uh-att/000009652.pdf). Product workflow comparisons additionally use the audited public WCASL-II manual evidence recorded in the frozen compatibility matrix.

stugx.CASL is an independent implementation. **stugx.CASL Teaching Microarchitecture v1** explains instruction semantics through real runtime phases; it does not claim that COMET II has one required physical microarchitecture.

## Result

All 28 machine instructions in the runtime opcode registry are present in the frozen instruction-cycle matrix and pass assembler/VM regression. The conformance result is **PASS** for the public CASL II / COMET II profile implemented by the application.

| Contract | Result | Evidence |
| --- | --- | --- |
| 28 machine instructions | PASS | `phase20aCaslCompatibility.test.ts`, C++ Core tests 1-91 |
| Opcode encodings | PASS | register-form vectors, address-form vectors, assembler/Core parity |
| 16-bit word and 65,536-word memory | PASS | boundary and numeric-format tests |
| Register and address forms | PASS | all official register forms and two-word address forms |
| Indexed forms | PASS | direct/indexed parity and effective-address tests |
| GR0 index restriction | PASS | parser and C++ Core rejection tests |
| PR update | PASS | instruction/microcycle parity and branch vectors |
| SP update | PASS | PUSH, POP, CALL, RET, wrap, and reverse tests |
| OF/SF/ZF only | PASS | three-bit FR contract; no CF UI/runtime field |
| Shift-out bit to OF | PASS | SLA/SRA/SLL/SRL vectors |
| CALL/RET | PASS | stack return, nested call, and linked call tests |
| SVC | PASS_WITH_PROFILE | Real SVC execution uses the documented teaching OS boundary; undefined post-SVC state is handled deterministically. |
| START/END/DC/DS | PASS | directive, entry, allocation, and multi-value constant vectors |
| IN/OUT/RPUSH/RPOP | PASS_WITH_PROFILE | Standard expansion and observable results pass; I/O uses a nonblocking teaching OS service. |
| Literals | PASS | decimal, hexadecimal, character, ownership, and collision tests |
| Symbols | PASS | local, generated, exported START, duplicate, and unresolved cases |
| Single-file output | PASS | frozen assembler snapshots and one-module link parity |
| Linked output | PASS_WITH_PROFILE | Deterministic independent linker profile with address relocation and START exports |

## Instruction Inventory

`NOP`, `LD`, `ST`, `LAD`, `ADDA`, `SUBA`, `ADDL`, `SUBL`, `AND`, `OR`, `XOR`, `CPA`, `CPL`, `SLA`, `SRA`, `SLL`, `SRL`, `JMI`, `JNZ`, `JZE`, `JUMP`, `JPL`, `JOV`, `PUSH`, `POP`, `CALL`, `RET`, and `SVC`.

## Important Processing Policies

- A machine instruction is executed with its documented word encoding; macros expand before execution.
- FR has exactly OF, SF, and ZF. There is no CF.
- `ST` writes Memory and does not clear its source register.
- `LAD` writes an effective address and does not perform a data-memory read.
- Register-form `LD` copies a register and performs no data-memory access.
- `DS` initialization shown by the simulator is deterministic presentation and is not a language guarantee.
- Top-level `RET`, browser I/O, and linked placement use documented teaching-runtime profiles where the public language specification delegates behavior to the processing system.

## Residual Scope

The report does not certify a proprietary WCASL project format, a physical processor timing implementation, a native compiler, or binary compatibility with another product.
