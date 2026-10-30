# Solution doc format

## Reuse the corpus first

If `docs/solutions/` already has docs, reuse the category folders and the open-vocabulary values (`component`, `root_cause`, `tags`) that the docs in the same area use. That way searches that already find them will find the new doc too. Fall back to the suggestions below only when the folder is empty or the area isn't covered yet.

## Frontmatter

```yaml
---
title: N+1 query in brief generation
date: 2026-10-30
problem_type: performance_issue   # closed list, below
component: brief-generation       # open vocabulary
tags: [orm, n-plus-one, batching]
severity: high                    # critical | high | medium | low
# bug track only:
root_cause: ORM lazy-loads authors per brief  # open vocabulary
resolution_type: code_fix         # closed list, below
# optional:
retire_when: upstream fixes issue #1234 - check the changelog of orm >= 5.2
last_updated: 2026-11-02          # set when updating an existing doc
related: [docs/solutions/performance-issues/n-plus-one-digest.md]
---
```

`problem_type` decides the track, and the default category folder is its plural in kebab-case (`performance_issue` → `performance-issues/`):

- **Bug track:** `build_error`, `test_failure`, `runtime_error`, `performance_issue`, `database_issue`, `security_issue`, `ui_bug`, `integration_issue`, `logic_error`
- **Knowledge track:** `architecture_pattern`, `design_pattern`, `tooling_decision`, `convention`, `workflow_issue`, `developer_experience`, `documentation_gap`, `best_practice`

`resolution_type` is one of: `code_fix`, `config_change`, `dependency_update`, `environment_setup`, `workaround`, `documentation`, `test_fix`.

Use `retire_when` only when the learning holds only while something outside the repo stays as it is (an open upstream bug, a tool or platform version, a dependency's behavior). Name the change that would retire it and how to check for it without touching the repo. Most learnings don't need it.

The filename is a short kebab-case name for the problem, such as `n-plus-one-brief-generation.md`.

## Bug-track body

```markdown
# <title>

## Symptoms
What was observed: errors, exact messages, metrics, where and when.

## What Didn't Work
Each approach tried, and why it failed or what it ruled out.

## Solution
The fix, with before/after code where it helps.

## Why This Works
The root cause and how the fix addresses it. Cite the defining source lines.

## Prevention
The test, lint, assertion or habit that stops it from coming back.
```

## Knowledge-track body

```markdown
# <title>

## Context
The situation that forced the decision, including approaches that were rejected.

## Guidance
What to do here, stated as a rule.

## Why This Matters
What goes wrong without it.

## When to Apply
Where the guidance applies, and where it doesn't.

## Examples
A short good/bad pair or a real reference from this repo.
```

Cite repo paths in backticks (`src/brief/query.ts:42`) and commits as SHAs, so `scripts/check-doc.sh` can verify them.
