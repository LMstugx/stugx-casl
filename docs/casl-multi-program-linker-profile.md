# CASL Multi-program Linker Profile

- Audience: Users, developers, and compatibility reviewers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [CASL Linker](developer/casl-linker.md), [Relocation Model](link-relocation-model.md), [Source Ownership](module-source-ownership.md)

## stugx.CASL Multi-program Linker Profile v1

Each `.cas` source is an independent module with its own `ModuleId`, `SourceUnitId`, assembly result, labels, literals, diagnostics, Dirty state, and file ownership. The linker consumes structured module assembly results. It never concatenates source text.

The profile follows the public IPA `START` program-name and entry contract and the publicly documented WCASL multi-file workflow. Public material does not define a portable WCASL project-file format or `PUBLIC`/`EXTERN` syntax, so this is an independent deterministic linker profile rather than an exact WCASL binary or project-format clone.

## Symbols

- A module's `START` program label is exported automatically.
- Ordinary labels, generated labels, and literal labels are module-local.
- Phase 20F permits cross-module references only for `CALL` to an exported program label.
- No `PUBLIC` or `EXTERN` directive is invented.
- Duplicate exported program names are link errors. Local labels may repeat across modules.

## Placement

The main module is first. Remaining modules follow explicit project order. Each module occupies one contiguous range beginning at `#0020`; no alignment, section merging, dead-code elimination, or literal merging is performed. A single-module project therefore preserves existing addresses and machine words.

The final image cannot exceed the 65,536-word COMET II address space. Link order, addresses, symbols, relocations, and source maps are independent of locale and local file paths.

## Entry And Limits

One module is explicitly Main; a one-module project selects it automatically. The linked entry point is the Main module's audited `START` entry. A session supports at most 64 modules, each retaining the existing 1 MiB source limit.

Unsupported surfaces include dynamic linking, linker scripts, object-file import/export, weak/versioned symbols, overlays, C/C++ objects, project persistence, and the proprietary WCASL project format.
