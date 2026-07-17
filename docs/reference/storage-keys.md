# Storage Keys

- Audience: Users, security reviewers, and persistence maintainers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Persistence](../user/persistence.md), [Persistence Architecture](../developer/persistence-architecture.md)

| Owner | Key | Limit | Allowlisted data |
| --- | --- | ---: | --- |
| Locale | `stugx.casl.locale` | 64 bytes | `en`, `ja`, or `zh-CN` |
| UI preferences | `stugx.casl.preferences.v1` | 16 KiB | observation mode, Circuit Focus enabled, Inspector tab, Output Dock tab |
| Startup selection | `stugx.casl.startup-selection.v1` | 4096 bytes | canonical built-in `lastExampleId` |
| Lesson progress | `stugx.casl.lesson-progress.v1` | 64 KiB | built-in lesson/example/version and completed stable step IDs |

The stores are independent. Unknown versions use defaults; they are not interpreted by field shape. Lesson compatibility mismatches discard only the affected lesson.

Prohibited data includes source, filename/path, handles, DocumentId, SourceUnitId, Dirty state, diagnostics, Generated CASL, Machine Code, Trace, VM/register/memory state, timestamps, and arbitrary user text.
