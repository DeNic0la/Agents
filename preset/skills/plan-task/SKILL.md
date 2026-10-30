---
name: plan-task
description: Turn a draft task from .specs/tasks/draft/ into an implementation-ready plan (acceptance criteria, architecture, sub-task files and verifiable phases) through judged multi-agent stages.
---

# Plan task

> **Repo version first:** if this repository has `.agents/skills/plan-task/SKILL.md`, follow that file instead of this one. It's tailored to the repository.

You orchestrate. Specialist agents write every part of the plan, a `judge` scores each part, and you move the task from `draft/` to `todo/`. You don't read or write the plan's content yourself: that keeps your context free for the decisions only you make.

Read first: `.agents/references/specs-workflow.md` (formats), `model-tiers.md` and `judged-iteration.md` next to it (or under `~/.agents/references/` if the project has none). For a lightweight plan without agents, use the `planning-and-task-breakdown` skill instead.

## Arguments

| Argument | Default | Effect |
|---|---|---|
| `<task file>` | required | a draft in `.specs/tasks/draft/` (or `todo/` with `--refine`) |
| `--target-quality X.X` | `3.5` | `THRESHOLD` for every judge |
| `--max-iterations N` | `3` | retries per stage; then proceed with a warning |
| `--included-stages a,b` / `--skip a,b` | all | stages: `research`, `codebase analysis`, `business analysis`, `architecture synthesis`, `decomposition` |
| `--fast` | | business analysis and decomposition only, threshold 3.0, one iteration |
| `--one-shot` | | business analysis and decomposition only, no judges |
| `--skip-judges` | off | no quality gates |
| `--human-in-the-loop 2,3,4` | none | pause for review after these stages |
| `--continue [stage]` | | resume; without a stage, from the first incomplete one |
| `--refine` | off | re-run only the stages the user's edits affect |
| `--strict` | off | no discretion band (see `judged-iteration.md`) |
| `--model <tier>` | per policy | every agent at this tier |

## Workflow

Show the resolved configuration first, and track each stage and judge as a todo.

1. **Pre-flight.** Check the task file exists in the right folder; create missing `.specs/` folders. Read only the task's title, type and `depends_on`. With `--refine`, follow [Refine](#refine) to pick the starting stage; with `--continue`, find the first stage whose section is missing.
2. **Baseline tier.** Tier the whole task per `model-tiers.md` (by its title, type and the user's request) and say why. Every stage runs at the baseline tier except architecture synthesis, which runs one tier higher (capped at `deep`). A judge always runs at the tier of the stage it checks.
3. **Analysis, in parallel:** `researcher` (2a), `code-explorer` (2b) and `business-analyst` (2c), each followed by its judge. Wait for all three to pass.
4. **Architecture synthesis:** `software-architect` (3), then its judge.
5. **Decomposition:** `tech-lead` (4), then its judge. Pass it the agents available in this harness (from `preset/agents/`, plus a general-purpose agent) and the selection rules from `model-tiers.md`.
6. **Promote:** move the task file to `.specs/tasks/todo/`. Leave `.specs/sub-tasks/<task-name>/` where it is.
7. **Finish:** report (below).

[references/stages.md](references/stages.md) has each stage's brief, what to capture from its reply, and its judge rubric.

## Judging

Dispatch the `judge` agent with the artifact path, the one-line context and the rubric from `references/stages.md`, and nothing else: no agent output, no threshold. Decide per `judged-iteration.md` with this skill's values:

- `THRESHOLD` from `--target-quality`; `FLOOR` is `max(3.0, THRESHOLD - 1.0)`.
- On a fail, re-dispatch the stage with the judge's issues and report path, at the tier the escalation rules give.
- After `MAX_ITERATIONS`, **proceed** to the next stage and record a warning. Don't ask, unless the stage is a human checkpoint.
- If a stage's expected file or section is missing from its result, re-dispatch the stage before judging.

## Human checkpoints

After a listed stage passes, or after a retry before it's re-judged: show the stage, its score, its artifacts and the judge's main issues, and ask "Continue? [Y/n/feedback]". Feed any feedback into the next iteration; on "n", stop and report progress.

## Refine

The user edited a planned task and wants the plan updated.

1. Collect the `//` comments in the task file and its sub-task files as feedback. Find which sections the user edited: if the project's version control holds an earlier version of the file, diff against it; otherwise ask the user which sections they changed. No comments and no edits means nothing to do: say so and stop.
2. Find the earliest edited section and re-run from its stage onward: description or acceptance criteria → business analysis; architecture overview → architecture synthesis; implementation process or any sub-task file → decomposition. Skip research and codebase analysis unless asked.
3. Pass the edits and comments to each re-run agent, which keeps unchanged content.

## Rules

- Never record a PASS or ACCEPTED the judge's score doesn't support.
- Don't read the plan's files yourself, beyond the frontmatter and the diff in refine mode.
- Run agents in the foreground, parallel where the workflow allows.
- If a named agent isn't available, dispatch a general-purpose subagent briefed with that agent's role. Without subagents, run the stages yourself in order, writing each artifact before starting the next.

## Report

A table of the original and final location, title, type, research note, analysis file, number of steps and phases (each with its reviewer tier), peak parallel width and the sub-task folder. Then the configuration used, a quality-gate table per stage (score; PASS, ACCEPTED, PROCEEDED or SKIPPED), and the outstanding issues of accepted stages. End with next steps: review `.specs/tasks/todo/<file>`, add `//` comments and re-run with `--refine`, or start the `implement-task` skill.

## Supporting files

- [references/stages.md](references/stages.md): read before dispatching each stage or its judge.
