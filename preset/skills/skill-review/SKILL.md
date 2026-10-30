---
name: skill-review
description: Use when asked to review, audit or maintain a collection of skills ("review skills", "skill audit", "check skills"), after a batch of tasks that used several skills, or when a skill hit friction (a step failed, a workaround was needed). Finds stale steps, missing gotchas, unrecorded lessons, gaps and duplicates, and proposes minimal patches.
license: MIT
---

# Skill Review

## Overview

Skills are procedural memory: they go stale as tools, paths and workflows change, and lessons learned while using them often never flow back. This skill sweeps a set of skills, finds what's wrong or missing, and proposes minimal patches.

It maintains existing skills. To prove a skill changes agent behavior (baselines, pressure tests), use the `writing-skills` skill. For how to write or restructure one, use the `writing-for-agents` skill.

## When to Use

- The user asks to review, audit or tidy their skills.
- After a series of tasks that used several skills.
- A skill just hit friction: a step failed, a command was wrong, a workaround was needed. Then review only that skill (step 3 onwards), right away.
- As routine maintenance, every couple of weeks.

## Where skills live

Find the skills in scope: the project's `.agents/skills/` (and `.claude/skills/` if it's not just a mirror), the user's global skills (`~/.agents/skills/`, `~/.claude/skills/`), or `preset/skills/` when working in a skills preset. If a skill is installed as a link into a preset or plugin repository, patch the source, not the installed copy. If the repository has a tailored version of a skill (`.agents/skills/<name>/`), that's the one to patch for repo-specific lessons.

## Process

1. **Inventory.** List the skills with their last change, newest first. `git log -1 --format=%cs -- <path>/SKILL.md` works on every platform; fall back to the file's modified time outside git. Read the frontmatter and the first lines of each to know its scope.
2. **Collect lessons that never flowed back.** Read whatever records lessons here: memory files, `docs/solutions/` (from the `compound` skill), gotchas in the instruction files, notes from the current session. For each lesson: does it belong to a skill? Is it already in that skill's steps or `## Gotchas` section? If not, it's a patch.
3. **Check for staleness.** For each skill:

   | Check | How |
   |---|---|
   | Paths valid? | Confirm every path the skill names exists. |
   | Commands valid? | Confirm CLIs and scripts it names exist and take those arguments. |
   | Steps still accurate? | Compare with how the work was actually done in recent git history or this session. |
   | Gotchas recorded? | A skill used many times with no gotchas has probably lost its lessons. |
   | Cross-references valid? | Every skill it names by name still exists. |

4. **Check for gaps.** Look at recent history (`git log --oneline -30`, recent sessions). A multi-step workflow done by hand three or more times with no skill is a candidate for a new one. Propose it; write it with the `writing-for-agents` skill.
5. **Check for duplicates.** Two skills covering the same ground get merged or given sharper, distinct descriptions that point at each other.
6. **Report and propose.** A table, then the proposed patches as diffs:

   ```
   | Skill | Status | Proposed action |
   |---|---|---|
   | deploy | Stale | Fix the renamed script path in step 2 |
   | release-notes | Gotcha missing | Add: changelog must be regenerated after a rebase |
   | db-reset | New | Repeated manual workflow, 4 times this month |
   | code-review | OK | none |
   ```

7. **Apply what the user approves.** Then run the collection's validation if it has one (in this preset, `agents check`), and offer to commit with a message like `chore: skill review, update N skills`.

## Rules

- **Read before you edit.** Never patch a skill you haven't read completely.
- **Minimal patches.** Fix what's wrong or missing; don't restructure a skill that works.
- **Keep each skill's voice.** Don't homogenize style across skills.
- **Lessons go where they apply.** A lesson about one skill goes in that skill (its steps, or a `## Gotchas` section). A lesson that spans skills goes in the instruction files or memory, not copied into each skill. A user's personal preference goes through the `task-observer` skill.
- **Follow the collection's rules.** If the skills follow concepts (`~/.agents/concepts/INDEX.md`, or `.agents/concepts/` in a project), patches must too: frontmatter fields, the "Repo version first" notice, references one level deep.

## The always-on loop

The review catches what slipped through. Between reviews, the same loop runs during normal work, and the user may want it in their instruction files (use the `task-observer` or `agents-md-improver` skill to add it):

- **Fix and patch:** when a skill hits friction, fix the problem, then propose the patch to the skill so the next run doesn't hit it.
- **Check lessons first:** before running a skill, check its gotchas and any related memory, and apply them.
- **Spot gaps:** when the same multi-step workflow repeats across sessions with no skill, propose one.

## Red Flags

- A patch to a skill you haven't read.
- A working skill rewritten end to end during a review.
- The same lesson pasted into several skills.
- Patches applied or committed without the user's approval.
- An installed copy patched while its source stays unchanged.

## Verification

- [ ] Every skill in scope was inventoried and checked against the staleness table.
- [ ] Every lesson found was matched to a skill, recorded elsewhere, or dropped with a reason.
- [ ] The report lists every skill with a status.
- [ ] Applied patches were approved, are minimal, and pass the collection's validation.
