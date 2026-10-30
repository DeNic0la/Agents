---
name: roast
description: Pressure-test a technical idea before building it (a feature, architecture change, migration, refactor, library or tool choice). Five independent engineering reviewers attack it from different angles, then a judge issues one BUILD / RESHAPE / DROP verdict with the cheapest spike that retires the biggest risk.
---

# Roast

> **Repo version first:** if this repository has `.agents/skills/roast/SKILL.md`, follow that file instead of this one. It's tailored to the repository.

## Overview

Agents tend to agree with whatever idea they're handed. A roast does the opposite. Five reviewers judge the same brief independently, each from one angle. Then you act as judge and give one honest verdict. The verdict is not an average of their scores.

## When to Use

- The user asks to roast, pressure-test or sanity-check a technical idea before committing to it.
- Before a costly or hard-to-reverse choice: a new service, a rewrite, a framework switch, a data migration, a public API.

Not for:
- Clarifying a plan through questions. Use the `grilling` skill; it issues no verdict.
- Reviewing code that is already written. Do a code review instead.
- Small, cheap-to-revert changes. Just build them.

## The panel

| Seat | The question it answers | Sources |
|---|---|---|
| **Breaker** | "How does this fail in production?" | brief + codebase |
| **Advocate** | "What's the best realistic payoff?" | brief + codebase |
| **Analyst** | "Does the reasoning hold?" | brief **only** |
| **Investigator** | "What do the codebase and ecosystem actually say?" | codebase + web, evidence **required** |
| **Maintainer** | "Would I want to own this in two years?" | brief + codebase |

The prompt for each seat and the review format are in [references/seats.md](references/seats.md). Read it before dispatching the panel.

## Process

1. **Build the brief.** Gather the idea, the problem it solves, how things work today, the constraints and the alternatives, using the template in [references/brief.md](references/brief.md). Look up facts in the code yourself. Ask the user only for what you can't find, such as the motivation or the deadline. Show them the brief and fix anything they correct. The whole panel judges this brief, so a wrong brief means a wrong verdict.
2. **Convene the panel.** Dispatch the five seats **in parallel**, one subagent each with a fresh context. Every seat gets the same brief plus its own seat prompt, and nothing from the conversation. If you can't run subagents, write each review in turn without revising the earlier ones, and tell the user the reviews were not independent.
3. **Judge.** Weigh the reviews, apply the veto gates, name the real tension and resolve it, all as described in [references/verdict.md](references/verdict.md). Before a veto counts, check the evidence the seat cites.
4. **Design the cheapest spike.** Find the assumption that would change the verdict if it turned out false. Then propose the smallest timeboxed experiment that tests it, with pass and fail criteria set in advance (see [references/verdict.md](references/verdict.md)). Don't run the spike unless the user asks.
5. **Report** in the verdict format. Stop there. The decision is the user's.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I can play all five seats in one pass" | Each seat would see the others' arguments and drift toward agreement. Independence is the whole point. |
| "The scores average to 6, so RESHAPE" | The verdict isn't an average. A single fatal flaw that holds up caps the verdict, whatever the other seats scored. |
| "The user clearly likes the idea, so I'll soften it" | A verdict softened to please the user has no value. Say what the evidence supports. |
| "The Breaker said it loses data, so that's a veto" | A claim without evidence is not a fatal flaw. Check the code path it cites before it caps anything. |
| "The Analyst can look at the code to be sure" | The Analyst tests whether the reasoning holds on its own. Giving it code turns it into a second Investigator. |

## Red Flags

- Seats were given the conversation history or each other's reviews.
- The verdict is GO-shaped but nobody can name who will maintain the result.
- The spike has no pass/fail criteria, or takes longer than the thing it de-risks.
- The Investigator review cites no files, docs or links.
- The verdict ends with "it depends" and no resolved tension.

## Verification

- [ ] The user confirmed the brief before the panel ran.
- [ ] Five reviews exist, produced independently, each with a score and evidence.
- [ ] Every veto applied was checked against the cited evidence.
- [ ] The verdict names the tension and how it was resolved.
- [ ] The spike has a timebox and pass/fail criteria.
