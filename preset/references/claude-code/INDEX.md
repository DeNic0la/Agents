---
description: Claude Code reference: instruction files and rules, context and cost, hooks, skills and subagents, setup/settings/env vars. Each fact links to the exact section of the official docs; read the topic file that matches the task.
---

# Claude Code reference

Condensed from the official Claude Code docs (code.claude.com/docs), checked 2026-10-30. Each topic file keeps the most important facts inline: exact paths, keys, event names, limits and defaults. Every section ends with a link to the doc section it comes from. If a fact matters and might have changed, follow the link. "In this preset:" bullets say how a fact applies to this repo.

| File | Read when |
|---|---|
| [memory-and-rules.md](memory-and-rules.md) | editing CLAUDE.md/AGENTS.md, imports, `.claude/rules/` (incl. path-specific rules), auto memory, or choosing an output style |
| [context-and-cost.md](context-and-cost.md) | sizing instruction files or skills, what survives compaction, effort and auto-compact settings, reducing token usage, monitoring usage |
| [hooks.md](hooks.md) | writing or registering a hook: lifecycle and events, matchers, exit codes, Windows/PowerShell execution, the format/notify/protect/test examples |
| [skills-subagents-tools.md](skills-subagents-tools.md) | writing or porting a skill or subagent: locations, precedence, frontmatter, content lifecycle, supporting files, AskUserQuestion, PowerShell tool |
| [setup-settings-env.md](setup-settings-env.md) | installing (Windows/WSL), auto-updates, settings.json examples, environment variables and the subprocess env scrub |

## Most important facts

- **Instructions:** `~/.claude/CLAUDE.md` always loads. A project `CLAUDE.md` with `@AGENTS.md` is the documented way to share one file with other tools. Claude Code reads `AGENTS.md` directly only when there is no `CLAUDE.md`. Keep `CLAUDE.md` under about 200 lines and move workflows into skills.
- **Skills:** only `name` and `description` load at startup. Supporting files load when linked and needed, and scripts run without being loaded. After compaction an invoked skill keeps only its first 5,000 tokens (25,000 total), so put the core procedure at the top.
- **Precedence:** for skills, personal (`~/.claude/skills`) beats project (`.claude/skills`). For subagents it's the other way round: project beats user.
- **Compaction:** project-root `CLAUDE.md`, unscoped rules and skill descriptions are re-injected. Path-scoped rules and nested `CLAUDE.md` files are summarized away and only reload on demand.
- **Hooks:** on Windows, command hooks run through Git Bash, or PowerShell if Git Bash is missing. Exit code 2 blocks, but exit 1 doesn't.
- **Settings:** settings files are plain JSON without comments. `env` values are not expanded (`~` stays literal). `claude doctor` validates settings files.
