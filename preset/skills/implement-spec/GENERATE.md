---
description: Recipe for a version of the implement-spec skill tailored to this repository.
---

# implement-spec (recipe)

Generate `.agents/skills/implement-spec/`: a version of the integration-branch workflow that knows this repository's branches, checks, shared resources and tracker.

## Generate

1. **Inspect the project.**
   - The default branch, branch naming, and where worktrees should go (a folder already ignored, or one to add to `.git/info/exclude`).
   - The full required gate and the focused test command, and which checks are slow.
   - Shared mutable resources the checks and preview use: databases or schemas, ports, build output, caches, remote targets, and how the project's configuration gives each worker its own (environment variables, per-worktree config).
   - The issue tracker guide (`.agents/issue-tracker.md`): reading a spec's children and their blockers, and whether work closes through PRs. If it's missing, generate it first with the issue-tracker recipe.
   - Where provider and consumer contracts live (OpenAPI files, schemas, shared types), if the repo has independently evolving parts.
2. **Write `SKILL.md`** with frontmatter `name: implement-spec`, `license: MIT` and a one-line `description` for the human (it's user-invoked). Use spec fields only and no runtime controls; see the portable-skills concept. Leave out the "Repo version first" notice. Keep the global steps (task graph, integration branch, build and integrate with one merge slot, verify the whole spec, hand off and clean up) and the readiness rule, with this repo's commands, worktree folder and contract locations filled in. Keep the attribution line.
3. **Write `references/parallel-resources.md`** from the shared `parallel-resources.md` reference (project `.agents/references/`, else `~/.agents/references/`), naming this repo's shared resources and how each worker gets its own.
4. **Copy both adapters** from the global skill so it stays user-invoked: `agents/claude.yaml` and `agents/openai.yaml`.
5. **Keep it small.** `SKILL.md` stays under about 120 lines, with no placeholders.
6. **Finish.** Show the skill to the user for approval, run `agents sync` so Claude Code gets its copy, and commit it.
