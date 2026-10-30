---
name: implement-task
description: Implement a planned task from .specs/tasks/todo/ step by step with one agent per step, one code review per phase, and a final definition-of-done check, then move it to done.
---

# Implement task

> **Repo version first:** if this repository has `.agents/skills/implement-task/SKILL.md`, follow that file instead of this one. It's tailored to the repository.

You orchestrate. One agent implements each step, one `code-reviewer` checks each phase, and you decide pass, fix or move on. Read only the task file; agents report what they did, and reviewers check it. Every file you read yourself takes context you need for the decisions that are yours, above all how to fix a failed phase.

Read first: `.agents/references/specs-workflow.md` (formats and markers), `model-tiers.md` and `judged-iteration.md` next to it (or under `~/.agents/references/`). The task must have been planned by the `plan-task` skill.

**Vocabulary.** A *step* is one sub-task file and the unit of dispatch. A *phase* (`#### Phase N` in the task file) groups steps, names a reviewer tier, and is the unit of review.

## Arguments

| Argument | Default | Effect |
|---|---|---|
| `<task file>` | auto | name or path; without one, the single task in `in-progress/`, else the single one in `todo/` (ask if several, stop if none) |
| `--target-quality X.X` | `4.0` | `THRESHOLD` for every phase review; never read from the task file |
| `--max-iterations N` | `3` | fix and re-review cycles per phase (`unlimited` allowed); then proceed with a warning |
| `--skip-reviews` | off | no reviews; phases are marked `[REVIEWED-SKIPPED]` |
| `--human-in-the-loop [Phase 1,Phase 3]` | none | pause after these phases' reviews (no list: after every phase) |
| `--continue` | | resume from the first phase marked neither `[REVIEWED]` nor `[REVIEWED-SKIPPED]` |
| `--refine` | off | re-verify from the earliest phase the user's own edits affect |
| `--strict` | off | no discretion band |
| `--model <tier>` | from task file | every agent, reviewer included, at this tier |

[references/modes.md](references/modes.md) has the details of `--continue` and `--refine`.

## Workflow

1. **Select and start.** Resolve the task file. If it's in `todo/`, move it to `in-progress/`; leave the sub-task folder in place. Show the resolved configuration.
2. **Load.** Read the task file once. From `### Parallelization Overview` take each step's phase, tier, agent, dependencies, parallel group and sub-task path; from `### Phase Overview`, each phase's steps and reviewer tier. Make a todo per step and per phase review.
3. **Per phase, in order:**
   1. Dispatch its steps in dependency order, all steps of a `Parallel with` group in one message, each with its agent at its tier (or `--model`), given the task file path and **its** sub-task file path ([brief](references/briefs.md#step)). Collect the reported file paths; don't read the files.
   2. Unless reviews are skipped, dispatch **one** `code-reviewer` for the phase with exactly the task file path, the phase identifier and the reported paths ([brief](references/briefs.md#review)), at the phase's reviewer tier.
   3. Decide on `combined_score` per `judged-iteration.md`, with `FLOOR` 3.0. A phase that doesn't build, lint or test green is never in the discretion band.
   4. **Pass:** mark its steps `[DONE]` and its heading `[REVIEWED]`, then hold any human checkpoint. **Fail:** follow [references/fixing.md](references/fixing.md), then re-review; after `MAX_ITERATIONS`, warn and continue.
   5. Never start a step of the next phase before this one is marked.
4. **Definition of done.** Dispatch a `developer` at `deep` (or `--model`) to verify every `**Definition of Done:**` item ([brief](references/briefs.md#definition-of-done)). For each failing item, dispatch a fix and verify again, until all pass.
5. **Finish.** Move the task file to `done/` and report (below).

## Human checkpoints

After a listed phase passes, or after a fix before the re-review: show the phase, its steps, reviewer tier, `combined_score`, the changed files and the High and Medium issues, and ask "Continue? [Y/n/feedback]". Pass feedback into the next fix or phase; on "n", stop and report progress.

## Rules

- Read only the task file, plus the sub-task sections `--refine` needs. Never read implementation output, reports or sub-task files to check or brief: pass paths.
- Review per phase, never per step, and never skip a review because a phase looks simple.
- The task file is a specification, not a log: you write only the `[DONE]`, `[REVIEWED]` and `[REVIEWED-SKIPPED]` markers.
- Run agents in the foreground, parallel where the plan says so.
- If a named agent isn't available, dispatch a general-purpose subagent briefed with that agent's role.
- If a sub-task file is missing, try `.specs/sub-tasks/<task-name>/<step-name>.md`; if that's missing too, stop and tell the user. Never invent a step.
- If a step fails, ask the user what would resolve it and re-dispatch with the answer; the phase review still runs once its steps are done.

## Report

The configuration used; a table of steps (phase, tier used, status, re-dispatches); a table of phase reviews (steps, reviewer tier, `combined_score`, iterations, PASS, ACCEPTED, MAX_ITER or SKIPPED); the fix decisions with their blast-radius reasoning; the definition-of-done results with evidence; and recommendations, including the outstanding issues of accepted phases.

## Supporting files

- [references/briefs.md](references/briefs.md): read before dispatching a step, a review, a fix or the definition-of-done check.
- [references/fixing.md](references/fixing.md): read when a phase review fails.
- [references/modes.md](references/modes.md): read when `--continue` or `--refine` is given.
