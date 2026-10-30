# Ticket body

Use this body for every ticket. On a local Markdown tracker, the parent, blockers, labels and status go in the file's frontmatter as `.agents/issue-tracker.md` describes, and the body starts at `## What to build`.

```markdown
Blocked by: #<n>, #<n>

## Parent

A reference to the parent issue on the tracker.

## What to build

The end-to-end behavior this ticket makes work, from the user's point of view, not a layer-by-layer implementation list.

## Acceptance criteria

- [ ] Criterion 1
- [ ] Criterion 2

## Seams

The seams under test for this ticket: every seam from the parent spec's testing decisions that one of its acceptance criteria crosses.
```

- **`Blocked by:`** only where the tracker has no native blocking. Omit it when nothing blocks the ticket.
- **`## Parent`** only when the source was an existing issue.
- **`## Seams`** only when there is a spec.

Avoid file paths and code snippets: they go stale fast. One exception: when a prototype produced a snippet that states a decision more precisely than prose can (a state machine, reducer, schema or type shape), inline it, trimmed to the decision-rich parts, and note that it came from a prototype, citing its `prototype/<name>` branch.
