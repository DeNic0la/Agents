---
name: do-in-steps
description: Run one complex task as ordered, dependent steps, each done by a fresh subagent with context passed forward and checked by an independent judge before the next step starts.
---

# Do in steps

> **Repo version first:** if this repository has `.agents/skills/do-in-steps/SKILL.md`, follow that file instead of this one. It's tailored to the repository.

You orchestrate a chain of steps where later ones build on earlier ones. You decompose the task, pick an agent and tier per step, and pass a short summary forward. Subagents do all the work: you don't read implementation files, write code or run the task's commands, because every file you read pushes the chain's state out of your context. For a planned task with a task file, use the `implement-task` skill instead.

Read first: `model-tiers.md` and `judged-iteration.md` in `.agents/references/` (or `~/.agents/references/`).

## Arguments

| Argument | Default | Effect |
|---|---|---|
| `<task>` | required | what to do, in free text |
| `--strict` | off | no discretion band: a step passes only at 4.0 |
| `--model <tier>` | per step | every agent (implementer, meta-judge, judge) at this tier |

Strip the flags from the task text before passing it to any agent.

## Workflow

1. **Decompose.** Work out the objective and constraints, where the work naturally divides (data, contracts, implementation, callers, tests, docs), and what must come before what: does B need A's output, or would doing B first mean redoing it? Give each step an input, an action, an output and how to tell it succeeded. Common shapes: interface → implementations → consumers; core logic → integration → API; data → business → API → client. Show the steps as a table (step, subtask, depends on, complexity, output) with a dependency line.
2. **Choose per step.** Assess scope, complexity and risk, pick the tier per `model-tiers.md`, and state it with a one-line reason. Use a specialist agent (`developer`, `tech-writer`, `software-architect`, ...) when the step clearly benefits and isn't `fast`-tier; otherwise a general-purpose agent. Apply role pairing for the meta-judge's tier. Show a table (step, tier, agent, reason).
3. **Run each step in order:**
   1. In **one** message, dispatch the `meta-judge` first and the implementer second ([briefs](references/briefs.md)). The meta-judge runs first so it sees the files before they change.
   2. When both return, dispatch the `judge` with the meta-judge's specification exactly as returned, unedited, plus the step's requirements, the implementer's changed files and its "context for next steps", and the [pre-existing changes](references/briefs.md#pre-existing-changes). Give the judge a report name: `<task-name>-step-<N>-<YYYY-MM-DD>` (create `.specs/reports/` if needed).
   3. Decide on the judge's score per `judged-iteration.md`, with `THRESHOLD` 4.0 and `FLOOR` 3.0, at most 3 retries per step. Retries reuse the step's specification; never re-run the meta-judge within a step, and give each new step a new one.
   4. **Pass:** add the step's summary to the context for later steps, with any improvements the judge suggested as optional. **Out of retries:** stop, and escalate to the user (below). Never build on a failed step.
4. **Report** (below).

## Passing context forward

After each step, keep only what later steps need: the files changed (paths, not contents), key changes, new interfaces, decisions, and warnings. At most about 200 words per step; past about 500 words in total, summarize older steps harder. Agents can read files themselves when they need detail.

## When a step fails

- **Out of retries:** show the requirements, every attempt's score and issues, the persistent issues and the judges' report paths. Offer: more guidance and retry, one tier higher (unless already `deep`), changed requirements, skipping the step if it's optional, or stopping with partial progress. Wait for the user's choice.
- **Missing context:** don't guess what an earlier step produced. Check its output and judge report, or dispatch an agent to extract what's missing.
- **Steps conflict:** stop at the conflict. Reorder if a dependency was missed, merge the two steps, or add a reconciliation step.

## Report

The task, the number of steps and agents, and whether strict mode was on. A table per step: subtask, tier (`start → final` when escalated), judge score, retries, status (PASS, ACCEPTED or FAILED). Then the files changed per step, key decisions, how the steps connected, a table of initial and final scores per step, and follow-ups: the judges' suggestions, outstanding nitpicks from accepted steps, and any manual checks to run.

## Supporting files

- [references/briefs.md](references/briefs.md): read before dispatching an implementer, meta-judge, judge or retry.
