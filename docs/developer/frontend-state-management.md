# Frontend State Management

- Audience: Frontend maintainers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Document Lifecycle](document-lifecycle.md), [Persistence Architecture](persistence-architecture.md)

The React application uses a centralized application store and typed actions. Components render selected state and invoke actions; they do not serialize the entire store or directly own compiler/runtime lifecycle.

Document source and derived state have explicit ownership. A committed source replacement invalidates source-owned diagnostics, markers, generated code, machine rows, Trace, and VM state atomically. Editing source derives Dirty state from revisions and does not silently reload the VM.

Runtime state includes run status, registers, memory, source mapping, Trace, and visualization state. Presentation modes and selected technical rows do not change execution semantics.

Browser APIs are isolated behind adapters and controllers. Persistence hydrates before initial UI exposure, while file operations use guarded asynchronous transactions with stale-result checks.

Do not add React render-time writes, locale-derived identities, content hashes as document identity, or component-level `localStorage` access.
