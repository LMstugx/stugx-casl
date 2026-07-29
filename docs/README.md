# Documentation

- Audience: Users, contributors, and maintainers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Project README](../README.md), [Changelog](../CHANGELOG.md)

This directory separates current product documentation from historical implementation records. Use the canonical guides below for current behavior. Files named `phase*.md`, baseline manifests, and QA notes remain historical evidence and contract-freeze records.

## User Guide

- [Getting Started](user/getting-started.md)
- [Interface Overview](user/interface-overview.md)
- [Observation Modes](user/observation-modes.md)
- [Unified Observation Workspace](user/unified-observation-workspace.md)
- [CASL Workflow](user/casl-workflow.md)
- [CASL Compatibility Mode](user/casl-compatibility-mode.md)
- [COMET Mode](user/comet-mode.md)
- [COMET Microcycle Mode](user/comet-microcycle-mode.md)
- [Reverse Microstep](user/reverse-microstep.md)
- [Reverse Instruction](user/reverse-instruction.md)
- [CASL State Editing](user/casl-state-editing.md)
- [Full Clear](user/full-clear.md)
- [CASL Input and Output](user/casl-input-output.md)
- [C++ Subset Workflow](user/cpp-subset-workflow.md)
- [Double Memory Observation](user/double-memory-observation.md)
- [Generated CASL and Machine Code](user/generated-casl-machine-code.md)
- [Open, Save, and New](user/open-save-new.md)
- [Diagnostics](user/diagnostics.md)
- [Guided Lessons](user/guided-lessons.md)
- [Persistence](user/persistence.md)
- [Changelog](user/changelog.md)
- [Web Version](user/web-version.md)
- [Windows Desktop Demo](user/windows-desktop-demo.md)
- [Known Limitations](user/known-limitations.md)

## Developer Guide

- [Architecture Overview](developer/architecture-overview.md)
- [Repository Structure](developer/repository-structure.md)
- [Frontend State Management](developer/frontend-state-management.md)
- [C++ to CASL Pipeline](developer/cpp-to-casl-pipeline.md)
- [Double Lowering](developer/double-lowering.md)
- [CASL Assembler](developer/casl-assembler.md)
- [CASL Macro Expansion](developer/casl-macro-expansion.md)
- [COMET II VM](developer/comet-vm.md)
- [COMET Microcycle Runtime](developer/comet-microcycle-runtime.md)
- [Microcycle History](developer/microcycle-history.md)
- [WASM Bridge](developer/wasm-bridge.md)
- [Circuit Visualization](developer/circuit-visualization.md)
- [Observation Workspace Layout](developer/observation-workspace-layout.md)
- [Diagnostics and i18n](developer/diagnostics-and-i18n.md)
- [Document Lifecycle](developer/document-lifecycle.md)
- [Persistence Architecture](developer/persistence-architecture.md)
- [Tauri Integration](developer/tauri-integration.md)
- [Build, Test, and Release](developer/build-test-release.md)
- [Cloudflare Deployment](developer/cloudflare-deployment.md)
- [Security Model](developer/security-model.md)
- [Contributing Workflow](developer/contributing-workflow.md)
- [Debugger Mutation Contract](debugger-mutation-contract.md)
- [Debugger History Barrier](debugger-history-barrier-contract.md)
- [Reverse Microstep Runtime Contract](reverse-microstep-runtime-contract.md)
- [Reverse Instruction Runtime Contract](reverse-instruction-runtime-contract.md)
- [Reverse History Integrity](reverse-history-integrity.md)
- [Instruction History Grouping](instruction-history-grouping.md)
- [Observation Data Linking Contract](observation-data-linking-contract.md)

## Technical Reference

- [Supported CASL Instructions](reference/supported-casl-instructions.md)
- [CASL Syntax Support](reference/casl-syntax-support.md)
- [COMET II Instruction Coverage](reference/comet-ii-instruction-coverage.md)
- [CASL II Directives, Literals, and Macros](reference/casl-ii-directives-macros.md)
- [C++ Subset Capabilities](reference/cpp-subset-capabilities.md)
- [C++ Double Support](reference/cpp-double-support.md)
- [Unsupported C++ Features](reference/unsupported-cpp-features.md)
- [Diagnostic Codes](reference/diagnostic-codes.md)
- [Storage Keys](reference/storage-keys.md)
- [Application States](reference/application-states.md)
- [File Formats and Encoding](reference/file-formats-and-encoding.md)
- [Keyboard and Accessibility](reference/keyboard-accessibility.md)
- [Build Commands](reference/build-commands.md)
- [Known Limitations Reference](reference/known-limitations.md)

