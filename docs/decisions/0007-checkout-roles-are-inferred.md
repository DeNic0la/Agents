# 0007 Checkout roles are inferred from usage

- **Status:** accepted, implemented (2026-11-16) (see [specs/tailoring-levels.md](../specs/tailoring-levels.md))

## Context

Clones of one codebase serve different jobs: integrating changes from an upstream vendor, answering questions from the business side as a read-only reference that tracks the version in production, everyday development. Each needs a few things the others don't (a write deny, awareness of the production version, a habit of updating itself). Asking the owner to declare and maintain role names adds work and drifts from how the clones are really used.

## Decision

- A checkout's role is free-form and inferred by the agent from what the owner actually does there (only questions and no edits, merges from upstream, feature work, the branch it stays on).
- The agent proposes the role with its evidence and what the checkout level would add (instructions, skills, settings), and writes it only after the owner's yes. It may also ask the owner directly when the evidence is thin.
- When the same role appears in several projects, the pattern is written into a `repo-checkout-roles` concept, so later checkouts can be matched to it.

## Rejected

- **Declared, named roles picked at setup:** extra work for the owner and stale as usage changes.
- **Writing an inferred role without asking:** a wrong guess could silently lock a checkout, for example with a write deny.

## Consequences

- A new clone starts with the project level only; its checkout level appears once its use is clear.
- The `repo-checkout-roles` concept starts small and grows from observed patterns.
