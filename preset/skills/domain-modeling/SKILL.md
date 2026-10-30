---
name: domain-modeling
description: Use when the project's domain language is being changed rather than just read - discussing or challenging codebase terminology, resolving a vague or overloaded word, stress-testing how domain concepts relate, writing or editing a GLOSSARY.md, or recording or editing an ADR. Builds and sharpens the domain model as you design.
license: MIT
---

# Domain Modeling

> **Repo version first:** if this repository has `.agents/skills/domain-modeling/SKILL.md`, follow that file instead of this one. It's tailored to the repository.

Actively build and sharpen the project's domain model as you design. This is the *active* discipline: challenging terms, inventing edge-case scenarios, and writing the glossary and decisions down the moment they crystallise. (Merely *reading* `GLOSSARY.md` for vocabulary is not this skill: that's a one-line habit any skill can do. This skill is for when you're changing the model, not just consuming it.) For a technology choice rather than a domain decision, use the `architecture` skill, which writes ADRs in the same place and format.

## File structure

Most repos have a single context:

```
/
├── GLOSSARY.md
├── docs/
│   └── adr/
│       ├── 0001-event-sourced-orders.md
│       └── 0002-postgres-for-write-model.md
└── src/
```

If a `GLOSSARY-MAP.md` exists at the root, the repo has multiple contexts. The map points to where each one lives:

```
/
├── GLOSSARY-MAP.md
├── docs/
│   └── adr/                          ← system-wide decisions
├── src/
│   ├── ordering/
│   │   ├── GLOSSARY.md
│   │   └── docs/adr/                 ← context-specific decisions
│   └── billing/
│       ├── GLOSSARY.md
│       └── docs/adr/
```

Create files lazily: only when you have something to write. If no `GLOSSARY.md` exists, create one when the first term is resolved. If no `docs/adr/` exists, create it when the first ADR is needed.

## During the session

### Challenge against the glossary

When the user uses a term that conflicts with the existing language in `GLOSSARY.md`, call it out immediately. "Your glossary defines 'cancellation' as X, but you seem to mean Y. Which is it?"

### Sharpen fuzzy language

When the user uses vague or overloaded terms, propose a precise canonical term. "You're saying 'account': do you mean the Customer or the User? Those are different things."

### Discuss concrete scenarios

When domain relationships are being discussed, stress-test them with specific scenarios. Invent scenarios that probe edge cases and force the user to be precise about the boundaries between concepts.

### Cross-reference with code

When the user states how something works, check whether the code agrees. If you find a contradiction, surface it: "Your code cancels entire Orders, but you just said partial cancellation is possible. Which is right?"

### Update GLOSSARY.md inline

When a term is resolved, update `GLOSSARY.md` right there. Capture terms as they happen rather than in a batch at the end.

`GLOSSARY.md` is a glossary and nothing else: definitions of domain terms, free of implementation details. Specs, scratch notes and implementation decisions go elsewhere.

### Offer ADRs sparingly

Only offer to create an ADR when all three are true:

1. **Hard to reverse**: the cost of changing your mind later is meaningful
2. **Surprising without context**: a future reader will wonder "why did they do it this way?"
3. **The result of a real trade-off**: there were genuine alternatives and you picked one for specific reasons

If any of the three is missing, skip the ADR.

## Supporting files

- [references/glossary-format.md](references/glossary-format.md): read when creating or editing a `GLOSSARY.md` or `GLOSSARY-MAP.md`: structure, rules, single vs multi-context.
- [references/adr-format.md](references/adr-format.md): read when writing an ADR or deciding whether a decision qualifies for one: template, optional sections, numbering.
- `ddd-deliverables.md` in the references folder (`.agents/references/`, else `~/.agents/references/`): read when a project is adopting DDD or a model needs checking for gaps: the strategic, tactical and evented artifacts it should have.
