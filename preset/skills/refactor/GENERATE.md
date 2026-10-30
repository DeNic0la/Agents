---
description: Recipe for a version of the refactor skill tailored to this repository.
---

# refactor (recipe)

Generate `.agents/skills/refactor/`: a version of the refactoring workflow that knows this repository's tests, checks, conventions and hot spots.

## Generate

1. **Inspect the project.**
   - The test commands: one file, one module, the full suite; and lint, type-check and build commands.
   - Where tests live and how they map to source files, so the coverage check in step 4 can find them.
   - Complexity or duplication tools already configured (linters with complexity rules, code-climate style tools).
   - The current hot spots, using `references/hotspots.md` from the global skill, as the default project-scope candidates.
   - Commit message conventions (`refactor:`, `test:`, or the repo's own).
   - The issue tracker guide (`.agents/issue-tracker.md`).
   - Business-logic areas where the test gate is critical: money, validation, permissions, state machines.
2. **Write `SKILL.md`** with frontmatter `name: refactor`, `license: MIT` and a one-line `description` for the human (it's user-invoked). Use spec fields only and no runtime controls; see the portable-skills concept. Leave out the "Repo version first" notice. Keep the global process: scope, assess with the Clean default, plan with approval, coverage gate, refactor under the ground rules, verify that no test changed. Name this repo's commands and commit prefixes.
3. **Copy the supporting files** from the global skill: `references/`, `CREDITS.md` and `NOTICE`, unchanged except for this repo's commands in `references/hotspots.md` and `references/mechanical-sweeps.md` (the language's rename tooling, `ast-grep` languages).
4. **Copy both adapters** unchanged: `agents/claude.yaml` and `agents/openai.yaml`. They keep it user-invoked.
5. **Keep it small.** `SKILL.md` stays under about 150 lines, with no placeholders.
6. **Finish.** Show the skill to the user for approval, run `agents sync` so Claude Code gets its copy, and commit it.
