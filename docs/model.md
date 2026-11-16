# Model

How the preset reaches machines and repositories, and how it's tailored to each. Commands are in the [README](../README.md); terms are in the [glossary](README.md#glossary).

## Two destinations

- **A machine's home.** `install.sh` / `install.ps1` link the preset and the tool files into `~/.claude`, `~/.codex`, `~/.copilot` and `~/.agents`. Links point back into this repo, so the installed files are the repo's files. Every session on the machine gets them.
- **A repository checkout.** `agents setup` / `add` / `sync` put the items a checkout selected into the folders each tool reads there (`.agents/`, `.claude/`, `.codex/`, `.github/agents/`), plus a block in its instruction files. Which items a checkout uses is its own choice: some skills don't fit some repositories.

## Core and instances

Every tailorable item has a **core**, tracked and versioned here: what the skill or subagent must always do, plus a **recipe** (`GENERATE.md`) saying what to look at in a repository and what to write for it.

An **instance** is what a specific context adds. Example: a UI design subagent's core says that a big change needs a mockup first. In a desktop Java Swing client, its instance adds that mockups use the existing Swing look and Swing components; in a containerized web app, its instance adds the CSS framework and component library in use. The core rule is the same in both; only the instance differs.

An instance is never lost: it can always be generated again from the core and the recipe. What can't be regenerated from the code (the job a clone is used for, a decision the owner made) is kept in the instance's storage, see below.

Skills and subagents can both be tailored. A skill or subagent without a recipe is global: every checkout gets the core as it is.

## Levels

An instance is built from up to three levels, from general to specific:

| Level | Holds | Example |
|---|---|---|
| Core | What's always true, plus the recipe | "Big changes need a mockup." |
| Project | What every clone of one codebase shares | "This is a Java Swing client: follow its styles, mock up with Swing components." |
| Checkout | What one clone adds for its role | "This clone is a read-only reference: never write files, answer from the version in production." |

`agents sync` combines the levels into the file each tool reads, core first: the core, then `## In this project`, then `## In this checkout`, then a sentence that the more specific section wins. Levels only **add**: each level appends its part, and where two levels disagree, the more specific one wins. Because the core is combined in on every sync, a change to the core reaches every repository on the next `agents update`, without regenerating any instance.

Tool settings can be part of a level too, for example a permission rule that denies file writes in a read-only reference clone. An instruction alone isn't enforced; a deny rule is.

### Removing core text

A level may also remove or rewrite a part of the core, but only as a reviewed exception:

1. The agent collects three concrete cases where that part of the core made it behave wrongly or uselessly in this context.
2. An independent agent on another model or tool (Claude Fable or Codex) reviews the change and must agree that removing or rewriting it doesn't make agents misbehave.
3. The evidence and the verdict are stored with the level, next to the change, in a `## Removed from the core` section.
4. If the core text changes later, the removal no longer applies and the core text is used again until the change is reviewed anew.

`agents sync` enforces what it can check mechanically: the entry's core text must occur exactly once in the core (which is how a changed core voids it), it must list at least three cases, and its review line must carry an `agreed` verdict. The core text is looked up in the core itself, never in text an earlier removal produced, and two entries whose core texts overlap can't both apply. Core text and replacement are quoted on one line. Otherwise it warns and keeps the core text. Whether the review was really independent is the agent's duty; `agents` can't tell.

A safety rule is narrowed, never dropped. "Always consult the internal docs site before X" can be removed in a context where that site is unreachable. "Never make a commit directly" can at most be rewritten to "you may use git commands that don't change the commit history; recommend the others to the user, never run them yourself".

## Storage

| What | Where by default | Shared by |
|---|---|---|
| Core and recipes | this repo (`preset/`) | every machine |
| Project level | `~/.agents/local/projects/<project>/`, a machine-local store outside any repository (or `projects/<project>/` in this repo, see below) | every clone of the project on this machine |
| Checkout level | inside the checkout | that clone only |

