---
name: architecture
description: Use when choosing between technologies or architectural options ("Kafka or SQS?", "Postgres or DynamoDB?"), when a design decision with real trade-offs needs recording, or when reviewing a design proposal. Compares the options and records the decision as an ADR.
---

# Architecture

> **Repo version first:** if this repository has `.agents/skills/architecture/SKILL.md`, follow that file instead of this one. It's tailored to the repository.

## Overview

Make technology and architecture decisions on explicit criteria, and record them so the next engineer knows why. Two modes: **decide** (compare options, write an ADR) and **evaluate** (review a design proposal and return findings).

ADRs here follow the same conventions as the `domain-modeling` skill: one file per decision in `docs/adr/`, numbered `0001-slug.md`, with the same format and status values. This skill adds the option comparison a technology choice needs. Use `domain-modeling` instead when the decision is about domain language or context boundaries.

## When to Use

- Choosing between technologies, services or architectural patterns
- A decision is made in conversation that a future reader would question
- "Review this design", "is this proposal sound?"

**Not for:**
- Designing a whole system from requirements: use `system-design` (it calls back here for the hard-to-reverse choices).
- Designing one API or interface: use `api-and-interface-design`.
- Pressure-testing an idea before committing to it at all: use `roast` or `grilling`.

## Mode: Decide

1. **Frame the decision.** One sentence: what must be decided, and why now. Collect the constraints that shape the answer: deadline, load ("must handle 10K requests per second"), budget, team skills, compliance, existing stack. Ask for any that change the answer.
2. **Check for prior decisions.** Read `docs/adr/` (and context-specific ADR folders listed in `GLOSSARY-MAP.md`, if it exists). If an ADR already covers this, the outcome is a new ADR that supersedes it, or no change.
3. **Name at least two real options**, including "keep what we have" when there is something. Even if the user leans one way, compare honestly.
4. **Assess each option** on the same dimensions: complexity, cost, scalability, team familiarity, operational burden, lock-in, plus any constraint from step 1. Back claims about a technology with its documentation, not memory.
5. **Make the trade-off explicit** and recommend one option, with what it costs.
6. **Gate the ADR.** Write one only when the decision is hard to reverse, surprising without context, and the result of a real trade-off. If any of the three is missing, give the recommendation without an ADR.
7. **Write the ADR** in the format in [references/tech-choice-adr.md](references/tech-choice-adr.md), with status `proposed` until the user accepts it. Scan for the highest number and add one; create `docs/adr/` only if it doesn't exist yet.
8. **Follow-ups.** List the implementation steps the decision implies. Offer to publish them to the issue tracker: the tracker and its labels are in `.agents/issue-tracker.md`. If that file doesn't exist, generate it first with the issue-tracker recipe: `.agents/references/issue-tracker.md` in the project, else `~/.agents/references/issue-tracker.md`.

## Mode: Evaluate

Read the proposal and the code it touches, then check:

- **Requirements:** does it meet the stated functional and non-functional ones? Which are missing?
- **Simplicity:** is there a simpler design that meets the same requirements?
- **Failure modes:** what happens when each dependency is slow or down?
- **Data:** who owns each piece of data, and how does it stay consistent?
- **Fit:** does it contradict existing ADRs, `GLOSSARY.md` or the project's conventions?
- **Operability:** can the team deploy, monitor and debug it with what they have?
- **Reversibility:** which parts are hard to undo, and are they justified?

Return findings ordered by severity, each with the evidence and a suggested change. Decisions that come out of the review go through **Decide**.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Everyone uses X" | Popularity isn't a constraint you have. Compare against yours. |
| "Only one option makes sense" | Then the ADR is short. Write the alternative you rejected and why. |
| "An ADR for every choice" | Easy-to-reverse choices don't need one. Apply the three-part gate. |
| "I know how this technology behaves" | Versions change. Cite its docs for the claims the decision rests on. |

## Red Flags

- A comparison where one option has only pros.
- No constraints stated before the options.
- A new ADR that contradicts an existing one without superseding it.
- ADRs in a second location or format next to `docs/adr/`.

## Verification

- [ ] Constraints were stated before options were compared.
- [ ] At least two options were assessed on the same dimensions.
- [ ] The ADR gate was applied; any ADR is numbered, in `docs/adr/` and in the shared format.
- [ ] Superseded ADRs are marked.
