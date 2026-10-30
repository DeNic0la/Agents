---
description: Recipe for a version of the analyze-issue skill tailored to this repository.
---

# analyze-issue (recipe)

Generate `.agents/skills/analyze-issue/`: a version of the issue-to-specification skill that knows this repository's tracker, structure and quality bar.

## Generate

1. **Inspect the project.**
   - Its issue tracker guide, `.agents/issue-tracker.md`. If it's missing, generate it first with the issue-tracker recipe.
   - Its structure: where each kind of change usually lives, and the shared utilities a spec should point to.
   - Its quality bar: `.agents/definition-of-done.md`, `.agents/testing-patterns.md`, instruction files, and any limits it enforces (file length, test-first, ...).
   - Which test levels the project actually has (unit, component, integration, end-to-end).
2. **Write `SKILL.md`** with frontmatter `name: analyze-issue` and a one-line `description` for the human (it's user-invoked). Use spec fields only and no runtime controls; see the portable-skills concept. Leave out the "Repo version first" notice. Keep the global skill's steps, with the spec template's test plan limited to this repo's test levels and its rules stated where the global skill says "the project's bar".
3. **Copy both adapters** from the global skill so it stays user-invoked: `agents/claude.yaml` and `agents/openai.yaml`.
4. **Finish.** Show the skill to the user for approval, run `agents sync` so Claude Code gets its copy, and commit it.
