# First-year Student Usability Check

- Audience: Teachers, first-year course coordinators, and maintainers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Getting Started](user/getting-started.md), [Teacher Demo Script](demo/teacher-demo-script-ja.md)

## Result

**PASS_WITH_LIMITATIONS**

This result is an expert walkthrough of the production application, not a completed moderated study with a first-year student cohort. Classroom observation and teacher feedback remain required before making stronger usability claims.

| Check | Result | Evidence or limitation |
| --- | --- | --- |
| No installation | PASS | The public application opens in a current browser. |
| Works in browser | PASS | Production WASM smoke passes at <https://stugx-casl.pages.dev/>. |
| First program within two minutes | PASS | A built-in program is selected; Assemble and Step are explicit visible actions. |
| Assemble errors understandable | PASS | Structured diagnostics select a source range and offer related locations. |
| Step visible | PASS | Execution controls remain visible at the tested classroom viewports. |
| Register changes visible | PASS | Current and previous values are linked to the active Circuit path. |
| Circuit and Memory together | PASS | Unified Workspace keeps one live Circuit beside Memory. |
| Japanese labels clear | PASS_WITH_FEEDBACK | Automated containment passes; wording still requires instructor feedback. |
| Small screens usable | PASS_WITH_LIMITATIONS | 1180x700 passes; narrower phones use stacking and are not the primary classroom target. |
| No account required | PASS | There is no account or server backend. |
| No file setup for first demo | PASS | Built-in examples require no local file. |
| Refresh behavior documented | PASS | Only allowlisted preferences and built-in progress persist. |
| Save/Open documented | PASS | Direct write and download fallback are distinguished. |
| IN workflow clear | PASS_WITH_FEEDBACK | Input wait is nonblocking; first-time wording should be observed in class. |
| Reverse does not confuse beginners | PASS_WITH_LIMITATIONS | Reverse controls are separated by CASL/COMET mode; barriers require teacher explanation. |
| Advanced panels not overwhelming | PASS_WITH_LIMITATIONS | One auxiliary panel is shown at a time; Focus controls remain available. |
| Default demo exists | PASS | A built-in CASL example is selected on first load. |
| One-program teacher explanation | PASS | The LD/ST demo connects source, Circuit, registers, and Memory. |

## Recommended First Exercise

1. Open the public Web application.
2. Keep the default CASL example.
3. Choose Assemble.
4. Select Registers and choose Step once.
5. Select Memory and continue stepping.
6. Enter COMET Mode only after the instruction-level result is understood.

Reverse and Multi-program Linker should be introduced after the basic Assemble/Step/Memory workflow.

## Follow-up Evidence

Record whether students finish the first run without intervention, understand Dirty versus assembled state, identify an `IN` wait, and explain the difference between Reverse Instruction and Reverse Microstep. A real cohort finding can change this gate without changing runtime semantics.
