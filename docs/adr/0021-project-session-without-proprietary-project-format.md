# ADR 0021: Project Session Without Proprietary Project Format

- Audience: Architects and maintainers
- Status: Accepted
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Module Ownership](../module-source-ownership.md), [Multi-program Projects](../user/multi-program-projects.md)

## Context

Public WCASL material demonstrates multi-file assembly/link workflow but does not provide enough evidence to implement a portable proprietary project-file parser safely.

## Decision

Provide a session-only project containing independently owned standard `.cas` modules. Each module uses the existing Open/Save lifecycle. Do not persist source, file handles, project identity, link results, or history. Do not invent or infer a WCASL project format.

## Consequences

Users can build and run multi-program projects while preserving standard source files and Web/Tauri parity. Reopening a complete project requires adding its modules again. WCASL proprietary project import remains `blocked-needs-spec-evidence`.