## Architecture Decisions

The [ADR index](adr/README.md) records decisions that future changes must preserve or explicitly supersede.

## Historical Records

Historical Phase reports, manifests, release-candidate evidence, and visual review records remain available in this directory. They explain why a contract was introduced, but they are not the primary description of the current product.

### Learning and Visualization History

- [Learning Guide](learning-guide.md)
- [Demo Script](demo-script.md)
- [Practice Tasks](practice-tasks.md)
- [Screenshots Guide](screenshots-guide.md)
- [Circuit Focus Layout](phase8e-circuit-focus-final-layout.md)
- [Circuit Visual Convergence](phase8g-circuit-focus-visual-convergence.md)
- [Lab-Style Schematic](phase8j-lab-style-schematic-polish.md)
- [Layered Study Mode](phase8k-layered-study-mode-density-refinement.md)
- [Circuit Arrow Routing](phase8l-circuit-arrow-routing.md)
- [Signal Flow Animation](phase8m-lightweight-signal-flow-animation.md)
- [CASL Instruction Coverage](phase9a-casl-instruction-coverage.md)
- [Shift Instructions](phase9b-shift-instructions-and-path-templates.md)
- [Effective Address Unit](phase9d-effective-address-unit.md)
- [Stack Address Path](phase9e-stack-address-path-foundation.md)
- [PUSH and POP](phase9f-push-pop-stack.md)
- [CALL and RET](phase9g-call-ret-stack-semantics.md)
- [Subroutine Teaching](phase9h-subroutine-teaching-polish.md)
- [Function Call Lowering](phase10a-cpp-function-call-lowering.md)
- [Calling Convention Design](phase10b-calling-convention-design.md)
- [Single Argument Functions](phase10c-cpp-single-argument-function.md)
- [Multi-Register Arguments](phase10d-cpp-multi-register-arguments.md)
- [Focus Text Overflow](phase10e-focus-text-overflow-cleanup.md)
- [Small Viewport Accessibility](phase10f-small-viewport-accessibility.md)
- [Robustness Audit](phase10h-robustness-audit.md)
- [Stress Audit](phase10i-release-hardening-stress-audit.md)
- [Observation Mode Split](phase10j-observation-mode-split.md)
- [Observation Visual Cleanup](phase10k-observation-visual-defect-cleanup.md)
- [Final UI Detail Polish](phase10l-final-ui-detail-polish.md)
- [Circuit Visual Contract](circuit-visual-contract.md)
- [Future Circuit Design](future-custom-circuit-design.md)

### FramePlan Design History

- [Stack Frame Locals Design](phase11a-stack-frame-locals-design.md)
- [Stack Frame Lowering Scaffold](phase11b-stack-frame-lowering-scaffold.md)
- [Stack Frame View Placeholder](phase11c-stack-frame-view-placeholder.md)
- [FramePlan Generator](phase11d-frameplan-generator-scaffold.md)
- [FramePlan View Preview](phase11e-frameplan-stack-frame-view-preview.md)
- [FramePlan Slot Highlighting](phase11f-frameplan-slot-highlighting-contract.md)
- [Source/CASL Slot Selection](phase11g-source-casl-frame-slot-selection.md)
- [Circuit Probe Relation](phase11h-frameplan-circuit-probe-relation.md)
- [Editor Symbol Hover](phase11i-editor-frameplan-symbol-hover.md)
- [FramePlan Relation QA](frameplan-relation-qa-checklist.md)
- [FramePlan Design Summary](phase11-frameplan-design-layer-summary.md)

### Release and UI History

