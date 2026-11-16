# Spec: tailoring levels, never-tracked checkouts, tailored subagents

Implements [0005](../decisions/0005-preset-files-are-never-tracked.md), [0006](../decisions/0006-tailoring-in-levels.md) and [0007](../decisions/0007-checkout-roles-are-inferred.md). Read [model.md](../model.md) first; this spec says how to build it. Where it leaves a detail open, choose the simplest option that meets the acceptance checks and say what you chose.

## Constraints

- Repo rules in [AGENTS.md](../../AGENTS.md) apply, in particular:
  - `bin/agents` runs in bash on Linux, WSL and Git Bash, with no process per preset file.
  - `lib/common.sh` and `install.ps1` stay in sync.
  - README.md and REQUIREMENTS.md change with behavior.
  - Smoke tests run on every platform you can reach.
- Line endings: LF, except `.ps1`, `.cmd` and `.bat` (CRLF).
- No absolute local paths and no local folder names in tracked files, examples or tests. Use neutral names (`example`, `smoke`).
- Never touch a file the target repository tracks.
- Keep what works: the existing commands, item names (`skills/<n>`, `agents/<n>.md`), full-copy recipes and the `update` behavior from [0004](../decisions/0004-update-refreshes-every-checkout.md) keep working.

## 1. Never tracked (0005)

1. **Exclude block.** After every setup, add, remove, sync and update of a checkout, `agents` rewrites a managed block in the file `git rev-parse --git-path info/exclude` names, resolved against the checkout's top level.
   - The block sits between `# agents-preset:start` and `# agents-preset:end`.
   - It lists, anchored with a leading `/`:
     - `/.agents/`
     - every path `agents` wrote outside `.agents/`: the mirrors under `.claude/`, `.github/agents/` and `.codex/agents/`, `.claude/commands/` entries, and anything else in the targets list
     - `AGENTS.md`, `CLAUDE.md`, `.claude/CLAUDE.md` and `CLAUDE.local.md`, each only when `agents` wrote it and the repository doesn't track it
     - an agents-managed `.claude/settings.local.json`
   - Use exact paths for folders shared with the repository, so files the owner adds there stay visible.
   - Lines outside the block are never changed.
   - The block is removed when the checkout no longer selects any item.
   - Outside a git repository, nothing happens.
   - With `--dry-run`, it's reported, not written.
2. **Tracked instruction files.** `agents` never writes into a file the repository tracks.
   - If `AGENTS.md` is tracked, the preset block goes into `CLAUDE.local.md`.
   - If neither `CLAUDE.md` nor `.claude/CLAUDE.md` imports `AGENTS.md`, `CLAUDE.local.md` also gets `@AGENTS.md`. Claude Code stops auto-reading `AGENTS.md` once a `CLAUDE.md` or `CLAUDE.local.md` exists.
   - If only `CLAUDE.md` is tracked, the block stays in the untracked `AGENTS.md`, and `CLAUDE.local.md` imports `@AGENTS.md` unless the tracked `CLAUDE.md` already does.
   - A managed block found inside a tracked file is reported with a warning ("remove the block and commit, or keep it") and left as it is.
3. **Already tracked preset paths.** With one `git ls-files` call over the target paths, find the ones the repository tracks. For each, warn with `git rm -r --cached <path>` and leave it. `agents` never runs `git rm`.
4. **Docs.**
   - Replace "can be committed / commit these files so teammates get the same setup" in README.md: line 6, the "Project setups" bullet, the project setup section, the global skill paragraph and the Update step 3.
   - Replace REQUIREMENTS rows R2 and R15 with the new intention.
   - Add rows for the exclude block, tracked files and the warning.

## 2. Levels and storage (0006)

1. **Project name and store.**
   - Setup in a checkout without a project proposes a name: the origin URL's last path segment, without `.git`, lowercased. Interactively it can be changed.
   - `--project <name>` sets it, and `--store machine|agents` picks the store. Machine is the default.
   - Stored in the checkout as `.agents/project` with two lines, `name=<name>` and `store=<machine|agents>`. It's untracked through the exclude block.
   - Names are plain words (letters, digits, `.`, `_`, `-`, not starting with a dot), like environment names. An invalid name is refused.
2. **Store paths.**
   - Machine store: `~/.agents/local/projects/<name>/`.
   - Agents-repo store: `projects/<name>/` in this repo, created on first use.
   - Both use the same layout: `skills/<skill>.md` and `agents/<agent>.md`, one specifics file per item, plus `settings/claude.json` (see 2.5).
   - Checkout level: `.agents/levels/` with the same layout.
3. **Specifics recipes.**
   - A recipe marks the new format in its frontmatter, `output: specifics`. Without that field, the full-copy behavior stays.
   - A specifics recipe tells the agent to write two files:
     - the project-level specifics into the project store
     - checkout-level specifics into `.agents/levels/`, only when the checkout's role needs them (see 3)
   - Neither file repeats the core.
4. **Composition.** On every sync, for each selected tailored item with a specifics recipe and at least one level file, `agents` composes the instance:
   - The core file without its "Repo version first" notice.
   - Then `## In this project` with the project level.
   - Then `## In this checkout` with the checkout level.
   - Then one sentence saying that where these sections disagree, the more specific one wins.

   Where the result goes:
   - **Skills:** into `.agents/skills/<n>/SKILL.md`, together with the core's supporting files (`scripts/`, `references/` and the like). It's mirrored to `.claude/skills/<n>/` as today.
   - **Subagents:** into `.claude/agents/<n>.md`, `.github/agents/<n>.agent.md` and the generated `.codex/agents/<n>.toml`.

   Rules:
   - The composed file is regenerated, never edited in place.
   - A missing level is simply left out.
   - With no level file at all, the item behaves as today: the recipe is copied and the AGENTS.md block says to generate it.
