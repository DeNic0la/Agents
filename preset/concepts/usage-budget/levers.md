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
- `statusline/usage-pace.js` shows the model, the context size, 5-hour usage, weekly usage against the weighted pace line (`week 23%/pace 30%`), advice and the reset time (`resets Fri 14:00`). The advice is `▲ use more ~19%/workday (+60%)`, `● on pace`, or `▼ ease off ~8%/workday (−40%)`: the amount per full workday that uses the rest of the week except the reserve, and how it compares with your rate so far. On a light day (weight below 0.5) it adds today's share, such as `, light day: ~4% today`, so the workday figure isn't read as a Saturday allowance.
  - Weekday weights: the prior is `USAGE_PACE_WEEKDAYS`, seven weights Monday first (default `1,1,1,1,1,0.2,0.2`). The script records every change in weekly usage to `~/.claude/usage-history.jsonl` (the last 8 weeks) and learns from how much you used on each weekday in finished weeks it covers from start to end. The prior counts as two weeks, and no weight goes below 0.15. With all weights at 1 it says `%/day`.
  - `USAGE_PACE_COMPACT=1` (in `settings.json` under `env`) gives shorter labels: `wk 23/30% ▲~19%/wd (today 4%) · →Fri 14:00`.
  - When oh-my-posh is installed and its theme exists, the status line shows oh-my-posh's `claude` line (user, folder, Git, model, context gauge) above the usage line. The theme defaults to `~/toolbox/oh-my-posh/default.omp.json` from DeNic0la/toolbox; `USAGE_PACE_OMP_CONFIG` names another theme, or `off` leaves the line out, and `USAGE_PACE_OMP_BIN` names the program if it isn't `oh-my-posh` on the `PATH`. Without either, only the usage line shows.
  - It saves the last reading to `~/.claude/usage-pace.json`, where skills and the hook read it: `seven_day.used`, `.resets_at`, `.pace`, `.weights` (Sunday first) and `.learned_weeks`, plus `five_hour.used` and `updated_at`. `USAGE_PACE_RESERVE` sets the reserve in percent (default 10).
- `hooks/usage-guard.js` asks before a workflow, or a subagent on a top-tier model, while weekly usage is ahead of the same weighted pace line. It also asks before a model switch on a context over `USAGE_SWITCH_ASK_TOKENS` tokens (default 100000).
- The `usage-review` skill reports where past usage went, from this machine's transcripts.

## Codex

- Limits: message allowances per 5-hour window that depend on the plan, and weekly limits that may also apply. Local and cloud tasks share them. `/status` shows what's left, and credits extend use. [Pricing](https://learn.chatgpt.com/docs/pricing)
- Levers in `config.toml`: `model_reasoning_effort`, `agents.default_subagent_model` and `agents.default_subagent_reasoning_effort` (an explicit value at spawn wins), `agents.max_threads`, `model_auto_compact_token_limit`, `tool_output_token_limit`. [Configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference)
- Skill listing: about 2% of the context window, set with `skills.max_context_tokens`. Codex shortens descriptions first, then leaves skills out. [Skills](https://learn.chatgpt.com/docs/build-skills)

## GitHub Copilot

- Since 2026-06-01, Copilot bills GitHub AI Credits for input, output and cached tokens at each model's rate. Plans include monthly credits, and admins can set budgets. Annual plans can still be on premium requests. [Changelog](https://github.blog/changelog/2026/04/27/github-copilot-is-moving-to-usage-based-billing/)
- Lever: the model per chat or custom agent. A custom agent's `model` falls back to the session's model when Copilot can't use it. [CLI reference](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference)
