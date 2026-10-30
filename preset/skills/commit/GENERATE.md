---
description: Recipe for a version of the commit skill tailored to this repository.
---

# commit (recipe)

Generate `.agents/skills/commit/`: a version of the commit skill that follows this repository's commit conventions and pre-commit checks.

## Generate

1. **Inspect the project.**
   - The commit subject style in `git log` (Conventional Commits or not, which types and scopes are in use), and any commit rules in `CONTRIBUTING.md`, `AGENTS.md` or a commitlint config.
   - Commit hooks (`.husky/`, `.pre-commit-config.yaml`, `lefthook.yml`) and what they run, so the skill expects them instead of working around them.
   - Local tool state the repo already ignores, and files that must never be committed (env files, generated output).
   - Whether committing on the default branch is allowed here. If the repo forbids it, say so in the skill and point to the `ship-pr` skill.
2. **Write `SKILL.md`** with frontmatter `name: commit` and a one-line `description` for the human. Use spec fields only and no runtime controls; see the portable-skills concept. Leave out the "Repo version first" notice. Keep the global steps: read everything, scan for secrets, ignore local tool state, stage explicit paths, write the message, commit and report briefly. Fill in this repo's types, scopes and sensitive paths.
3. **Copy both adapters** from the global skill: `agents/claude.yaml` (`disable-model-invocation: true`, `argument-hint`) and `agents/openai.yaml` (`allow_implicit_invocation: false`). The skill stays user-invoked.
4. **Keep it small.** `SKILL.md` stays under about 40 lines, with no placeholders.
5. **Finish.** Show the skill to the user for approval, run `agents sync` so Claude Code gets its copy, and commit it.
