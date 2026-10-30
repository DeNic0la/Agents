---
description: Where Claude Code loads CLAUDE.md, AGENTS.md, .claude/rules/ and auto memory from, in what order and with what limits, and when an output style fits instead; read before editing instruction files or rules.
---

# Claude Code memory, rules, and output styles

Source: Claude Code docs, checked 2026-10-30. Each section links to the exact doc section.

## CLAUDE.md locations and load order
- Load order, broadest to most specific (later = read later in context): Managed policy -> User `~/.claude/CLAUDE.md` -> Project `./CLAUDE.md` or `./.claude/CLAUDE.md` -> Local `./CLAUDE.local.md` (gitignore it).
- Managed policy paths: macOS `/Library/Application Support/ClaudeCode/CLAUDE.md`, Linux/WSL `/etc/claude-code/CLAUDE.md`, Windows `C:\Program Files\ClaudeCode\CLAUDE.md`; or the `claudeMd` key in `managed-settings.json` (no effect in user/project/local settings).
- At launch loads `CLAUDE.md` + `CLAUDE.local.md` from the working dir and every ancestor; files are concatenated, never override. Order: filesystem root down to cwd; within a directory `CLAUDE.local.md` comes after `CLAUDE.md`.
- Subdirectory `CLAUDE.md`/`CLAUDE.local.md` load on demand when Claude reads/writes/edits a file in that subdirectory (incl. Bash `cat`/`head` on one file).
- Block-level HTML comments (`<!-- ... -->`) are stripped before injection (kept inside code blocks).
- `--add-dir` dirs load no CLAUDE.md unless `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1`; then `CLAUDE.md`, `.claude/CLAUDE.md`, `.claude/rules/*.md`, `CLAUDE.local.md` load from there.
- Delivered as a user message after the system prompt, not as system prompt; context, not enforcement (enforce with hooks or `permissions.deny`).
- Verify: `/context` -> **Memory files** lists launch-loaded files; `/memory` lists/opens/creates files; `/init` generates a starter CLAUDE.md.
- In this preset: `~/.claude/CLAUDE.md` (user scope) links to the shared preset `AGENTS.md`, so it loads in every project, before the project's `CLAUDE.md`.
Source: [How Claude remembers your project › How CLAUDE.md files load](https://code.claude.com/docs/en/memory#how-claude-md-files-load), [› Choose where to put CLAUDE.md files](https://code.claude.com/docs/en/memory#choose-where-to-put-claude-md-files)

## Imports (`@path`)
- `@path/to/import` anywhere in a CLAUDE.md expands that file into context with it; relative paths resolve from the importing file, not cwd; absolute and `~/` paths allowed.
- Recursive imports up to a maximum depth of four hops.
- Spaces: escape with backslash (`@Design\ Docs/api.md`); quoted paths are not imported. `@` inside code spans/fenced blocks is not an import.
- Imports in project-level files that resolve outside the working dir are "external": one-time approval dialog per project; declining keeps them disabled. User-scope files (`~/.claude/CLAUDE.md`, `~/.claude/rules/`) load imports without the dialog (except in Cowork sessions).
- Imports do not reduce context cost; imported files load together with the importer.
Source: [How Claude remembers your project › Import additional files](https://code.claude.com/docs/en/memory#import-additional-files)

## AGENTS.md support
- Requires v2.1.277+. Default (`claude-md-or-agents-md`): reads `AGENTS.md` and `.claude/AGENTS.md` (cwd and ancestors) only if no `CLAUDE.md`, `.claude/CLAUDE.md`, or `CLAUDE.local.md` exists in cwd or above.
- Do not count for that check (keep loading alongside AGENTS.md): `~/.claude/CLAUDE.md`, managed CLAUDE.md, `.claude/rules/`.
- Never read: `AGENTS.local.md`, `AGENTS.override.md`, anything under `.agents/`.
- **Project instructions** (`/config`) values: `claude-md-or-agents-md` (default), `claude-md-and-agents-md`, `claude-md`, `managed-only`. Settings form: `pluginConfigs."cc-plugin-agents-md@builtin".options.instructionFiles`, honored only in `~/.claude/settings.json`, `--settings`, managed (pre-v2.1.285 ID: `agents-md@builtin`).
- A `CLAUDE.md` containing `@AGENTS.md` can stay: it never causes a double read under any value. Put Claude-specific lines below the import.
- AGENTS.md read via the setting (not via import): no `InstructionsLoaded` hook, not loaded from `--add-dir`, external imports only if already approved.
- Windows: docs recommend the `@AGENTS.md` import over a `CLAUDE.md` symlink (symlinks need Admin/Developer Mode; Git checks them out as text unless `core.symlinks`). Edit/Write refuse to write through a symlink.
- In this preset: project `CLAUDE.md` = `@AGENTS.md` import, the documented pattern; since that CLAUDE.md exists, AGENTS.md arrives via the import, not the direct reader.
Source: [How Claude remembers your project › AGENTS.md](https://code.claude.com/docs/en/memory#agents-md), [› Share one file with other coding tools](https://code.claude.com/docs/en/memory#share-one-file-with-other-coding-tools)

## Set up rules (`.claude/rules/`)
- One-topic `.md` files in `.claude/rules/`, discovered recursively (subfolders like `frontend/` allowed).
- Rules without `paths` load at launch with the same priority as `.claude/CLAUDE.md`.
- Project rules are skipped if `project` is excluded from `--setting-sources`.
- User-level rules in `~/.claude/rules/` apply to every project and load before project rules; neither overrides the other on conflict.
- Symlinks supported (circular ones detected). A target outside cwd counts as an external import: needs project approval, then only rules without `paths` load. Network targets (`\\server\share`, `/net`, `/Network`) never load; `\\wsl$` is fine.
- Skip files with `claudeMdExcludes` (globs vs absolute paths, any settings layer, arrays merge; cannot exclude managed CLAUDE.md).
- Task-specific instructions not needed every session belong in skills instead.
Source: [How Claude remembers your project › Set up rules](https://code.claude.com/docs/en/memory#set-up-rules), [› User-level rules](https://code.claude.com/docs/en/memory#user-level-rules)

## Path-specific rules
- Frontmatter `paths` (YAML list or comma-separated string) is the only field read; other fields ignored; frontmatter stripped before load; unparseable YAML = rule loads unconditionally (`claude --debug` shows the error).
- Loads when Claude uses Read/Write/Edit on a matching file (or Bash `cat`/`head` on one file); works through symlinked project paths.
- Pattern base: project rules -> directory containing the `.claude` folder; user rules -> session's primary working directory.
- Globs: `**/*.ts`, `src/**/*`, `*.md` (project root only), `src/components/*.tsx`; braces `src/**/*.{ts,tsx}`. Budget per rule: 1,000 expanded patterns / 4 MiB, beyond that the pattern is used unexpanded. Escape literal `[` as `\[`.
- Per-file limit for on-demand files (path rules, subdir CLAUDE.md and their imports): 40,000 chars on 200K context; on 1M, 200,000 (Opus/Sonnet 4.6) or 150,000 (later models); over it only the start loads.
- Example:
```markdown
---
paths:
  - "src/api/**/*.ts"
---
# API Development Rules
```
Source: [How Claude remembers your project › Path-specific rules](https://code.claude.com/docs/en/memory#path-specific-rules)

## Size guidance and audit
- Target under 200 lines per CLAUDE.md; launch-loaded files load whole up to 4 MiB, a file over 4 MiB is skipped entirely. Startup and `/status` warn on over-length files and on a combined total.
- `/doctor prompt-audit [path]` (v2.1.283+) checks CLAUDE.md, CLAUDE.local.md, AGENTS.md plus rules, skills, commands, subagents and output styles under `.claude/` and `~/.claude/` for stale references and contradictions; proposes edits, changes nothing until asked. Runs via the bundled `/claude-api` skill (unavailable if disabled via `skillOverrides`/`disableBundledSkills`).
- `InstructionsLoaded` hook logs which CLAUDE.md/rules files load, when and why.
- After `/compact`, project-root CLAUDE.md is re-read from disk; nested CLAUDE.md and path rules reload on demand.
Source: [How Claude remembers your project › Audit your instruction files](https://code.claude.com/docs/en/memory#audit-your-instruction-files), [› My CLAUDE.md is too large](https://code.claude.com/docs/en/memory#my-claude-md-is-too-large)

## Auto memory
- Stored at `~/.claude/projects/<project>/memory/` (one per git repo, shared across worktrees, machine-local): `MEMORY.md` index + one topic file per memory; `type` frontmatter `user`, `feedback`, `project`, `reference`.
- First 200 lines or 25KB of `MEMORY.md` (whichever first) load each session; topic files are read on demand.
- On by default locally; toggle in `/memory` (writes `autoMemoryEnabled` to `~/.claude/settings.json`), per project `"autoMemoryEnabled": false`, or `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1`; relocate with `autoMemoryDirectory` (absolute or `~/`).
- Not loaded into subagents (except forks).
Source: [How Claude remembers your project › How it works](https://code.claude.com/docs/en/memory#how-it-works)

## Output styles
- Built-ins: Default (no style), `Proactive`, `Concise`, `Explanatory`, `Learning`. Switch with `/output-style <style>` (case-insensitive) or `/config` -> Output style; both save to `.claude/settings.local.json`.
- Setting `"outputStyle": "Explanatory"` is case-sensitive; a non-matching value gives Default. Cross-project default in `~/.claude/settings.json`; project settings take precedence.
- Custom style files: `~/.claude/output-styles`, `.claude/output-styles` (every one from cwd up to repo root; closest wins on name clash), managed settings dir, plugin `output-styles/`. Read at startup: restart after editing.
- Frontmatter: `name` (default: file name), `description`, `keep-coding-instructions` (default `false`: drops the built-in software-engineering section of the full system prompt), `force-for-plugin` (plugins only, default `false`).
- Sent with every request; applies to the main conversation and forks, not other subagents.
Source: [Output styles › Create a custom output style](https://code.claude.com/docs/en/output-styles#create-a-custom-output-style), [› How output styles work](https://code.claude.com/docs/en/output-styles#how-output-styles-work)

## Output style vs other features
- Output style: voice, length, format of every response, or a different role.
- CLAUDE.md: project conventions, commands, structure; stays loaded whichever style is active.
- Skill: instructions for one kind of task; loads only when invoked or matched.
- Hook: must happen every time without exception (runs at lifecycle events, independent of Claude).
- Subagent: separate context with own prompt, model, tools; returns a summary.
- `--append-system-prompt`: launch-time addition to the system prompt, removes nothing.
- They combine: CLAUDE.md for what to know, style for how to respond, hook for guarantees.
- In this preset: shared behavior rules belong in `AGENTS.md`/rules; only response voice/format belongs in an output style.
Source: [Output styles › Choose between an output style and other features](https://code.claude.com/docs/en/output-styles#choose-between-an-output-style-and-other-features)
