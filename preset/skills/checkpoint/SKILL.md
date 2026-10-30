---
name: checkpoint
description: Save the session's progress where it survives a context reset, before compaction or a break.
---

# Checkpoint

> **Repo version first:** if this repository has `.agents/skills/checkpoint/SKILL.md`, follow that file instead of this one. It's tailored to the repository.

The context is about to be compacted or reset. Write down what would be hard to rediscover from the code alone, in the places that already exist for it, so this session or the next one continues without re-investigating.

If the user passed arguments, they name the work or tasks to focus on; otherwise cover everything in progress.

## Steps

1. **Take stock.** List what was worked on this session, its current state, and what's uncommitted (`git status`, `git diff --stat`). Note each decision made, each problem solved, and anything discovered about the system.
2. **Update the work tracking.** Bring the project's own tracking up to date, in its own format:
   - **Spec workflow** (`.specs/tasks/in-progress/`): set the markers and checkboxes `.agents/references/specs-workflow.md` (or `~/.agents/references/specs-workflow.md`) allows, for work that is verified: `[DONE]` on finished steps, `[X]` on verified items. A task file is a specification, never a log: write no session notes into it.
   - **Other task docs** the project keeps (a tasks file, a `dev/active/` folder, an issue): mark finished items, add tasks discovered, update the status of in-progress ones, in the format they already use.
   - **No tracking at all:** don't create any; step 4 carries the state.
3. **Record lasting learnings.** For a problem solved whose reasoning isn't recoverable from the code (root cause, dead ends, a non-obvious invariant), use the `compound` skill. For a decision about the domain or architecture, use the `domain-modeling` skill. Skip what the code or commits already say.
4. **Write the session state** with the `handoff` skill, focused on continuing this work:
   - what was being done when the checkpoint was taken, and the exact state of anything partly finished;
   - the file and location being edited, and the goal of the current change;
   - uncommitted changes and what they're for;
   - commands to run on restart, and the commands that verify the work;
   - temporary workarounds that still need a proper fix;
   - pointers (paths) to the tracking and learnings updated in steps 2 and 3, instead of repeating them.
5. **Report** in a few lines: what was updated where, and the handoff document's path.

Prefer what would be hard to reconstruct over what's easy to see. Redact secrets.
