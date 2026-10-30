---
description: Recipe for a version of the do-in-steps skill tailored to this repository.
---

# do-in-steps (recipe)

Generate `.agents/skills/do-in-steps/`: a version of the sequential, judge-verified step runner that knows this repository's layers, agents and checks.

## Generate

1. **Inspect the project.**
   - Its layers and the usual order of a change (for example schema → repository → service → API → client), so decomposition follows them.
   - Its build, lint and test commands, which implementers and judges should run.
   - Which agents are installed for the project beyond the preset's.
   - What earns the `deep` tier here: its critical domains.
2. **Add the shared references** with `agents add references/model-tiers.md references/judged-iteration.md`.
3. **Write `SKILL.md`** with frontmatter `name: do-in-steps` and a one-line `description` for the human (it's user-invoked). Use spec fields only and no runtime controls; see the portable-skills concept. Leave out the "Repo version first" notice. Keep the global skill's sections (arguments, workflow, passing context forward, failures, report), with this repo's decomposition shapes and critical domains.
4. **Copy `references/briefs.md`**, adding this repo's commands to the implementer's constraints.
5. **Copy both adapters** from the global skill so it stays user-invoked: `agents/claude.yaml` and `agents/openai.yaml`.
6. **Keep it small.** `SKILL.md` stays under about 100 lines, with no placeholders.
7. **Finish.** Show the skill to the user for approval, run `agents sync` so Claude Code gets its copy, and commit it.
