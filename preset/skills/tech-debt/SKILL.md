---
name: tech-debt
description: Use when asked about technical debt, code health or refactoring priorities ("tech debt audit", "what should we refactor?", "where is the maintenance backlog worst?"), or when planning time for cleanup alongside feature work. Finds, scores and prioritizes debt into a phased plan.
---

# Tech Debt

> **Repo version first:** if this repository has `.agents/skills/tech-debt/SKILL.md`, follow that file instead of this one. It's tailored to the repository.

## Overview

Turn a vague sense that "the code is getting hard to work with" into a short, prioritized list of debt items, each with evidence, a score and a reason the business should care, plus a plan that fits alongside feature work.

## When to Use

- A tech debt audit of a repo, module or service
- Deciding what to refactor next, or how much cleanup to plan into a sprint
- Making the case for maintenance work to someone who prioritizes features

**Not for:**
- Fixing one piece of debt: use `code-simplification` (readability), `improve-codebase-architecture` (shallow modules, missing seams) or `deprecation-and-migration` (retiring old code).
- Slow code: use `performance-optimization`.

## Categories

| Type | Signals to look for | Risk if ignored |
|---|---|---|
| **Code** | Duplicated logic, long functions, magic numbers, `TODO`/`FIXME`/`HACK` | Bugs, slow changes |
| **Architecture** | Tangled modules, a data store that no longer fits, changes that touch many modules | Scaling limits, every feature costs more |
| **Test** | Untested hot spots, flaky or skipped tests, no integration tests at boundaries | Regressions ship |
| **Dependency** | Outdated or unmaintained packages, known vulnerabilities, pinned forks | Security holes, painful upgrades |
| **Documentation** | Missing runbooks, stale READMEs, knowledge only one person has | Slow onboarding, slow incident response |
| **Infrastructure** | Manual deploys, no monitoring, no infrastructure as code | Incidents, slow recovery |

## Process

1. **Scope.** Agree on the area (whole repo, a module, a service) and the goal (audit, next sprint's cleanup, a case for management).
2. **Collect evidence**, not impressions:
   - Hot spots: files that change often (`git log --format= --name-only | sort | uniq -c | sort -rn | head -30`) and are large or complex. Churn times complexity marks the debt that actually costs time.
   - Markers: grep for `TODO`, `FIXME`, `HACK`, `XXX`, disabled or skipped tests.
   - Dependencies: the package manager's outdated and audit commands.
   - Pain the team reports: ask the user what slows them down; read recent bug and incident reports.
3. **Write one item per problem:** what it is, where (paths), the category, and the evidence.
4. **Score each item** from 1 to 5:
   - **Impact:** how much it slows the team down
   - **Risk:** what happens if it stays
   - **Effort:** how hard the fix is

   **Priority = (Impact + Risk) × (6 − Effort).** Lower effort raises priority. Note the score's inputs, so others can argue with them.
5. **Plan in phases.** Group the top items into phases that fit beside feature work: quick wins first, then items that unblock planned features, then the large ones split into steps that each leave the code working.
6. **Report** as a table (item, category, impact, risk, effort, priority, business reason), then the phased plan. Offer to publish the top items to the issue tracker.

The issue tracker and triage label vocabulary are in `.agents/issue-tracker.md`. If that file doesn't exist, generate it first with the issue-tracker recipe: `.agents/references/issue-tracker.md` in the project, else `~/.agents/references/issue-tracker.md`. Publish only after the user agrees, labelled `needs-triage`.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Everything here is debt" | A list of 80 items gets ignored. Score them and show the top ten. |
| "This code is ugly, so it's high priority" | Ugly code nobody touches costs nothing. Churn is what makes debt expensive. |
| "We'll do a cleanup sprint later" | Later rarely comes. Plan debt work beside the features it slows down. |
| "The business reason is obvious" | Not to whoever decides. Write it in their terms: time, risk, incidents. |

## Red Flags

- Items without paths or evidence.
- Scores with no inputs shown.
- A plan that needs a feature freeze.
- Issues created without the user's agreement.

## Verification

- [ ] Every item has a location, a category and evidence.
- [ ] Every item has impact, risk, effort and the computed priority.
- [ ] The plan is phased and each phase leaves the code working.
- [ ] Nothing was published to the tracker without consent.
