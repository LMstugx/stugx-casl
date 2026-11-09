# ADR 0024: Workbench Datapath Motion Shows Only What The Runtime Did

- Audience: Circuit, visual-design, and UI maintainers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Workbench Datapath ADR](0023-workbench-datapath-structural-buses-and-active-arrowheads.md), [Circuit Visual Contract](../circuit-visual-contract.md), [Keyboard and Accessibility](../reference/keyboard-accessibility.md)

## Context

The first plan for the v2 workbench datapath allowed no motion beyond the existing wire flow. The project owner then asked for more animation: a static highlight tells a learner which route is active, but not what moved, in which order, or what it changed.

Motion is useful for teaching only if it is true. An animation that invents a route, plays a step that did not happen, or keeps running while the learner reads would work against the rule that the circuit shows real runtime state.

## Decision

The workbench datapath may animate the arrival of a step. The animation has three parts, in this order:

1. Signal. Each control line that the controller asserts in this step draws once from the controller to its target.
2. Travel. Each active path that carries a word shows that word as a small token moving once along the route, from source to destination. Paths of a later stage start after the earlier stage has arrived.
3. Arrival. Each value that this step rewrote pulses once: a register window, a general register row, or a written memory row.

After that the datapath is still, except for a low-contrast flow on active paths that keeps showing direction.

The rules that keep this true:

- Motion never adds information. Every animated path, word, and rewritten value is already in the view model, which comes from the runtime state. Removing all motion leaves exactly the same picture.
- The picture is correct from the first frame. Values, highlights, and arrowheads show the committed state immediately; motion is laid over them and does not delay them.
- Stages order events of one step by data dependency, for example the address before the data it selects. They do not claim hardware timing.
- A reverse step plays no motion. The datapath shows the restored state at once and never plays anything backward.
- Motion plays once per step. A new step replaces any motion still running.
- Structural buses, idle control lines, and inactive parts never move.
- Motion never blocks input and never changes layout or route geometry.
- The reduced-motion preference and visual review static mode remove all of it. Every animated element is invisible or fully drawn when its animation is removed, so nothing is left half-way.

## Consequences

- A learner sees cause and effect inside one step: the controller acts, a word moves, a value changes.
- Screenshots, tests, and reduced-motion users get the same information as everyone else.
- The view model gains two optional presentation fields on an active path: the word it carries and its stage. Both come from runtime state in the same way as the path itself.
- Tests under `src/visual/datapath/__tests__` enforce the rules: no motion element exists unless motion is requested, tokens appear only on active paths that carry a word, an idle datapath has none, and the stylesheet hides every motion-only element by default and disables animation under reduced motion and static review.
