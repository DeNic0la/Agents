# Spec-driven task workflow

The contract shared by the `add-task`, `plan-task`, `implement-task` and `do-in-steps` skills and the agents they dispatch. A task moves through folders under `.specs/`; its file is the specification, never a log.

## Layout

| Path | Holds |
|---|---|
| `.specs/tasks/draft/` | new tasks, not yet planned |
| `.specs/tasks/todo/` | planned tasks, ready to implement |
| `.specs/tasks/in-progress/` | tasks being implemented |
| `.specs/tasks/done/` | finished tasks |
| `.specs/sub-tasks/<task-name>/` | one file per implementation step; never moves |
| `.specs/analysis/` | codebase impact analyses |
| `.specs/research/` | research notes, reusable across tasks |
| `.specs/reports/` | judge and review reports |
| `.specs/scratchpad/` | agents' working notes |

Whether `.specs/` is tracked by version control is up to each project; nothing here depends on it. Create missing folders before writing into them. Move task files between the status folders; the sub-task folder stays where planning created it, so recorded paths keep resolving.

**Scratchpad:** an agent that needs working notes writes them to `.specs/scratchpad/<8 random hex characters>.md` and returns the path, not the notes.

## Task file

Named `<short-name>.<type>.md`: the title lowercased and hyphenated, 3-5 words, unique across all four status folders. Types: `feature`, `bug`, `refactor`, `test`, `docs`, `chore`, `ci`. `<task-name>` is the filename without `.md`.

```markdown
---
title: <action-oriented title, starting with a verb>
depends_on: <task files this depends on; omit the key if none>
---

## Initial User Prompt
<the user's request, verbatim>

# Description                  ← business-analyst
## Acceptance Criteria          ← business-analyst
## Architecture Overview        ← software-architect
## Implementation Process       ← tech-lead
```

A draft has only the frontmatter, the prompt and `## Description` holding `// Will be filled in future stages by business analyst`.

**`## Acceptance Criteria`** holds six sub-blocks, in this order, mixing business and technical criteria:

1. `**Checklist:**` — table `| ID | Question | Category | Importance |`; each row a yes/no question; IDs `CK-n` (principle) or `HR-n` (hard rule).
2. `**Regular Checks:**` — checkboxes using the project's real build, lint and test commands.
3. `**Rubric:**` — table `| Criterion | Weight |`, task-specific criteria, weights summing to 1.0.
4. `**Rubric Score Definitions:**` — one `###` section per criterion, ending in an `Anchors` list: `score_2` (a concrete excerpt that clearly fails), `score_4` (one that clearly satisfies) and `contrast` (the single observable difference between them). No 1-5 bins.
5. `**Test Strategy:**` — criticality, a test matrix `| Type | Size | Framework | Dependencies | Gate |`, and `Test Cases to Cover` grouped under `#### CK-n:` headings as `- [type] description`. If nothing is testable, say so and why.
6. `**Definition of Done:**` — checkboxes derived from the criteria above.

**`## Implementation Process`** holds:

- the execution directive: one agent per step, parallel steps in parallel, each given the task file and its sub-task file, at its own model tier and agent, implementing exactly that step; one review per phase at the phase's reviewer tier;
- `### Parallelization Overview` — an ASCII dependency diagram with phase boundaries, and the table `| Step | Phase | Model | Agent | Depends on | Parallel with | Sub-Task File |`;
- `### Phase Overview` — per `#### Phase N[: title]`: `Steps:`, `Reviewer model:`, and the acceptance criteria due at that milestone as `Checklist items:` (IDs) and `Rubrics:` (criterion names).

A task file never carries thresholds, scores, judge counts or review notes. Scoring configuration belongs to the orchestrator.

## Sub-task file

`.specs/sub-tasks/<task-name>/<NN>-<step-slug>.md` (parallel siblings get letters: `02a`, `02b`). The **step name** is the basename without `.md`.

```markdown
# Step NN: <title>

**Task File:** <path>
**Phase:** Phase N
**Model:** fast | standard | deep
**Agent:** <agent name>
**Depends on:** <step names or None>
**Parallel with:** <step names or None>
**Note:** <or None>

**Goal:** <one sentence>

<step description: every path, symbol and decision it builds on, so it reads standalone>

#### Expected Output
#### Success Criteria
#### Subtasks          (includes writing this step's tests)
#### Blockers & Risks  (table: item, impact, likelihood, resolution or mitigation)
```

## Markers

| Marker | Where | Set by |
|---|---|---|
| `[DONE]` | next to a step name in the Parallelization Overview | implement-task, after the step reports completion |
| `[REVIEWED]` | on a `#### Phase N` heading | implement-task, after the phase review passes |
| `[REVIEWED-SKIPPED]` | on a `#### Phase N` heading | implement-task, when reviews were skipped |
| `[X]` | subtask, success-criteria and Definition of Done checkboxes | the agent that verified the item |
| `// <comment>` | anywhere in a task or sub-task file | the user, as feedback for a `--refine` run |
