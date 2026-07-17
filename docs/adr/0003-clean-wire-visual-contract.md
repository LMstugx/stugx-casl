# ADR 0003: Clean-Wire Visual Contract

- Audience: Circuit and visual-design maintainers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Circuit Visualization](../developer/circuit-visualization.md), [Observation Modes](../user/observation-modes.md)

## Context

Earlier circuit decoration created visual noise and could imply inactive or directional hardware behavior not established by runtime state.

## Decision

Circuit Focus renders no arrowheads, no circular markers, no ghost inactive wires, and only active-flow wire emphasis. Targets, labels, modules, and Effective Address Unit context communicate relationships without decorative path restoration.

## Consequences

- Visualization remains readable at supported viewports.
- No UI change may reintroduce removed markers or inactive wire networks.
- Active paths must be derived from real execution-plan/VM state.
- Reduced-motion preference still applies to permitted signal animation.
