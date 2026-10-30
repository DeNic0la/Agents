---
description: What fills Claude Code's context window, what survives compaction, and the commands, settings, and env vars that keep context and token cost down; read when sizing CLAUDE.md/skills, tuning effort or auto-compact, or diagnosing high usage.
---

# Claude Code Context and Cost

Source: Claude Code docs, checked 2026-10-30. Each section links to the exact doc section.

## What loads into context
- Before the first prompt: CLAUDE.md (or AGENTS.md in its place), auto memory, MCP tool names, skill descriptions; plus output style or `--append-system-prompt` text if configured.
- While working: every file read adds to context; path-scoped rules (`paths:` frontmatter) load alongside matching files; PostToolUse hook output is added.
- A subagent does its reads in its own context window; only its summary plus a small metadata trailer come back.
- `/context` shows live usage by category with optimization suggestions, including which CLAUDE.md and auto memory files loaded (listed under **Memory files**). `/memory` opens those files.
- In this preset: only skill name+description load at startup; SKILL.md bodies, `references/`, and `concepts/` are read on demand, so they cost nothing until used.
Source: [Explore the context window › What the timeline shows](https://code.claude.com/docs/en/context-window#what-the-timeline-shows)

## What survives compaction
- System prompt and output style: still apply. Project-root CLAUDE.md, unscoped rules, auto memory, plan-mode plan: re-injected from disk.
- Skill descriptions: rebuilt and re-injected (v2.1.304+).
- Invoked skill bodies: re-injected, capped at 5,000 tokens per skill and 25,000 tokens total; oldest dropped first. Truncation keeps the start of the file, so put the most important instructions near the top of `SKILL.md`.
- Files read/edited: up to five re-read, most recently modified first; a file over 5,000 tokens comes back only as a path (`Referenced file`).
- Rules with `paths:` and nested subdirectory CLAUDE.md files load into message history, so they are summarized away and reload only on demand. To persist a rule, drop `paths:` or move it to the root CLAUDE.md.
- Hook-added context is summarized; SessionStart hooks matching the `compact` source run again and their output is added.
- Background commands and background subagents keep running.
- In this preset: keep each SKILL.md's core procedure near the top and well under 5,000 tokens; push detail into `references/` files, which are re-read on demand rather than re-injected.
Source: [Explore the context window › What survives compaction](https://code.claude.com/docs/en/context-window#what-survives-compaction)

## Act before context fills
- `/compact <focus>` (e.g. `/compact focus on the auth bug fix`) controls what the summary keeps.
- `/rewind` → select a message → **Summarize from here** / **Summarize up to here** compacts part of the conversation.
- `/autocompact 500k` compacts earlier; `/clear` between unrelated tasks; delegate large reads to a subagent.
- 1M context window: Fable models, Sonnet 5+, Haiku 5.5, Opus 4.6+, Sonnet 4.6 (the 4.6 models via a `[1m]` variant).
Source: [Explore the context window › When your context fills up](https://code.claude.com/docs/en/context-window#when-your-context-fills-up)

## Auto-compact window
- Per model: `/autocompact <value>` (saved in `modelSettings`); `/autocompact auto` restores the tuned default.
- All models: `"autoCompactWindow": 200000` in settings (a per-model `/autocompact` value wins). One launch: `--autocompact <value>`.
- `CLAUDE_CODE_AUTO_COMPACT_WINDOW=200000` overrides command, flag, and setting. A bare env number is tokens (`200` = 200 tokens), while `/autocompact 200` = 200,000. `k`/`M` suffixes accepted in the env var on v2.1.304+.
- Accepted range 100K–1M (`200000`, `500k`, `1M`, or 100–1000 meaning thousands for the command); capped at the model's window.
- Defaults: native-1M models (Fable, Sonnet 5+, Haiku 5.5, Opus 4.7+) compact at about 967K; Sonnet 4.6/Opus 4.6 without extended context, or any model with `CLAUDE_CODE_DISABLE_1M_CONTEXT=1`, at 200K. Unknown model IDs (gateway aliases) assume 200K; fix with `CLAUDE_CODE_MAX_CONTEXT_TOKENS` or `modelOverrides`.
- `DISABLE_COMPACT` disables all compaction. The `idleCompaction` setting covers compaction of idle sessions.
Source: [Model configuration › Set the auto-compact window](https://code.claude.com/docs/en/model-config#set-the-auto-compact-window), [› Default auto-compact thresholds](https://code.claude.com/docs/en/model-config#default-auto-compact-thresholds)

## Effort and thinking
- Levels: `low`, `medium`, `high`, `xhigh`, `max` (Opus 4.6/Sonnet 4.6 have no `xhigh`; an unsupported level falls back to the next lower one).
- Defaults: `medium` on Opus 5.5, Sonnet 5.5, Haiku 5.5; `xhigh` on Opus 4.7; `high` on other supported models.
- Precedence: `CLAUDE_CODE_EFFORT_LEVEL` > session pick (`/effort`, `/model`) > `--effort` > settings (`modelSettings` per model, or `effortLevel`) > model default.
- `/effort <level>`; `/effort auto` clears the saved level. `max` is not accepted in `effortLevel`/`modelSettings` and is session-only unless set via env var. A user-level top-level `effortLevel` does not apply to Opus 5.5.
- Skill and subagent frontmatter accept `effort`.
- `ultrathink` in a prompt requests deeper reasoning for that turn only.
- Thinking tokens bill as output. Toggle thinking with `Alt+T`/`Option+T`; `MAX_THINKING_TOKENS=0` disables it, except on Opus 5.5, Sonnet 5.5, Haiku 5.5, and Fable (always on). Adaptive-reasoning models ignore nonzero budgets; use effort.
- In this preset: skills/agents can set `effort` in frontmatter (e.g. `low` for mechanical tasks) instead of relying on the session level.
Source: [Model configuration › Adjust effort level](https://code.claude.com/docs/en/model-config#adjust-effort-level), [Manage costs › Adjust extended thinking](https://code.claude.com/docs/en/costs#adjust-extended-thinking)

## Choosing model and effort
- Raise effort (`/effort high`/`xhigh`) for subtle work (bugs in unfamiliar code, flaky tests, schema changes); `/effort low` for fast iterative steering; save `max` for hard unattended problems, since it overthinks ordinary tasks.
- Effort, not prompt wording, is the main control for how long Claude thinks.
- Default Opus 5.5 covers most coding; Sonnet costs less on routine work; Haiku fits simple subagents.
Source: [Best practices › Change the model and effort](https://code.claude.com/docs/en/best-practices#change-the-model-and-effort)

## Keep CLAUDE.md short; move the rest out
- CLAUDE.md loads into every session; include only what Claude can't infer: verify commands (test/typecheck/lint, single test file), misleading code, unrecorded decisions, things corrected twice.
- Stay under 200 lines. `/init` drafts one; `/doctor` suggests cuts; `/doctor prompt-audit` flags stale, broken, or contradictory instructions.
- Personal preferences: `CLAUDE.local.md` (gitignored). Rules that can't have exceptions belong in hooks, not CLAUDE.md wording.
- Area-specific rules: `.claude/rules/*.md` with `paths:` globs. Team procedures: `.claude/skills/<name>/SKILL.md` (only name+description visible until used). Side-effect workflows: `disable-model-invocation: true`.
- In this preset: matches the design; concepts/references are read on demand and not `@`-imported into CLAUDE.md/AGENTS.md.
Source: [Best practices › Keep CLAUDE.md short](https://code.claude.com/docs/en/best-practices#keep-claude-md-short), [Manage costs › Move instructions from CLAUDE.md to skills](https://code.claude.com/docs/en/costs#move-instructions-from-claude-md-to-skills)

## Keep skills discoverable
- Claude picks a skill from every discovered skill's name and description; only the chosen skill's content loads.
- With many skills, some lose their descriptions entirely. Keep descriptions short and lead with words a request would contain.
- Skills can be scoped with `paths` frontmatter globs; shared/cross-repo skills go in root `.claude/skills/` or a plugin (`plugin-name:skill-name` namespace).
- Find unused skills: OTel logs exporter + `OTEL_LOG_TOOL_DETAILS=1`; the `skill_activated` event carries `skill.name` and `invocation_trigger`.
- In this preset: front-load trigger keywords in every `description`; the description budget is shared by all installed skills.
Source: [Large codebases › Keep skills discoverable](https://code.claude.com/docs/en/large-codebases#keep-skills-discoverable)

## Subagents: cost vs. benefit
- Pay off for parallel independent work, keeping long output out of the main context, an unanchored reviewer, or restricted tools.
- Cost: every subagent sends its own requests against the same usage; a fresh one must regather context and can be slower. Same model (or smaller) by default, so no smarter answer.
- Cheaper: `model: haiku` for simple jobs; ask for short summaries; check `/usage` for per-subagent share; `tools: Read, Grep, Glob` for an enforced read-only reviewer. `CLAUDE_CODE_SUBAGENT_MODEL` sets the default subagent model.
Source: [Best practices › Know what subagents cost](https://code.claude.com/docs/en/best-practices#know-what-subagents-cost)

## Keep cost and context down
- Every request resends the whole conversation; cached reads are discounted while warm, full price after expiry.
- Prompt cache lasts about 1 hour on a subscription, 5 minutes on API key, cloud provider, or usage credits; subagents get 5 minutes by default. On the 1-hour cache, an idle session past about 200K tokens is compacted shortly before the cache expires.
- `/clear` costs nothing (`/clear <name>` names the session you leave). `/compact` reads the whole conversation, so it is itself a large request.
- Background work (`/loop`, goal check-ins, subagents) keeps sending requests while you are idle.
- Steering: `Esc` stops; `/rewind` or `Esc` twice restores code/conversation (files changed only via Bash are not restored); after two failed corrections, `/clear` and re-prompt. `/btw` answers without adding to history.
Source: [Best practices › Keep cost and context down](https://code.claude.com/docs/en/best-practices#keep-cost-and-context-down), [› Steer the session](https://code.claude.com/docs/en/best-practices#steer-the-session)

## Reduce token usage
- `/usage`: session token/cost totals (reset by `/clear`), a `Prompt cache (main)` line, and on paid plans attribution by skill/subagent/plugin/MCP server plus recommendations for patterns at ≥10% of usage (`f` applies the fixable ones).
- Compaction instructions can live in CLAUDE.md under a `# Compact instructions` heading.
- MCP tool definitions are deferred by default (names + server instructions only); prefer CLI tools (`gh`, `aws`, `gcloud`); disable unused servers via `/mcp`.
- Hooks can preprocess output (e.g. a PreToolUse hook on `Bash` that rewrites test commands to `grep` only failures), cutting tens of thousands of tokens to hundreds.
- Specific prompts avoid broad scanning; use plan mode (Shift+Tab) before complex work.
- Agent teams use ~7x tokens when teammates run in plan mode; off by default, enable with `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`.
- Long sessions climb from long context, cache misses after breaks, scheduled tasks, cross-session messages, goal check-ins (`CLAUDE_CODE_GOAL_CHECKIN_MINUTES=0` disables), subagents, and compaction.
Source: [Manage costs › Reduce token usage](https://code.claude.com/docs/en/costs#reduce-token-usage), [› Why usage climbs in a long session](https://code.claude.com/docs/en/costs#why-usage-climbs-in-a-long-session)

## Reduce file reads in large codebases
- Code intelligence plugins connect a language server: go-to-definition, find references, and automatic type errors after edits instead of grep plus reading candidate files. Install: `/plugin install typescript-lsp@claude-plugins-official` (needs the language server binary locally); team-wide via `enabledPlugins`.
- Content searches respect `.gitignore`. Block checked-in generated/vendored code with `permissions.deny` entries like `"Read(./**/vendor/**/*)"`.
- `claudeMdExcludes` (globs on absolute paths, e.g. `"**/packages/web/**"`) skips CLAUDE.md and rules files you never need.
- Starting `claude` in a subdirectory loads that directory's and every ancestor's CLAUDE.md; from the root, subdirectory files load on demand.
Source: [Large codebases › Reduce file reads with code intelligence](https://code.claude.com/docs/en/large-codebases#reduce-file-reads-with-code-intelligence), [› Exclude irrelevant CLAUDE.md files](https://code.claude.com/docs/en/large-codebases#exclude-irrelevant-claude-md-files)

## Monitor usage with OpenTelemetry
- Enable: `CLAUDE_CODE_ENABLE_TELEMETRY=1`, plus `OTEL_METRICS_EXPORTER` / `OTEL_LOGS_EXPORTER` (`otlp`, `console`, ...), `OTEL_EXPORTER_OTLP_PROTOCOL`, `OTEL_EXPORTER_OTLP_ENDPOINT`.
- `claude_code.token.usage` (`type`: `input`, `output`, `cacheRead`, `cacheCreation`; break down by `model`, `skill.name`, `plugin.name`, `agent.name`); `claude_code.cost.usage` (USD, approximate; attributes spend to skills, plugins, subagent types).
- `input` excludes cache tokens; total input = `input` + `cacheRead` + `cacheCreation`.
- Filter `query_source` = `"main"` to exclude subagent/auxiliary requests. Suggested alerts: cost spikes, unusual token consumption, high session volume per user.
- In this preset: `skill.name`/`agent.name` attribution shows which preset skills and agents earn their token cost.
Source: [Monitoring › Interpret metrics and events data](https://code.claude.com/docs/en/monitoring-usage#interpret-metrics-and-events-data)
