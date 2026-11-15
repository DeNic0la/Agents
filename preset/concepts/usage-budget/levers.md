# Usage levers per tool

Checked against each vendor's docs on 2026-11-15. If a fact matters and might have changed, follow its link.

## Claude Code

Where the numbers are:
- The status line input has `rate_limits.five_hour` and `rate_limits.seven_day`, each with `used_percentage` (0-100) and `resets_at` (Unix seconds). It's only there for claude.ai subscribers and after the first response, and either window can be missing. [Status line](https://code.claude.com/docs/en/statusline)
- `/usage` shows the plan's usage bars, plus recent usage attributed to skills, subagents, plugins and MCP servers, with recommendations. It counts this machine only, not other devices or claude.ai. [Costs](https://code.claude.com/docs/en/costs)
- The session and weekly limits are shared across models, so switching models doesn't restore access. Fast mode is billed to usage credits, not to plan limits. [Costs](https://code.claude.com/docs/en/costs), [Fast mode](https://code.claude.com/docs/en/fast-mode)

| Driver | Lever |
|---|---|
| Subagent tier | Resolution order: the call's `model`, then the agent definition's `model`, then `CLAUDE_CODE_SUBAGENT_MODEL`, then the session's model. `CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1` makes the variable win over everything (forks still use the session's model). A user-level agent named `Explore` with `model: haiku` replaces the built-in one. [Subagents](https://code.claude.com/docs/en/sub-agents) |
| Workflows | Up to 16 agents at once (`CLAUDE_CODE_WORKFLOW_MAX_CONCURRENT_AGENTS`) and 1,000 per run. The Large workflow warning (over 25 agents or 1.5M projected tokens) is advisory. `workflowSizeGuideline` (`small`, `medium`, `large`, `unrestricted`) is advice to Claude. Workflow agents fall back to the session's model. Ultracode turns off the warning, the concurrency limit and the auto-mode approval. [Workflows](https://code.claude.com/docs/en/workflows) |
| Context size | `autoCompactWindow` in settings, `/autocompact <size>` per model, or `CLAUDE_CODE_AUTO_COMPACT_WINDOW`. `/clear` costs nothing; `/compact` on a large context is a large request. [Model configuration](https://code.claude.com/docs/en/model-config#set-the-auto-compact-window) |
| Cache | `promptCacheTtl` (`5m` or `1h`) for the main conversation, which defaults to `1h` on a subscription. 1h cache writes cost more than 5m ones. `subagentPromptCacheTtl` (default `5m`) covers agents. Each model has its own cache: a mid-session `/model` switch re-reads the whole history uncached, while changing effort doesn't. [Prompt caching](https://code.claude.com/docs/en/prompt-caching) |
| Effort | `low` to `max`. `medium` is the default on Opus 5.5, Sonnet 5.5, Haiku 5.5 and Fable 5.2, and thinking can't be turned off on them. Set it with `/effort`, `CLAUDE_CODE_EFFORT_LEVEL` or `modelSettings.<model>.effortLevel`. [Costs](https://code.claude.com/docs/en/costs) |
| Enforcement | A `PreToolUse` hook with matcher `Agent\|Workflow` can answer `ask`. `PreModelSwitch` receives `context_tokens` and `estimated_cache_write_usd` and can answer `ask` for an interactive `/model`. [Hooks](https://code.claude.com/docs/en/hooks#premodelswitch) |

In this preset (`tools/claude/`, installed into `~/.claude`; the scripts need Node.js):
- `settings.json` sets `CLAUDE_CODE_SUBAGENT_MODEL=sonnet`, so an agent without a tier runs on Sonnet instead of the session's model. It sets `autoCompactWindow` to 200000 and registers the two scripts below.
- `statusline/usage-pace.js` shows the model, the context size, 5-hour usage, and weekly usage against the pace line. It saves the last reading to `~/.claude/usage-pace.json` (`seven_day.used`, `seven_day.resets_at`, `five_hour.used`, `updated_at`), where skills and the hook read it. `USAGE_PACE_RESERVE` sets the reserve in percent (default 10).
- `hooks/usage-guard.js` asks before a workflow, or a subagent on a top-tier model, while weekly usage is ahead of pace. It also asks before a model switch on a context over `USAGE_SWITCH_ASK_TOKENS` tokens (default 100000).
- The `usage-review` skill reports where past usage went, from this machine's transcripts.

## Codex

- Limits: message allowances per 5-hour window that depend on the plan, and weekly limits that may also apply. Local and cloud tasks share them. `/status` shows what's left, and credits extend use. [Pricing](https://learn.chatgpt.com/docs/pricing)
- Levers in `config.toml`: `model_reasoning_effort`, `agents.default_subagent_model` and `agents.default_subagent_reasoning_effort` (an explicit value at spawn wins), `agents.max_threads`, `model_auto_compact_token_limit`, `tool_output_token_limit`. [Configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference)
- Skill listing: about 2% of the context window, set with `skills.max_context_tokens`. Codex shortens descriptions first, then leaves skills out. [Skills](https://learn.chatgpt.com/docs/build-skills)

## GitHub Copilot

- Since 2026-06-01, Copilot bills GitHub AI Credits for input, output and cached tokens at each model's rate. Plans include monthly credits, and admins can set budgets. Annual plans can still be on premium requests. [Changelog](https://github.blog/changelog/2026/04/27/github-copilot-is-moving-to-usage-based-billing/)
- Lever: the model per chat or custom agent. A custom agent's `model` falls back to the session's model when Copilot can't use it. [CLI reference](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference)
