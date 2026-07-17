# Interface Overview

- Audience: Users learning the application layout
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Observation Modes](observation-modes.md), [Diagnostics](diagnostics.md)

The Toolbar contains explicit Assemble, Run, Step, Reset, Stop, mode, and locale actions. It does not execute source on load.

The Source panel owns the current single document, the built-in example selector, and the CASL/C++ subset mode. Dirty state is derived from document revisions.

The COMET II Simulator presents the active instruction and circuit state. The Inspector provides Registers, Memory, stack-related views, and diagnostic context. The Output Dock contains Generated CASL, Machine Code, Trace, and related mapping views.

Circuit Focus reorganizes existing state for teaching. Project Overview contains low-priority project information and the offline Changelog entry. The Changelog is not placed in the crowded Toolbar.

Panels use natural page scrolling for normal content and bounded internal scrolling for long technical lists such as diagnostics, memory, trace, Generated CASL, and machine code.
