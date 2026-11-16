# 0005 Preset files are never tracked by the repositories they serve

- **Status:** accepted, planned (see [specs/tailoring-levels.md](../specs/tailoring-levels.md)); supersedes "commit the project setup so teammates get it"

## Context

`agents setup` was designed to write files a repository would commit, so teammates got the same setup. In practice the preset is personal: teammates don't use it, a work repository's history shouldn't carry it, and the owner's main work repository forbids agent commits altogether. The two work checkouts stayed clean only through hand-written lines in `.git/info/exclude`; any other repository showed every preset file in `git status`.

## Decision

Nothing `agents` writes into a checkout is tracked by that repository, for every kind of item (skills, subagents, commands, concepts, references, instruction blocks) and all three tools.

- `agents` maintains a managed block in the checkout's exclude file (`git rev-parse --git-path info/exclude`) with the exact paths it wrote, rewritten on every setup, add, remove, sync and update and removed when the checkout drops the preset. Lines outside the block are the owner's and stay.
- It never changes a tracked file. A repository that tracks its own `AGENTS.md` or `CLAUDE.md` gets the preset block in an untracked, excluded `CLAUDE.local.md`, which also imports `AGENTS.md`.
- A preset path the repository already tracks gets a warning with the `git rm --cached` command; `agents` never runs it.

## Rejected

- **Directory patterns** (`/.claude/skills/`): would also hide files the owner creates there for the repository.
- **A global gitignore:** applies to every repository on the machine, including ones that track such folders.
- **Keep committing, opt out per repository:** the default would leak into every new repository.

## Consequences

- Teammates get nothing from the preset; a team that wants something gets a curated change to its own repository.
- Instances in a checkout are untracked; they're regenerated from the core and recipe when missing, or kept in the project-level store.
