# Observation Workspace Layout

- Audience: Frontend and visualization maintainers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Unified Observation Workspace](../user/unified-observation-workspace.md), [Observation Data Linking](../observation-data-linking-contract.md), [Circuit Visualization](circuit-visualization.md)

`ObservationWorkspace` separates execution granularity from presentation. CASL and COMET remain execution modes; auxiliary observation is an independent session selection.

## Component Ownership

```text
ObservationWorkspace
|- ObservationWorkspaceHeader
|- PersistentCircuitPane
|  `- CometCircuitSvg
|- ObservationDataPane
`- Source and machine context
```

`PersistentCircuitPane` is the only workspace owner of `CometCircuitSvg`. Auxiliary tab changes preserve its React identity and do not create another runtime subscription.

## State

The session-only state is:

- auxiliary observation identity
- `show-both`, `circuit-focus`, or `data-focus`
- Follow Execution

The frozen application preference still stores only the historical `observationMode` field. Known historical values map deterministically to a safe auxiliary tab. Unknown persisted values continue through the existing preference sanitizer. No workspace layout or Follow Execution value is persisted.

## Responsive Contract

- Above 1320 pixels, use a side layout with a readable Circuit minimum and a bounded data pane.
- At 1320 pixels and below, use a stacked Circuit/data layout.
- At 900 pixels and below, wrap auxiliary controls into four columns.
- Do not lock the page to a fixed viewport height.
- Keep one primary data scroll region; tables and Trace may use their established bounded internal scroll.

The implementation uses predetermined responsive ratios. It does not add a draggable split dependency or document-level pointer listeners.

## Performance

Memory renders a bounded window, Trace remains bounded, and Machine Code follows only its current row. Hidden CASL panels do not create a second VM or render all 65536 Memory words. Tab switches must not remount the Circuit or change a runtime epoch.
