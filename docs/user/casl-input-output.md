# CASL Input And Output

- Audience: CASL II users working with `IN` and `OUT`
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [CASL Compatibility Mode](casl-compatibility-mode.md), [Directives and Macros](../reference/casl-ii-directives-macros.md)

`IN` and `OUT` are standard CASL II macros. The assembler expands them into real instructions ending in a teaching operating-system `SVC`; they are not invented single-word machine opcodes.

## Input

When an input service has no queued record, execution enters `WaitingInput`. The browser main thread is not blocked and no `window.prompt` is used. Submit one record from the Console, or submit EOF.

- input is never executed as code
- input is not sent over the network or persisted
- a record is limited to 256 characters
- printable ASCII and JIS X 0201 half-width katakana use their documented byte values
- unsupported UI characters are replaced with `?`
- normal input writes characters to the area and its length to the length word
- EOF writes `FFFF` to the length word

The queue and Console are cleared by Reset, Reload, successful source replacement, or assembly replacement.

## Output

`OUT` reads at most 256 words from the specified area and emits a plain-text record. React renders it as text, never HTML. Invalid display bytes use a replacement character. Console history is bounded to the most recent 256 records.

The view-only Clear action hides existing Console records in that view. It does not mutate VM memory, registers, source, diagnostics, Trace, or persistence.

## Register And Flag Boundary

The macro expansion preserves general registers through real `PUSH` and `POP` instructions. The official macro profile does not define the resulting `FR`; stugx.CASL clears `FR` deterministically after the teaching OS service and documents this as a compatible implementation choice.