- [Phase 20A WCASL-II Parity Audit](phase20a-wcasl-parity-audit.md)
- [Phase 20B Debugger Editing](phase20b-debugger-state-editing.md)
- [Phase 20B.1 FR Specification Alignment](phase20b1-fr-spec-alignment.md)
- [Phase 20C COMET Instruction-Cycle Runtime](phase20c-comet-instruction-cycle-runtime.md)
- [Phase 20D Reverse Microstep](phase20d-reverse-microstep.md)
- [Phase 20E Reverse Instruction](phase20e-reverse-instruction.md)
- [Phase 20E.1 Unified Observation Workspace](phase20e1-unified-observation-workspace.md)
- [WCASL Debugger Editing Audit](wcasl-debugger-editing-audit.md)
- [WCASL-compatible Workflow Roadmap](wcasl-replacement-roadmap.md)
- [COMET Microcycle Visual Contract](comet-microcycle-visual-contract.md)
- [COMET Microcycle Runtime Contract](comet-microcycle-runtime-contract.md)
- [Reverse Microstep Runtime Contract](reverse-microstep-runtime-contract.md)
- [Reverse Instruction Runtime Contract](reverse-instruction-runtime-contract.md)
- [Multi-program Linking Design](multi-program-linking-design.md)

- [Technical Documentation Foundation](phase18a4-technical-documentation-foundation.md)
- [Double Storage Observation](phase19a-double-storage-observation.md)
- [Manual QA Checklist](manual-qa-checklist.md)
- [Release Candidate Notes](release-candidate-notes.md)
- [Visual RC Baseline](visual-rc-baseline.md)
- [v1 Scope Freeze](v1-scope-freeze.md)
- [v1 Release QA Evidence](v1-release-qa-evidence.md)
- [v1 RC1 Notes](releases/v1.0-rc1.md)
- [v1 Manual Signoff](v1-manual-signoff.md)
- [v1 Security Audit](v1-security-audit-notes.md)
- [Phase 12D Visual Audit](phase12d-visual-audit.md)
- [Advanced UI Design System](phase13a-advanced-ui-design-system.md)
- [Advanced UI Application](phase13b-advanced-ui-application.md)
- [UI Consistency and Accessibility](phase13c-ui-consistency-accessibility-audit.md)

### Diagnostics and i18n History

- [i18n Architecture](phase14a-i18n-architecture.md)
- [String Boundary](i18n-string-boundary.md)
- [Glossary](i18n-glossary.md)
- [Short String Inventory](i18n-short-string-inventory.md)
- [Glossary and Short Strings](phase14b-i18n-glossary-short-strings.md)
- [Circuit Localization](phase14c-circuit-learning-compact-localization.md)
- [Diagnostic Code Contract](diagnostic-code-contract.md)
- [Diagnostic Inventory](i18n-diagnostic-inventory.md)
- [Diagnostic Localization Architecture](phase14d-diagnostic-localization-architecture.md)
- [Diagnostic Parameter Schema](diagnostic-parameter-schema.md)
- [Source Range Contract](source-range-contract.md)
- [Schema and Source Range](phase14e-diagnostic-schema-source-range.md)
- [P1 Diagnostic Migration](phase14f-remaining-diagnostic-migration.md)
- [P2 Stability Audit](phase14g-p2-diagnostic-stability-audit.md)
- [Diagnostic Baseline](diagnostic-localization-baseline-v1.json)
- [Diagnostic Baseline Freeze](phase14h-diagnostic-localization-baseline.md)
- [i18n/Diagnostic Final Gate](phase14i-i18n-diagnostics-final-quality-gate.md)

### File Lifecycle History

- [File Lifecycle Architecture](phase15a-file-document-lifecycle-architecture.md)
- [Browser Open MVP](phase15b-browser-open-file-mvp.md)
- [Browser Text File Adapter](browser-text-file-adapter.md)
- [Document Session Controller](document-session-controller.md)
- [File I/O Adapter Contract](file-io-adapter-contract.md)
- [Source Ownership Contract](source-ownership-contract.md)
- [Unsaved Changes Contract](unsaved-changes-contract.md)
- [Cross-Phase File/i18n Contract](file-project-diagnostic-i18n-contract.md)
- [File Lifecycle Baseline](file-lifecycle-baseline-v1.json)
- [File Operation Matrix](file-lifecycle-operation-matrix-v1.json)
- [File Lifecycle Final Gate](phase15e-file-lifecycle-final-quality-gate.md)
