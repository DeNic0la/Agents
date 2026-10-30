---
description: Recipe for a version of the plan-task skill tailored to this repository.
---

# plan-task (recipe)

Generate `.agents/skills/plan-task/`: a version of the multi-agent planning workflow that knows this repository's stack, guidelines, commands and agents.

## Generate

1. **Inspect the project.**
   - Its build, lint and test commands, guideline files (`AGENTS.md`, contributing guides, `.agents/definition-of-done.md`, `.agents/testing-patterns.md`) and where docs and research already live.
   - Which agents are installed for the project (`.claude/agents/`, `.github/agents/`, `.codex/agents/`) beyond the preset's, so decomposition can assign them.
   - What usually earns the `deep` tier here: the project's critical domains (auth, billing, data integrity, ...).
   - Which stages the project wants by default (a small library may skip research), and its preferred threshold.
2. **Add the shared references** with `agents add references/specs-workflow.md references/model-tiers.md references/judged-iteration.md`.
3. **Write `SKILL.md`** with frontmatter `name: plan-task` and a one-line `description` for the human (it's user-invoked). Use spec fields only and no runtime controls; see the portable-skills concept. Leave out the "Repo version first" notice. Keep the global skill's sections (arguments, workflow, judging, human checkpoints, refine, rules, report), with this repo's defaults and critical domains filled in.
4. **Copy `references/stages.md`** and adapt the rubrics where this project has its own standards, for example a guidelines criterion naming its guideline files.
5. **Copy both adapters** from the global skill so it stays user-invoked: `agents/claude.yaml` and `agents/openai.yaml`.
6. **Keep it small.** `SKILL.md` stays under about 120 lines, with no placeholders.
7. **Finish.** Show the skill to the user for approval, run `agents sync` so Claude Code gets its copy, and commit it.
