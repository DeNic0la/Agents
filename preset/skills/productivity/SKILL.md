---
name: productivity
description: Pick the skill for the user's own tasks and working memory.
license: MIT
metadata:
  router: "true"
---

# Productivity

A router: it names the skills for one area of work and when to reach for each. It does none of the work itself.

1. Take what the user wants from the argument, else from the conversation. If it's still unclear, ask one question.
2. Pick the one skill below that fits, using **Choosing**, and say why in one line.
3. Hand over:
   - Invoked by `agent`: use that skill now, on what the user asked.
   - Invoked by `user`: only the user can start it. Tell them its name and what to pass it, then stop.
   - Not available in this setup: say so, and name the closest skill that is.

If nothing here fits, name the router that does: `think`, `design`, `planning`, `build`, `improve`, `ship`, `agent-setup`, `data`, `product`, `support`.

## Choosing

- First time: `productivity-start`. Bringing tasks and memory up to date: `productivity-update`. One todo to add, finish or find: `task-management`. Shorthand or a name to decode or remember: `memory-management`.

## Skills

| Skill | Use it to | Invoked by |
|---|---|---|
| productivity-start | set up TASKS.md, working memory and the dashboard, and learn the user's shorthand | user |
| productivity-update | sync tasks from trackers, triage stale ones, and fill memory gaps | user |
| task-management | keep the user's personal todos in TASKS.md | agent |
| memory-management | decode and remember workplace shorthand in working memory and `memory/` | agent |
