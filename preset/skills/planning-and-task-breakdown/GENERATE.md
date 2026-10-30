---
description: Recipe for a version of the planning-and-task-breakdown skill tailored to this repository.
---

# planning-and-task-breakdown (recipe)

Generate `.agents/skills/planning-and-task-breakdown/`: a version of the planning skill that uses this repository's real commands, layers and task tracking.

## Generate

1. **Inspect the project.**
   - The architecture layers and how a feature flows through them, to draw a realistic dependency graph and vertical slices.
   - The real commands for focused tests, the full test suite and the build.
   - Where tasks are tracked: `tasks/`, an issue tracker named in `AGENTS.md` or `.agents/issue-tracker.md`, or nothing yet.
   - Whether `.agents/definition-of-done.md` exists.
   - What tends to be risky here (migrations, shared contracts, deploys) and what can safely run in parallel.
2. **Write `SKILL.md`** with frontmatter `name: planning-and-task-breakdown` and a `description` that leads with when to use it. Use spec fields only and no runtime controls; see the portable-skills concept. Leave out the "Repo version first" notice. Sections:
   - **Overview** and **When to Use:** decompose a spec or approved design into small, verifiable tasks. Not for single-file changes with obvious scope.
   - **Process:** plan read-only; draw the dependency graph using this repo's layers; slice vertically with an example from this product; write tasks; order them with checkpoints every 2-3 tasks and risky work first.
   - **Task sizing** table and the rules for breaking a task down further.
   - **Output files:** the plan document and the task list target this repo uses, and the rule to never overwrite an incomplete plan for different work without asking.
   - **Parallelization**, **Common Rationalizations**, **Red Flags** and a **Verification** checklist, kept to the items that apply here.
3. **Put details in supporting files** under `references/`, each with a "read when" line in `SKILL.md`:
   - the task, checkpoint and plan templates, with verification lines naming this repo's real commands
4. **Keep it small.** `SKILL.md` stays under about 200 lines, with no placeholders.
5. **Finish.** Show the skill to the user for approval, run `agents sync` so Claude Code gets its copy, and commit it.
