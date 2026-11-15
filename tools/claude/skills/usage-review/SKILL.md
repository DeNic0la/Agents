---
name: usage-review
description: Find out where your Claude Code usage went, from this machine's session transcripts, and what to change first.
argument-hint: "How many days back? (default: all history)"
disable-model-invocation: true
---

Report where Claude Code usage went and which change would save the most, following the usage-budget concept (`~/.agents/concepts/usage-budget/CONCEPT.md`).

1. Run the script next to this file: `node "<this skill's folder>/scripts/usage-analysis.js"`, adding `--days <N>` when the user names a period. It reads `$CLAUDE_CONFIG_DIR/projects` (default `~/.claude/projects`), prints the report and sends nothing anywhere. It needs Node.js.
2. If `~/.claude/usage-pace.json` exists, add the current weekly and 5-hour usage and the pace line from it. The preset's status line writes that file.
3. Explain the three biggest drivers with their numbers, using the report's SIGNALS first: subagents and workflows that inherit the session's model, context size, cache rebuilds (breaks, model switches, compaction), fan-out, effort.
4. Recommend at most five changes, biggest saving first. Tie each one to its evidence and to a lever in the concept's `levers.md`. Change settings only after the user says yes.

Read the numbers right:
- Costs are API-equivalent dollars, derived from Claude Code's own per-session cost records. On a subscription they show relative cost, not plan percent or a bill.
- Plan limits also count other devices and claude.ai, which this machine's transcripts don't show. `/usage` has the same blind spot.
- Claude Code deletes transcripts older than `cleanupPeriodDays` (30 by default), so that's how far back the history goes.
