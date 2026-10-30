# Finish

All work ends in Finish, from any state. First name how it ended, then work through the checklist for that ending.

| Ending | When |
|---|---|
| **Done** | Review is clean and the user chose no (more) Polish |
| **Answered** | Explore, Discovery or Research ended without anything to build |
| **Abandoned** | the user stops the work ("forget it", "let's not") |
| **Paused** | the session ends, or the user switches topics mid-way |
| **Blocked** | the agent can't continue without something outside its reach |

**Answered** needs only one step: the off-goal notes, if there are any. Everything below is for the other four endings.

## Checklist

| Step | Done | Abandoned | Paused / Blocked |
|---|---|---|---|
| Summary: what was reached, which files changed | ✓ | ✓ | ✓ |
| Working tree: no half-applied edits, and a clear statement of what is uncommitted | ✓ | ✓, and ask whether to revert or keep; never revert without asking | ✓ |
| Task: confirm it's in `.specs/tasks/done/` | ✓ | – | – |
| Task: ask whether to delete it (the file and its `sub-tasks/` folder) or leave it in `draft/` or `todo/` | – | ✓ | – |
| Task: leave it where it is, with markers and checkboxes only for verified work (the `checkpoint` skill) | – | – | ✓ |
| Handoff document in the OS temp folder, the only place the lifecycle state may be written (the `handoff` skill) | – | – | ✓ |
| Blocker: what exactly is missing and who can provide it | – | – | ✓ blocked only |
| Off-goal notes: list them, one line each, and offer to capture any as a draft task (`add-task`) | ✓ | ✓ | ✓ |
| Ship: offer a commit, a PR or a merge; the user decides | ✓ | – | offer a commit |
| Retro (the `retro` skill), only if something went badly | optional | optional | – |

A trivial change (rule 9) has no task, so the task rows don't apply to it.

Finish changes nothing beyond the task's folder in `.specs/tasks/` (see tasks.md), and a commit, PR or revert the user chose.
