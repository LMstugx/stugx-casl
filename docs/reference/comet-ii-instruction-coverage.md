# COMET II Instruction Coverage

- Audience: CASL II users and runtime maintainers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Supported CASL Instructions](supported-casl-instructions.md), [COMET II VM](../developer/comet-vm.md)

The runtime registry, assembler, VM dispatch, machine decoder, source mapping, and parity tests cover all machine instructions in the IPA CASL II / COMET II public specification. The primary external reference is the [IPA specification PDF](https://www.ipa.go.jp/en/it-examinations/nph2g600000007uh-att/000009652.pdf).

| Instruction | Address opcode | Register opcode | Words | Forms | Main effect |
| --- | ---: | ---: | ---: | --- | --- |
| `NOP` | `00` | - | 1 | none | no state change except `PR` |
| `LD` | `10` | `14` | 2 / 1 | `r,adr[,x]`, `r1,r2` | load and update `FR` |
| `ST` | `11` | - | 2 | `r,adr[,x]` | write one word |
| `LAD` | `12` | - | 2 | `r,adr[,x]` | load effective address; no data read |
| `ADDA` | `20` | `24` | 2 / 1 | address/register | signed add |
| `SUBA` | `21` | `25` | 2 / 1 | address/register | signed subtract |
| `ADDL` | `22` | `26` | 2 / 1 | address/register | logical add |
| `SUBL` | `23` | `27` | 2 / 1 | address/register | logical subtract |
| `AND` | `30` | `34` | 2 / 1 | address/register | bitwise AND |
| `OR` | `31` | `35` | 2 / 1 | address/register | bitwise OR |
| `XOR` | `32` | `36` | 2 / 1 | address/register | bitwise XOR |
| `CPA` | `40` | `44` | 2 / 1 | address/register | signed compare |
| `CPL` | `41` | `45` | 2 / 1 | address/register | logical compare |
| `SLA` | `50` | - | 2 | `r,adr[,x]` | arithmetic left shift |
| `SRA` | `51` | - | 2 | `r,adr[,x]` | arithmetic right shift |
| `SLL` | `52` | - | 2 | `r,adr[,x]` | logical left shift |
| `SRL` | `53` | - | 2 | `r,adr[,x]` | logical right shift |
| `JMI` | `61` | - | 2 | `adr[,x]` | branch when negative |
| `JNZ` | `62` | - | 2 | `adr[,x]` | branch when not zero |
| `JZE` | `63` | - | 2 | `adr[,x]` | branch when zero |
| `JUMP` | `64` | - | 2 | `adr[,x]` | unconditional branch |
| `JPL` | `65` | - | 2 | `adr[,x]` | branch when positive |
| `JOV` | `66` | - | 2 | `adr[,x]` | branch on overflow |
| `PUSH` | `70` | - | 2 | `adr[,x]` | push effective-address value |
| `POP` | `71` | - | 1 | `r` | pop one word |
| `CALL` | `80` | - | 2 | `adr[,x]` | push return address and branch |
| `RET` | `81` | - | 1 | none | return; top-level teaching finish |
| `SVC` | `F0` | - | 2 | `adr[,x]` | invoke teaching OS service |

`GR1` through `GR7` may be index registers. `GR0` is rejected as an index. Register forms do not perform effective-address generation or a data-memory read.

## Flag Register

The public COMET II flag register contains exactly:

- `OF`: overflow, or the last bit shifted out by `SLA`, `SRA`, `SLL`, and `SRL`
- `SF`: sign of the result
- `ZF`: zero result

`ADDL` carry and `SUBL` borrow set `OF`. Any carry/borrow variable used by an
implementation is function-local and is never a fourth flag. Logical
instructions clear `OF` and update `SF`/`ZF`; compare instructions update the
three official fields according to their signed or logical comparison rules.
`JOV` reads `OF`.

The canonical machine-cycle contract is [the Phase 20C matrix](../comet-instruction-cycle-matrix-v1.json). The runtime implements its phases, but does not import the JSON at runtime. The model is named **stugx.CASL Teaching Microarchitecture v1** and does not claim a unique physical COMET II implementation.

`IN`, `OUT`, `RPUSH`, and `RPOP` are macros, not extra machine instructions. Their real expanded words are covered separately.
