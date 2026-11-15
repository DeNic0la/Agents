---
name: usage-budget
description: Always, for any work that spends the user's plan usage - pace usage across the weekly window so some is left on the last day, give every dispatched agent an explicit model tier, prefer scripts to agents, keep sessions short, don't switch models on a large context, and size multi-agent runs before launching them.
---

# Usage budget

Applies to every agent, in any tool, working anywhere. Plan usage is a budget that refills on a schedule: a 5-hour window and a weekly window in Claude Code and Codex, monthly credits in Copilot. Running out mid-week stops every session until the reset. The goal is to use the whole allowance and still have some left on the last day.

This concept changes what work costs, never what gets built. Test and Review still run (agent-lifecycle), and the user can always say "go ahead".

## Where usage goes

Roughly in order of impact:

1. **Context size.** Every turn re-reads the whole conversation. A turn at 300k tokens of context costs about ten times a turn at 30k, cached or not.
2. **Model tier.** A top-tier model costs several times a mid-tier one per token, and a subagent runs on the session's model unless it's given another.
3. **Cache rebuilds.** The first turn after a break longer than the cache lifetime, after a model switch, or after compaction writes the whole context again.
4. **Fan-out.** Every subagent and workflow agent runs its own conversation with its own context, so cost grows with the number of agents.
5. **Effort.** Thinking is billed as output. On most work it matters less than the four above.

## Rules

1. **Pace, don't sprint.** The pace line is the share of the weekly window that has passed, scaled to keep a reserve (10% unless the user sets another) for the last day: `pace = elapsed × (100 − reserve)`. Weekly usage above the line is ahead of pace. [levers.md](levers.md) says where each tool shows the numbers. When you're ahead, take the cheaper plan for the rest of the task (a lower tier, no fan-out without a yes) and say so in one line.
2. **Give every agent you dispatch an explicit tier.** Pick it with `references/model-tiers.md` (`~/.agents/references/` globally). Never let a subagent or workflow agent inherit the session's model by default. Read-only work runs `fast`.
3. **Scripts before agents.** Counting, parsing, searching, transforming or checking files is a script's job: it costs nothing per run and gives the same answer twice. Use agents for judgment.
4. **Keep the context small.** One task per session. Clear the conversation between unrelated tasks: clearing is free, while compacting a large context is itself a large request. When the context passes about 200k tokens and the task isn't nearly done, or before a break of more than an hour, write a checkpoint or handoff and continue in a fresh session.
5. **Don't switch models on a large context.** Each model has its own cache, so a switch writes the whole context again at the new model's price. Switch at the start of a session or after a handoff. Changing effort keeps the cache on current models.
6. **Size fan-out before launching it.** Before running more than a few agents (parallel subagents, a workflow, a multi-agent review or research run), follow the `budget-run` skill: name the agents and their tiers, cut what a script or a single agent can do, and ask first when the run is large or you're ahead of pace. An opt-in to orchestrate everything, such as Claude Code's Ultracode, is a yes to orchestration, not to unlimited spend.
7. **Medium effort by default.** Raise it for a hard step, not for the whole session. Use the maximum only when the user asks.
8. **Measure, then fix the biggest driver.** Review usage once a week (the tool's usage view, or the `usage-review` skill in Claude Code) and change one lever at a time, starting with the biggest share.

## Supporting files

- [levers.md](levers.md): read to check usage or to change a setting in Claude Code, Codex or Copilot: where the numbers are, which setting or hook controls each driver, and what this preset installs.
