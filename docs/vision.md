# Vision

## What this project is

One personal setup for AI coding agents (Claude Code, Codex, GitHub Copilot) that works the same in every tool, on every machine and in every repository its owner works in. Its product is Markdown instructions (skills, subagents, concepts, references, commands, global instructions) and the scripts that install, tailor and update them (`install.sh`, `install.ps1`, `bin/agents`).

It's built for one owner who works on several machines (a private computer and a work laptop) and in several repositories, some of them with several clones used for different jobs. It isn't a team framework: teammates of a repository don't get anything from it unless they install it themselves.

## What it must achieve

1. **One source of truth.** Every rule, workflow and role is written once, in this repo, and reaches every tool from there. Editing an installed file edits the repo.
2. **The same everywhere, tailored where it matters.** The core of an item is the same on every machine and in every repository. What differs per repository, clone or machine is added on top as an instance, never by forking the core. See [model.md](model.md).
3. **Invisible to the repositories it serves.** Nothing it writes into a repository is tracked by that repository. A repository's history, reviews and teammates never see it. See [decisions/0005](decisions/0005-preset-files-are-never-tracked.md).
4. **Machines don't overwrite each other.** A machine that needs different tool files (a work laptop's permission rules) gets them from its environment, so an edit on one machine never changes another. See [decisions/0001](decisions/0001-per-environment-tool-files.md).
5. **Cheap to run.** Usage is a weekly budget. Every session loads only what the work needs: skills are found through a router instead of all being listed, subagents run on an explicit model tier, scripts do deterministic work. See [decisions/0002](decisions/0002-name-only-skill-listing-and-skill-router.md).
6. **Safe by default.** Agents announce what state the work is in, implement only after an explicit yes, and never weaken a safety rule to make a task easier. Removing or rewriting core text needs evidence and a second opinion. See [model.md](model.md#removing-core-text).
7. **Kept current without effort.** One command (`agents update`) brings every machine and every repository on it to the latest version, and names what's new.

## Principles for every change

- **Tool-neutral first.** `preset/` works in all three tools; tool-specific files live in `tools/<tool>/`, per environment in `tools/environments/<env>/<tool>/`.
- **Core and instance stay apart.** A rule that holds everywhere goes into the core; what one project or clone needs goes into its instance. If you're about to copy a core file to change one line for one repository, write an instance instead.
- **Infer, then ask.** Agents learn how the owner works (a checkout's role, a recurring preference) from what the owner actually does, propose it with the evidence, and write it only after a yes.
- **Small context.** Entry points stay small and link to details (the `progressive-disclosure` concept); skills are listed by name and loaded when they apply.
- **Verifiable.** Every behavior has a row in REQUIREMENTS.md and a check in `agents check` or the smoke tests.
- **Private stays private.** Work content stays on the work machine unless the owner chooses otherwise; nothing machine-specific (absolute local paths, local folder names) goes into tracked files.

## Not goals

- Sharing an agent setup with a team through the repositories it serves. A team that wants something gets a curated change to its own repository, written for it.
- Supporting tools other than Claude Code, Codex and GitHub Copilot.
- Replacing a repository's own documentation or conventions: a repository's rules win over the preset's.
