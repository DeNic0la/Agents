---
name: resolving-merge-conflicts
description: Use when a git merge, rebase or pull stops on conflicts, when files contain conflict markers, or when the user asks to fix or resolve merge conflicts. Reconciles each conflicted hunk from the intent behind both sides, runs the project's checks and finishes the merge or rebase.
license: MIT
---

# Resolving merge conflicts

> **Repo version first:** if this repository has `.agents/skills/resolving-merge-conflicts/SKILL.md`, follow that file instead of this one. It's tailored to the repository.

## Process

1. **See the current state.** Is it a merge or a rebase, and which commit is being applied? Check `git status`, the history on both sides, and the conflicted files.
2. **Find the intent of each side.** For every conflict, understand why each change was made: read the commit messages, the PRs and the original issues. When there are many conflicts, hand this research to a subagent that returns only the intent of each side.
3. **Resolve each hunk.** Keep both intents where you can. Where they're incompatible, pick the one that matches the merge's stated goal and note the trade-off. Don't invent new behavior. Always resolve; never `--abort`.
4. **Run the checks.** Find the project's automated checks and run them, typically typecheck, then tests, then format. Fix anything the merge broke.
5. **Finish.** Stage everything and commit. When rebasing, continue until every commit is rebased, repeating steps 1-4 for each stop.

## Red Flags

- A hunk resolved by taking one side wholesale without reading why the other side changed.
- New behavior that neither side asked for.
- Conflict markers left anywhere in the tree (`git diff --check` finds them).
- Checks skipped because "it's only a merge".

## Verification

- [ ] No conflict markers remain and `git status` shows no unmerged paths.
- [ ] Every trade-off where one intent lost is noted in the report.
- [ ] The project's checks pass, or the report names what still fails and why.
- [ ] The merge is committed, or the rebase has finished.
