# WCASL Replacement Final Gate

- Audience: Teachers, maintainers, and technical evaluators
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Final CASL/COMET Conformance Report](final-casl-comet-conformance-report.md), [Known Limitations](reference/known-limitations.md)

## Decision

**PASS_WITH_LIMITATIONS**

stugx.CASL is ready to be presented as an independent, unofficial, modern WCASL-compatible CASL II / COMET II learning tool. This decision covers the audited classroom workflow; it is not a claim of official endorsement, identical WCASL UI behavior, proprietary project-file compatibility, or complete replacement in every environment.

The evaluated production baseline is commit `1c43887abce860535c040c5e7927c38eb3089aa5`, tagged `multi-program-linker-baseline-phase20f`, and deployed at <https://stugx-casl.pages.dev/>.

## Compatibility Counts

The frozen v1 matrix contains 56 features:

| Status | Count |
| --- | ---: |
| exact | 13 |
| compatible | 24 |
| superset | 15 |
| partial | 0 |
| missing | 0 |
| intentionally-different | 2 |
| not-applicable | 1 |
| blocked-needs-spec-evidence | 1 |

## Priority Gaps

| Priority | Gap count | Finding |
| --- | ---: | --- |
| P0 | 0 | All required source, assembly, execution, I/O, and CASL Mode workflows are admitted. |
| P1 | 0 | Observation, file, diagnostic, accessibility, and platform workflows are admitted. |
| P2 | 1 | Proprietary WCASL project import remains blocked pending a public format contract. |
| P3 | 0 | The v1 matrix defines no P3 feature entries. |

A gap is a feature marked `missing`, `partial`, or `blocked-needs-spec-evidence`. Intentionally different independent UI and Full Clear behavior are documented product choices, not hidden gaps.

## Gate Evidence

- The official instruction registry and instruction-cycle matrix both contain the same 28 COMET II machine instructions.
- Directive, literal, standard macro, FR, stack, indexed addressing, and single-file snapshots pass the frozen conformance suites.
- The independently authored 18-program classroom corpus covers memory, FR, branches, loops, stack, calls, I/O, macros, strings, indexing, bit operations, shifts, linking, microcycles, and reverse workflows.
- Unit, Web, WASM, C++ Core, production bundle, visual, stress, and Tauri validation pass on the evaluated baseline.
- Cloudflare host checks confirm production WASM, security headers, no public source maps, no third-party requests, and working root navigation.
- The first-year walkthrough meets the two-minute first-program goal, with limitations recorded in the [First-year Usability Check](first-year-usability-check.md).

## Limitations

- No proprietary WCASL project format or binary compatibility.
- Project sessions are not persisted or reopened as one project.
- No Redo, Reverse Run, Reverse Macro, or rollback across SVC/I/O and lifecycle barriers.
- No dynamic linker, object-file import, directory scan, cloud storage, account, or collaboration service.
- The C++ teaching subset is intentionally incomplete; double arithmetic remains unavailable.
- The Windows installer is unsigned and native Tauri file dialogs are deferred.
- The usability result is an expert walkthrough gate, not a completed study with a first-year student cohort.

## Presentation Boundary

Use this description:

> stugx.CASL is an independent, unofficial, browser-based CASL II / COMET II learning tool designed to make program execution easier to observe.

Do not describe the application as official WCASL, a proprietary WCASL project clone, or a complete time-travel debugger.
