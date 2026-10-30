---
description: Recipe for a version of the implement skill tailored to this repository.
---

# implement (recipe)

Generate `.agents/skills/implement/`: a version of the build-QA-review loop that knows this repository's branches, checks and tracker.

## Generate

1. **Inspect the project.**
   - The full required gate: build, lint, type check and test commands from package scripts, `Makefile` or CI config, and which are slow. Note the focused test command for one file or test.
   - Branch naming and commit conventions (`git log`, `CONTRIBUTING.md`), and whether commits reference issues as `#<n>` or by path.
   - The issue tracker guide (`.agents/issue-tracker.md`): how to read an issue, list a parent's children with their blockers, and comment. If it's missing, generate it first with the issue-tracker recipe.
   - How to start a local preview for QA (dev server command, URL, ports, temporary config), if the project has one.
   - Where specs live (the tracker, `docs/`, `specs/`) and the test seams the codebase already uses.
2. **Write `SKILL.md`** with frontmatter `name: implement`, `license: MIT` and a one-line `description` for the human (it's user-invoked). Use spec fields only and no runtime controls; see the portable-skills concept. Leave out the "Repo version first" notice. Keep the global steps (pin the work, build in slices, QA in a fresh context, review and fix, follow-up verification, finish) and the readiness rule, with this repo's gate, branch convention, tracker operations and preview command filled in. Keep the "Follow-up verification" heading: other skills point to it.
3. **Copy `references/finding-questions.md`** from the global skill.
4. **Copy both adapters** from the global skill so it stays user-invoked: `agents/claude.yaml` and `agents/openai.yaml`.
5. **Keep it small.** `SKILL.md` stays under about 120 lines, with no placeholders.
6. **Finish.** Show the skill to the user for approval, run `agents sync` so Claude Code gets its copy, and commit it.
