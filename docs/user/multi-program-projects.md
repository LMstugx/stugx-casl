# Multi-program Projects

- Audience: CASL II learners and instructors
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Linker Output](linker-output.md), [CASL Workflow](casl-workflow.md), [Open, Save, and New](open-save-new.md)

Project Modules lets a session contain several standard `.cas` sources. Use New Module or Add Module, choose one Main module, and keep the desired module order.

1. Assemble the current module or choose Assemble All.
2. Resolve assembly errors in each module.
3. Choose Link Project.
4. Inspect module placement, entry point, symbols, and relocations.
5. Run or Step the linked image with the existing CASL or COMET controls.

The Main module is placed first. A cross-module `CALL` may target another module's `START` program label. Ordinary labels are private to their module. A macro still expands before linking, and Reverse Instruction reverses one expanded machine instruction.

Each module has independent Dirty and Save ownership. Saving does not Link, linking does not Save, and editing/reordering marks the link stale. Projects are session-only: there is no project file, automatic reopen, directory scan, or localStorage source persistence.

This independent, unofficial workflow uses standard `.cas` files. It does not read WCASL proprietary project files and does not claim official WCASL endorsement.
