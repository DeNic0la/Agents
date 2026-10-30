---
name: improve
description: Pick the skill for fixing, cleaning up or hardening code that already exists.
license: MIT
metadata:
  router: "true"
---

# Improve

A router: it names the skills for one area of work and when to reach for each. It does none of the work itself.

1. Take what the user wants from the argument, else from the conversation. If it's still unclear, ask one question.
2. Pick the one skill below that fits, using **Choosing**, and say why in one line.
3. Hand over:
   - Invoked by `agent`: use that skill now, on what the user asked.
   - Invoked by `user`: only the user can start it. Tell them its name and what to pass it, then stop.
   - Not available in this setup: say so, and name the closest skill that is.

If nothing here fits, name the router that does: `think`, `design`, `planning`, `build`, `ship`, `agent-setup`, `data`, `product`, `support`, `productivity`.

## Choosing

- Something is broken: `systematic-debugging`. Fixed, and worth not investigating twice: `compound`.
- A function or file that is hard to read: `code-simplification`. Responsibilities in the wrong place across files or modules: `refactor`. Files in the wrong folders: `improve-file-structure`.
- Deciding what to test: `testing-strategy`. An existing suite that is slow or catches little: `improve-tests`.
- Too slow: `performance-optimization`. Blind in production: `observability-and-instrumentation`. Old code to retire: `deprecation-and-migration`. Debt across the codebase, to prioritize: `tech-debt`.

## Skills

| Skill | Use it to | Invoked by |
|---|---|---|
| systematic-debugging | find the root cause before proposing any fix | agent |
| compound | record the reasoning behind a solved problem in `docs/solutions/` so it isn't investigated twice | agent |
| code-simplification | simplify code without changing behavior | agent |
| refactor | assess, then restructure code at method, file or project scope without changing behavior | user |
| improve-file-structure | assess file placement and plan a behavior-preserving reorganization for `implement` | user |
| testing-strategy | decide what to test at which level, and find coverage gaps, before writing tests | agent |
| improve-tests | cut a test suite to the tests that catch real bugs and the shortest run time | user |
| performance-optimization | measure, then optimize | agent |
| observability-and-instrumentation | add logs, metrics and traces | agent |
| deprecation-and-migration | retire old code and migrate its users | agent |
| tech-debt | find, score and prioritize technical debt into a phased plan beside feature work | agent |
