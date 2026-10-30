# Model tiers

How orchestrating skills pick a model for each dispatched agent. Choosing the tier is a real decision: name it and give a one-line reason before each dispatch. If the harness can't choose a model per dispatch, run everything on the session's model and skip this file.

## Tiers

Tiers are capability classes, not product names; map each to the closest model you have.

| Tier | Class | Claude | Others (by class) |
|---|---|---|---|
| `fast` | cheap, quick; mechanical work | Haiku | flash-lite class, small open-weight models |
| `standard` | balanced workhorse; most code | Sonnet | pro / full flash class, mini-class GPT models |
| `deep` | extended reasoning; critical or complex work | Opus | the provider's deliberate-reasoning tier |

`standard` and `fast` are the defaults. `deep` must be earned by a trigger below, never picked because you're unsure.

## Selection

Assess each unit of work (a step, a phase, or a whole task) on scope, complexity and risk:

| Shape | Tier |
|---|---|
| One text or docs file, no code, no cross-file reasoning; or a mechanical code change of about 10 lines in one file | `fast` |
| Ordinary code work: new functions, components or tests, one module, established patterns | `standard` |
| **Breadth** (about 3+ files or modules, or any breadth when a shared contract changes), **critical domain** (auth, payments, data integrity, irreversible migration, public API break) or **complex logic** (concurrency, non-trivial algorithms, open architecture) | `deep` |

- **Highest match wins.** Check every row; criticality and complexity override size. A four-line fix in an auth handler is `deep`.
- **The critical list is exhaustive.** Shipping to production, touching users or adding to a public API are not triggers.
- **Mechanical breadth isn't complexity.** For one identical, rule-driven edit repeated across files, tier a single occurrence: a rename across 40 files is `fast`, the same rename inside `src/auth/` is `deep`. A shared-contract change stays `deep`.
- **Tie-breaker:** when no row fits cleanly, pick the cheaper tier. Escalation makes a cheap first guess recoverable.
- **Per unit, not per run.** Each unit is tiered on its own; an escalated tier never carries over to the next unit.

## Role pairing

A verified unit has a producer (does the work), an optional criteria-setter (writes the evaluation spec) and an evaluator (judges or reviews). By default all run at the same tier. When the unit is non-obvious (the tie-breaker decided its tier, or it states no checkable acceptance condition), you may raise the criteria-setter alone by one tier. Never set the criteria-setter below the producer.

## Escalation

Raise both producer and evaluator one tier (`fast` → `standard` → `deep`) for the next attempt when:

1. the first attempt scored low or showed the model misunderstood the work, not just missed details; or
2. the user says the quality is too low or the result is wrong, at any time, including after a pass. This reopens the unit with a fresh retry budget.

- **Hold the tier** instead, under trigger 1 only, when the evaluator's issues are narrow, precise defects the model clearly understood. Retry at the same tier with that feedback.
- **`deep` is the ceiling.** If it still fails, stop and ask the user; never loop.
- **Always pass the evaluator's feedback into the retry.** A higher tier with the same prompt is not a fix.
- The criteria-setter is never re-run or re-tiered within a unit: its spec is reused so attempts stay comparable.

## User override

A `--model <tier>` argument runs every agent at that tier, superseding selection and pairing. Trigger 1 doesn't overrule it: keep iterating at the user's tier and, if the target is still missed, propose a bump. A user complaint (trigger 2) counts as approval and bumps immediately.
