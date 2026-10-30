---
description: Recipe for a version of the implement-task skill tailored to this repository.
---

# implement-task (recipe)

Generate `.agents/skills/implement-task/`: a version of the step-and-phase implementation workflow that knows this repository's commands, agents and quality bar.

## Generate

1. **Inspect the project.**
   - Its build, lint and test commands and CI checks: what "green" means here.
   - Its definition of done (`.agents/definition-of-done.md`) and testing patterns, which the definition-of-done check should honor.
   - Which agents are installed for the project beyond the preset's, and any project reviewer agent to use instead of `code-reviewer`.
   - Its preferred threshold and iteration limit, and git conventions (whether agents may commit per phase).
2. **Add the shared references** with `agents add references/specs-workflow.md references/model-tiers.md references/judged-iteration.md`.
3. **Write `SKILL.md`** with frontmatter `name: implement-task` and a one-line `description` for the human (it's user-invoked). Use spec fields only and no runtime controls; see the portable-skills concept. Leave out the "Repo version first" notice. Keep the global skill's sections (vocabulary, arguments, workflow, human checkpoints, rules, report), with this repo's commands and defaults filled in.
4. **Copy `references/briefs.md`, `fixing.md` and `modes.md`**, adapting the briefs to name this repo's commands.
5. **Copy both adapters** from the global skill so it stays user-invoked: `agents/claude.yaml` and `agents/openai.yaml`.
6. **Keep it small.** `SKILL.md` stays under about 120 lines, with no placeholders.
7. **Finish.** Show the skill to the user for approval, run `agents sync` so Claude Code gets its copy, and commit it.
