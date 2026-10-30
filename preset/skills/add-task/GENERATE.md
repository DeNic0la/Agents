---
description: Recipe for a version of the add-task skill tailored to this repository.
---

# add-task (recipe)

Generate `.agents/skills/add-task/`: a version of the draft-task capture that knows this repository's task conventions.

## Generate

1. **Inspect the project.**
   - Whether `.specs/` exists, and any naming or type conventions already used in `.specs/tasks/`.
   - Whether the project tracks work elsewhere too (`.agents/issue-tracker.md`, issue references in commits), so a draft can link its issue.
2. **Add the shared reference** with `agents add references/specs-workflow.md`, so `.agents/references/specs-workflow.md` resolves in the project.
3. **Write `SKILL.md`** with frontmatter `name: add-task` and a one-line `description` for the human (it's user-invoked). Use spec fields only and no runtime controls; see the portable-skills concept. Leave out the "Repo version first" notice. Keep the steps of the global skill (folders, read the request, title, type, file name, write the draft), adding this repo's type vocabulary or linking convention where it differs.
4. **Copy both adapters** from the global skill so it stays user-invoked: `agents/claude.yaml` and `agents/openai.yaml`.
5. **Finish.** Show the skill to the user for approval, run `agents sync` so Claude Code gets its copy, and commit it.
