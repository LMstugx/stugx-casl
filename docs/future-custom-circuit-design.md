# Future Custom Circuit Design

This document is a design note. The current application does not implement a custom circuit editor.

## Why Custom Circuit May Be Useful

The fixed COMET-II circuit is useful for early study because it keeps attention on instruction execution. Later, advanced students may want to test how different hardware blocks, probes, or routing choices affect understanding.

The long-term goal is to support exploration without turning stugx.CASL into a full electronic design automation tool.

## Target Users

- Lower-year students: use the fixed circuit and guided lessons.
- Advanced students / fourth-year projects: test circuit visualization ideas.
- Teachers: prepare fixed templates for explanation.

## Future Components

Potential component types:

- Register
- Memory
- ALU
- Adder
- Comparator
- Logic Gate
- Mux
- Probe

## Component Contract

Each component should define:

- inputs
- outputs
- anchors
- signal type
- current value
- update rule
- routing lane preference

Anchors should have semantic roles such as:

- input
- output
- bidirectional
- address
- data
- control
- flag

## Supported Direction First

The project should grow in stages:

1. fixed templates
2. module visibility toggles
3. probe nodes
4. configurable routing overlays
5. later drag-and-drop editing

## Current Non-Goals

The current phase does not implement:

- drag-and-drop components
- user-defined wires
- custom simulation semantics
- new CASL instructions
- altered COMET-II execution behavior

The current typed anchor and bus-lane metadata is only groundwork for future visualization work.

Future routing should keep the Phase 8L rules:

- route from anchor to anchor
- use bus lanes instead of ad hoc lines
- avoid unrelated module bodies
- use one terminal arrow for active flow
- use junction dots for merge points
