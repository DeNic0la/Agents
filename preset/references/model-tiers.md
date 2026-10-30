# Model tiers

How orchestrating skills pick a model for each dispatched agent. Choosing the tier is a real decision: name it and give a one-line reason before each dispatch. If the harness can't choose a model per dispatch, run everything on the session's model and skip this file.

Tokens are the budget. Every dispatch spends them, and a higher tier multiplies the cost of every turn it runs. Pick the cheapest tier that can do the unit, and let escalation catch the rare miss.

## Tiers

Tiers are capability classes, not product names; map each to the closest model you have.

| Tier | Class | Claude | Others (by class) |
|---|---|---|---|
| `fast` | cheap, quick; mechanical and read-only work | Haiku | flash-lite class, small open-weight models |
| `standard` | balanced workhorse; most code | Sonnet | pro / full flash class, mini-class GPT models |
| `deep` | extended reasoning; critical or complex work | Opus | the provider's deliberate-reasoning tier |

`fast` and `standard` are the defaults. `deep` is the exception: it must be earned by a trigger below, never picked because you're unsure, because the work is large, or because it "matters".

## Selection

Assess each unit of work (a step, a phase, or a whole task) on scope, complexity and risk:

| Shape | Tier |
|---|---|
| Read-only work (search, exploration, summarising, collecting facts); text or docs; config; a mechanical code change in one file | `fast` |
| Ordinary code work, in one module or across several: new functions, components or tests, established patterns | `standard` |
| **Critical domain** (auth, payments, data integrity, irreversible migration, public API break) or **complex logic** (concurrency, non-trivial algorithms, an architecture with no established pattern to follow) | `deep` |

- **Highest match wins.** Check every row; criticality and complexity override size. A four-line fix in an auth handler is `deep`.
- **Both trigger lists are exhaustive.** Breadth, file count, shipping to production, touching users or adding to a public API are not triggers. A change across many files is `standard` unless one of its parts is `deep` on its own.
- **Mechanical breadth isn't complexity.** For one identical, rule-driven edit repeated across files, tier a single occurrence: a rename across 40 files is `fast`, the same rename inside `src/auth/` is `deep`.
- **Tie-breaker:** when no row fits cleanly, pick the cheaper tier. Escalation makes a cheap first guess recoverable.
- **Per unit, not per run.** Each unit is tiered on its own; an escalated tier never carries over to the next unit.

## Role pairing

A verified unit has a producer (does the work), an optional criteria-setter (writes the evaluation spec) and an evaluator (judges or reviews). All run at the producer's tier: never above it, and the criteria-setter never below it. An evaluator that scores against a fixed, explicit checklist (no judgement beyond ticking items) may run one tier lower, down to `fast`.

## Escalation

Raise the producer one tier (`fast` → `standard` → `deep`) for the next attempt when:

1. the attempt showed the model misunderstood the work, not just missed details; or
2. the user says the quality is too low or the result is wrong, at any time, including after a pass. This reopens the unit with a fresh retry budget.

- **Hold the tier** by default. Under trigger 1, a low score with narrow, precise defects the model clearly understood is not a misunderstanding: retry at the same tier with that feedback.
- **The evaluator keeps its tier.** Raise it too only when it let a clear defect through or scored against the wrong criteria.
- **`deep` is the ceiling.** If it still fails, stop and ask the user; never loop.
- **Always pass the evaluator's feedback into the retry.** A higher tier with the same prompt is not a fix.
- The criteria-setter is never re-run or re-tiered within a unit: its spec is reused so attempts stay comparable.

## User override

A `--model <tier>` argument runs every agent at that tier, superseding selection and pairing. Trigger 1 doesn't overrule it: keep iterating at the user's tier and, if the target is still missed, propose a bump. A user complaint (trigger 2) counts as approval and bumps immediately.