A project gets a neutral name when it's set up (all clones of one codebase use the same name), proposed from the origin's repository name and kept in the checkout's `.agents/project` together with the store. Where its project level lives is chosen once per project: the machine-local store by default, or this repo when the project should share its instances across machines. This repo is pushed to GitHub, so a work project's details would then leave the work machine; that's an explicit choice per project, never a default.

## Never tracked by the repository

Nothing `agents` writes into a checkout is tracked by that repository:

- `agents` keeps a managed block in the checkout's `.git/info/exclude` listing exactly the paths it wrote, so they never show up in `git status`. Lines the owner wrote there are left alone, and a file whose block markers are unbalanced is left as it is. The block lists `.agents/` as a whole, or exact paths inside it when the repository tracks files there, and it stays while `.agents/` still holds the owner's files (levels, overrides) after the last item is removed. Linked worktrees share one exclude file, so the block is the union of what each worktree recorded for itself.
- It never changes a file the repository tracks. If a repository has its own `AGENTS.md` or `CLAUDE.md`, the preset's block goes into an untracked `CLAUDE.local.md` instead (which imports `AGENTS.md`, because Claude Code stops reading `AGENTS.md` on its own once a local file exists). Codex and Copilot then rely on the global instructions, which already tell them to prefer a repository's instances.
- If a repository already tracks a preset file from earlier, `agents` warns on every sync and prints the command to stop tracking it (`git rm -r --cached <path>`); it doesn't run it and leaves the file as it is.
- One exception: `agents`' own state files (the manifest and the like under `.agents/`) are still updated when a repository tracks them, with the same warning, because a stale manifest would break `sync` and `update`. It never deletes one: removing the last item empties a tracked manifest and leaves the other tracked state files.
- Instructions for tools other than Claude Code stay in the tracked `AGENTS.md` unchanged, so Codex and Copilot don't see the preset block in such a repository.

## Checkout roles

One codebase often has several clones with different jobs, for example one for integrating changes from an upstream vendor, one used only as a read-only reference to answer questions from the business side, and one for development. Most of their setup is shared (the project level); each role adds its own (the checkout level).

Roles are **free-form and inferred**, not declared: the agent watches what the owner actually does in a checkout (only questions and no edits, merges from upstream, feature work) and proposes a role, with the evidence and what the role would add (instructions, skills, settings such as a write deny). It writes the checkout level only after the owner's yes. When the same role shows up in several projects, the pattern is written down in the `repo-checkout-roles` concept so later checkouts can be matched to it.

## Environments

Some machines need their own tool files: a work laptop's Claude Code settings carry work-only permission rules and turn off plugins synced from claude.ai. Those files live in `tools/environments/<env>/<tool>/`, mirroring `tools/<tool>/`, and a machine names its environment in `~/.agents/local/environment`. An environment replaces whole files; everything else stays shared. Environment-specific versions of preset skills (a skill that differs per machine) aren't designed yet.

## Kinds of skills per repository

From the owner's point of view, each skill is one of three things in a given repository:

- **Tailored per repository**: it has an instance there (project and checkout levels).
- **Not used in this repository**: the checkout doesn't select it.
- **Different per environment**: it varies with the machine rather than the repository (not designed yet, see above).

## The skill listing

Every skill an agent may start on its own puts its name and description into every session. In Claude Code, all of them except `skill-router` and `dependency-vetting` are listed by name only (`skillOverrides`), and `skill-router` is used at the start of each task and on every change of goal, focus or lifecycle state to find and load the skills that fit. Codex and Copilot still list every description. See [decisions/0002](decisions/0002-name-only-skill-listing-and-skill-router.md).

## Keeping it current

`agents update` pulls this repo, relinks every machine-level file, refreshes every checkout on the machine that uses the preset (they're listed in `~/.agents/local/`), and names items the pull added that a checkout doesn't use yet. See [decisions/0004](decisions/0004-update-refreshes-every-checkout.md).
