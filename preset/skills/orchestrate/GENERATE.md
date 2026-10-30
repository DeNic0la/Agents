---
description: Recipe for a version of the orchestrate skill tailored to this repository.
---

# orchestrate (recipe)

Generate `.agents/skills/orchestrate/`: a version of the unattended issue loop that knows this repository's tracker, labels, branches, shared resources and checks.

## Generate

1. **Inspect the project.**
   - The issue tracker guide (`.agents/issue-tracker.md`): GitHub or a local Markdown tracker, and the labels for `ready-for-agent`, bugs and `needs-triage`. If it's missing or names no bug label, stop and ask the user to complete it first; the skill itself never asks.
   - For a local tracker: the issues folder, and whether git tracks it (the skill requires it untracked).
   - The default branch, branch naming, and that `.worktrees/` (or the folder the repo already uses for worktrees) is ignored.
   - Shared mutable resources that checks and previews use (databases, ports, build output, caches) and how each lane gets its own.
   - Which tools the user runs: Herdr, the agent CLI, `gh`, Node.js or Bun. Record any missing one; don't install anything.
   - CI and post-merge workflows that `ship-pr` must wait for.
2. **Write `SKILL.md`** with frontmatter `name: orchestrate`, `license: MIT`, the `compatibility` line from the global skill and a one-line `description` for the human (it's user-invoked). Use spec fields only and no runtime controls; see the portable-skills concept. Leave out the "Repo version first" notice. Keep the global setup, lanes, ship slot and merge hold, the ten-step loop, the operator rules, the stop conditions and the rules, with this repo's labels, branch names, worktree folder and tracker mode filled in.
3. **Copy the references** `worker.md`, `answer.md`, `spec.md` and `triage.md` from the global skill; copy `local.md` only for a local tracker. Write `references/parallel-resources.md` from the shared `parallel-resources.md` reference (project `.agents/references/`, else `~/.agents/references/`), naming this repo's shared resources and how each lane gets its own.
4. **Copy `scripts/next-issue.mjs`** unchanged.
5. **Copy both adapters** from the global skill so it stays user-invoked: `agents/claude.yaml` and `agents/openai.yaml`.
6. **Keep it small.** `SKILL.md` stays under about 150 lines, with no placeholders.
7. **Finish.** Show the skill to the user for approval, run `agents sync` so Claude Code gets its copy, and commit it.
