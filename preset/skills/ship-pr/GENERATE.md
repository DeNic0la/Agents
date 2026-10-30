---
description: Recipe for a version of the ship-pr skill tailored to this repository.
---

# ship-pr (recipe)

Generate `.agents/skills/ship-pr/`: a version of the ship-pr skill that knows this repository's code host, branch rules, checks and deploy workflows.

## Generate

1. **Inspect the project.**
   - The code host and its CLI (`gh`, `glab`). If it isn't GitHub, translate every `gh` command to that host's equivalent and set `compatibility` to match.
   - The default branch, branch naming rules, branch protections and required checks.
   - Commit conventions (`git log`, commitlint, `CONTRIBUTING.md`) and hooks, especially slow pre-push hooks and how long they take.
   - The pull request template, and whether it or the `pr` skill shapes the body.
   - CI and deployment workflows (`.github/workflows/`, external CI): which run on PRs, which run after a merge, and which need a manual approval.
   - The merge methods the repo allows. Keep squash unless the repo forbids it.
   - The issue tracker guide in `.agents/issue-tracker.md`, for reading and closing issues.
2. **Write `SKILL.md`** with frontmatter `name: ship-pr` and a one-line `description` for the human. Use spec fields only and no runtime controls; see the portable-skills concept. Leave out the "Repo version first" notice. Keep the global steps and their gates: read everything, secrets scan, leave the default branch, stage, commit, push, open the PR, CI gate, merge on green at the checked head, close issues, verify post-merge workflows, report. Name this repo's required checks and post-merge workflows explicitly.
3. **Copy `references/ci-recovery.md`** from the global skill. Keep the shared budget (two repair cycles, one transient rerun) unless the user asks for a different one, and add this repo's known flaky jobs or transient failure signatures.
4. **Copy both adapters** from the global skill: `agents/claude.yaml` (`disable-model-invocation: true`, `argument-hint`) and `agents/openai.yaml` (`allow_implicit_invocation: false`). The skill stays user-invoked.
5. **Keep it small.** `SKILL.md` stays under about 80 lines, with no placeholders.
6. **Finish.** Show the skill to the user for approval, run `agents sync` so Claude Code gets its copy, and commit it.
