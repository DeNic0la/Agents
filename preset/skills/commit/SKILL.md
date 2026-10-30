---
name: commit
description: Commit all changes on the current branch, main included.
license: MIT
---

# Commit

> **Repo version first:** if this repository has `.agents/skills/commit/SKILL.md`, follow that file instead of this one. It's tailored to the repository.

Commit every change in the working tree on the current branch. Don't switch or create a branch, even on main. Arguments, if any, hint at what the change is about. They aren't the message.

1. **Read everything.** Run `git status --short --branch`, `git diff HEAD --stat` and `git log --oneline -10`. Read the full diff (`git diff HEAD`) and every untracked file `git status` lists before writing anything.
2. **Scan for secrets.** Look for credentials, tokens, private keys and any value that doesn't belong in this repository. If you find one, stop, commit nothing, and report what you found.
3. **Ignore local tool state.** An untracked directory that holds a local tool's state (an index, cache or database, such as `.codegraph/`) belongs in the root `.gitignore`, even when it ships its own `.gitignore`. Add its path there and commit that line with the rest.
4. **Stage.** Use explicit paths rather than `git add -A`.
5. **Write the message** as a Conventional Commit, `type(scope): description`, matching the subject style already in `git log`.
6. **Commit.** Report the subject and the short hash, plus the `.gitignore` line from step 3 if you added one. Nothing else.

Split into several commits when the diff covers unrelated changes.

To push, open a pull request and merge, use the `ship-pr` skill instead.
