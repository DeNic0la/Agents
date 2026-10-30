# Technology choice ADR

The same ADR format as the `domain-modeling` skill, with its optional sections filled in, because a technology choice is only useful with its rejected options.

- **Location:** `docs/adr/`, or the context's own `docs/adr/` when `GLOSSARY-MAP.md` lists one and the decision belongs to that context.
- **Name:** `NNNN-slug.md`, sequential. Scan for the highest number and add one.
- **Status:** `proposed`, `accepted`, `deprecated`, or `superseded by ADR-NNNN`. When a new ADR replaces an old one, set the old one's status to `superseded by ADR-NNNN`; don't delete it.

## Template

```md
---
status: proposed
---

# {Short title of the decision}

{1-3 sentences: the context and forces, what we decided, and why.}

## Considered Options

### {Option A}

| Dimension | Assessment |
|---|---|
| Complexity | Low / Medium / High |
| Cost | ... |
| Scalability | ... |
| Team familiarity | ... |
| Operational burden | ... |
| Lock-in | ... |

**Pros:** ...
**Cons:** ...

### {Option B}

{Same table and lists.}

## Consequences

- What becomes easier
- What becomes harder
- What we'll need to revisit, and when
```

Keep it as short as the decision allows. Drop table rows that don't differ between options. Implementation steps go in the issue tracker, not the ADR.
