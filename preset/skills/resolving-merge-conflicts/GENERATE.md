---
description: Recipe for a version of the resolving-merge-conflicts skill tailored to this repository.
---

# resolving-merge-conflicts (recipe)

Generate `.agents/skills/resolving-merge-conflicts/`: a version of the conflict-resolution skill that knows this repository's checks, generated files and history sources.

## Generate

1. **Inspect the project.**
   - The checks to run after a merge, in order: typecheck, lint, tests, format. Take the exact commands from the build files, `AGENTS.md` or `CONTRIBUTING.md`.
   - Files that should be regenerated rather than hand-merged: lockfiles, generated code, snapshots, migrations with ordering numbers. Name the command that regenerates each.
   - Where intent lives: the code host for PRs, the issue tracker guide in `.agents/issue-tracker.md`, ADRs, a changelog.
   - Whether the repo merges or rebases by convention, and any rules about rewriting shared history.
2. **Write `SKILL.md`** with frontmatter `name: resolving-merge-conflicts` and a `description` that leads with when to use it (a merge, rebase or pull stopped on conflicts). Use spec fields only and no runtime controls; see the portable-skills concept. Leave out the "Repo version first" notice. Keep the global process: current state, intent of each side, resolve each hunk without inventing behavior, run the checks, finish. Fill in this repo's check commands and regenerated files.
3. **Keep it small.** `SKILL.md` stays under about 50 lines, with no placeholders.
4. **Finish.** Show the skill to the user for approval, run `agents sync` so Claude Code gets its copy, and commit it.