5. **Settings in a level.**
   - A level may carry `settings/claude.json`, a JSON object with Claude Code settings. Typical: `permissions.deny` rules such as a write deny for a read-only reference checkout.
   - `agents` writes the merged settings (project, then checkout, arrays concatenated and de-duplicated) to `.claude/settings.local.json` only when that file is absent or was written by `agents`. Record a checksum in `.agents/` to know.
   - Otherwise it warns and prints what to add by hand.
   - Use whatever JSON tool is available (`node`, then `python3`/`python`). Without one, warn and skip settings.
   - Claude Code only. Codex and Copilot levels carry instructions only, for now.
6. **Removing core text.** A level file may contain a section `## Removed from the core` with entries of this shape:

   ```
   ### <short title>
   Core text: "<exact text from the core>"
   Replacement: "<new text, or empty to remove>"
   Cases:
   1. <case>
   2. <case>
   3. <case>
   Review: <reviewing agent and model or tool>, <date>, agreed: <one-line reason>
   ```

   - When composing, an entry applies only if its core text occurs exactly once in the core, it lists at least three cases, and it has a `Review:` line with "agreed".
   - Otherwise the core text stays, and sync warns with the entry's title and the reason.
   - The section itself is not copied into the composed file.
   - `agents check` doesn't see level files (they're outside the preset). Sync does the checking.
7. **Tailored subagents.**
   - A subagent `agents/<n>.md` may have a recipe. Put it where `available()` and the README catalog don't mistake it for an item, for example `preset/agents/recipes/<n>.md`, skipped by `available()`.
   - Extend `agents check` to validate it: frontmatter with a `description`, and `output: specifics`.
   - Then subagents get levels and composition like skills (2.4).
   - None of the 15 subagents gets a recipe in this task. Tests use a sample.
8. **The checkout list.**
   - Rename `~/.agents/local/projects` (the list from 0004) to `~/.agents/local/checkouts`.
   - On the first run that finds the old file and no new one, move it.
   - `projects/` is then the project store's folder.
9. **Docs and rules.**
   - Rewrite rule 4 of `preset/concepts/portable-skills/CONCEPT.md` and its `skill-anatomy.md`: tailored items, specifics recipes, levels, subagents and the removal gate. Keep the concept's own rules (small entry point, supporting files with a "read when").
   - Update README ("Set up a project", the repo-version paragraphs, Update) and REQUIREMENTS: new rows for project, store, levels, composition, settings, removal and subagent recipes.
   - The AGENTS.md block that `agents` writes into checkouts now says to generate missing levels from the recipe. The project level goes into the store, and the checkout level only per [0007](../decisions/0007-checkout-roles-are-inferred.md).

## 3. Checkout roles (0007)

1. Write `preset/concepts/repo-checkout-roles/CONCEPT.md`, add it to `preset/concepts/INDEX.md`, and add a one-line pointer in `preset/AGENTS.md`. It says:
   - A role is inferred from what the owner does in a checkout. Signals include: only questions and no edits, merges from an upstream or vendor branch, feature branches and commits, the branch the checkout stays on, and whether it's kept at the production version.
   - The agent proposes the role with its evidence and the checkout level it would add (instructions, skills, settings such as a write deny), and writes it only after a yes. When the evidence is thin, it asks.
   - What a checkout level may contain, and where it's stored (`.agents/levels/`).
   - A role seen in several projects is recorded in the concept's own `roles.md` as a pattern (signals, typical level), so later checkouts can be matched to it. Start `roles.md` with the three known patterns as examples, in neutral words:
     - integration: brings in changes from an upstream vendor
     - reference: read-only, answers questions, tracks the version in production, updates itself, write deny
     - development
2. Follow the concepts in `preset/concepts/INDEX.md` when writing it, especially `progressive-disclosure`.

## 4. Tests

Extend `tests/smoke.sh` and `tests/smoke.ps1` (in `smoke.ps1`, keep `HOME` pointed at the temporary home, and don't run `update`: it would install into the real profile). Cover at least:

- After `add` in a fresh repository, `git status --porcelain` is empty and the exclude block lists `/.agents/`. After removing every item, the block is gone.
- A repository that tracks `AGENTS.md`: `add` leaves it unchanged, `CLAUDE.local.md` gets the block and the import, and `git status` stays empty.
- A preset path committed earlier: sync prints the `git rm -r --cached` warning and changes nothing.
- A sample tailored skill and a sample tailored subagent with `output: specifics`, a project level and a checkout level:
  - the composed files contain the core, then the project section, then the checkout section
  - a change to the core shows up after `sync`
  - a valid removal applies
  - a removal with two cases, or without "agreed", doesn't apply and warns
  - a removal whose core text changed doesn't apply and warns
- `--project` and `--store agents` put the project level under the repo copy's `projects/<name>/`.
- The old `~/.agents/local/projects` list file is moved to `checkouts`.
- Settings: a checkout level with a deny rule produces `.claude/settings.local.json`; an existing file not written by `agents` is left alone, with a warning.

Run `bin/agents check`, `tests/smoke.sh` on WSL, and `tests/smoke.ps1` in PowerShell 7 and Windows PowerShell 5.1.

## Acceptance

- `bin/agents check` passes, and all smoke tests pass on WSL, PowerShell 7 and PowerShell 5.1.
- `agents sync` in a checkout whose repository tracks nothing of the preset leaves `git status` exactly as it was.
- [model.md](../model.md), the decisions, README.md, REQUIREMENTS.md and the portable-skills concept describe the same behavior. Set the status of 0005–0007 to "implemented".
- No tracked file contains an absolute local path or a local folder name.
