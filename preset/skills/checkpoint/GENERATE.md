---
description: Recipe for a version of the checkpoint skill tailored to this repository.
---

# checkpoint (recipe)

Generate `.agents/skills/checkpoint/`: a version of the checkpoint skill that updates this repository's own work tracking and learnings before a context reset.

## Generate

1. **Inspect the project.**
   - How work is tracked: `.specs/tasks/` (spec workflow), a tasks file, a `dev/active/` or similar folder, or an issue tracker (`.agents/issue-tracker.md`). Note the exact paths and formats, including how an item is marked done.
   - Where learnings and decisions go: `docs/solutions/` (`compound`), `GLOSSARY.md` and ADRs (`domain-modeling`), or other docs the project keeps.
   - The commands that verify work here (build, lint, test), from `.agents/definition-of-done.md` if it exists.
2. **Write `SKILL.md`** with frontmatter `name: checkpoint` and a one-line `description` for the human (it's user-invoked). Use spec fields only and no runtime controls; see the portable-skills concept. Leave out the "Repo version first" notice. Keep the global version's five steps (take stock, update tracking, record learnings, write the session state with `handoff`, report), with step 2 naming only this project's tracking and its format, and step 4 listing this project's verify commands.
3. **Copy the adapters** `agents/claude.yaml` and `agents/openai.yaml` from the global skill, so it stays user-invoked.
4. **Keep it small.** `SKILL.md` stays under about 60 lines, with no placeholders.
5. **Finish.** Show the skill to the user for approval, run `agents sync` so Claude Code gets its copy, and commit it.
