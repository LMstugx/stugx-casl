# ADR 0019: Keep One Live Circuit Beside Auxiliary Data

- Audience: UI, visualization, and product maintainers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Unified Observation Workspace](../user/unified-observation-workspace.md), [Observation Data Linking](../observation-data-linking-contract.md)

## Decision

The main teaching workspace keeps one live Circuit visible while the user switches one auxiliary observation view. CASL and COMET identify execution granularity; Registers, Memory, Stack, Code / Machine, Source Mapping, Trace, Console, and Inspector identify observation data.

## Rationale

An exclusive whole-page mode forces learners to choose between the active data path and the values changed by that path. Keeping both views visible connects instruction semantics, machine state, and source mapping without putting every panel on screen at once.

One shared Circuit also prevents divergent runtime projections. Compact and full presentation use the same component and DTO.

## Consequences

- `Show both` is the default workspace layout.
- medium windows stack Circuit over data rather than shrinking the diagram below its readable minimum;
- Focus Data retains a compact live Circuit;
- auxiliary switches do not execute, reset, reverse, or set Dirty;
- historical observation preference values map to the new auxiliary selection;
- layout and Follow Execution remain session-only;
- the clean-wire and runtime ownership contracts remain unchanged.

This is a modern teaching-workspace enhancement, not a copy of the WCASL interface.
