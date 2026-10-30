---
description: Recipe for a version of the improve-file-structure skill tailored to this repository.
---

# improve-file-structure (recipe)

Generate `.agents/skills/improve-file-structure/`: a version of the file-layout assessment that knows this repository's languages, frameworks, path contracts and checks.

## Generate

1. **Inspect the project.**
   - The languages and frameworks in use, and which of the global language references apply.
   - Workspace and package boundaries, entry points, and what is published (package exports, gem file lists, wheels, binaries).
   - Path contracts: framework discovery (routes, autoload roots), public import paths, config globs, resource paths, CI and scripts that name paths.
   - The build, type-check, test and packaging commands, and whether test discovery can be listed (to compare before and after).
   - Generated and vendored directories to exclude.
   - Any documented layout conventions in `AGENTS.md`, `CONTRIBUTING.md` or ADRs.
2. **Write `SKILL.md`** with frontmatter `name: improve-file-structure`, `license: MIT` and a one-line `description` for the human (it's user-invoked). Use spec fields only and no runtime controls; see the portable-skills concept. Leave out the "Repo version first" notice. Keep the global principles and the five steps. List this repo's path contracts and excluded directories in step 1, and its commands in the verification guidance.
3. **Copy the supporting files:** `references/migration-plan.md`, and only the language references this repo uses, with a short section added on this repo's own conventions.
4. **Copy both adapters** unchanged: `agents/claude.yaml` and `agents/openai.yaml`. They keep it user-invoked.
5. **Keep it small.** `SKILL.md` stays under about 150 lines, with no placeholders.
6. **Finish.** Show the skill to the user for approval, run `agents sync` so Claude Code gets its copy, and commit it.
