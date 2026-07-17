# Guided Lessons

- Audience: Users following built-in learning paths
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Persistence](persistence.md), [Learning Guide](../learning-guide.md)

Built-in examples can include a Guided Lesson with concepts, goals, suggested steps, checkpoints, and a recommended view.

Suggested-step checkboxes are manual learning progress. They do not assemble, run, step, or modify source. Progress is associated with explicit built-in lesson and step IDs, not array order, display text, or locale.

Only built-in lesson completion is persisted. New steps start incomplete, deleted step IDs are ignored, and a lesson compatibility-version mismatch discards that lesson's old progress. External and Untitled documents do not create persistent lesson entries.

`Reset progress` clears the active lesson only. It does not clear locale, preferences, startup example, source, or runtime state.
