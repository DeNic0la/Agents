---
name: agent-setup
description: Pick the skill for improving the agent itself: its skills, instructions, context and prompts.
license: MIT
metadata:
  router: "true"
---

# Agent setup

A router: it names the skills for one area of work and when to reach for each. It does none of the work itself.

1. Take what the user wants from the argument, else from the conversation. If it's still unclear, ask one question.
2. Pick the one skill below that fits, using **Choosing**, and say why in one line.
3. Hand over:
   - Invoked by `agent`: use that skill now, on what the user asked.
   - Invoked by `user`: only the user can start it. Tell them its name and what to pass it, then stop.
   - Not available in this setup: say so, and name the closest skill that is.

If nothing here fits, name the router that does: `think`, `design`, `planning`, `build`, `improve`, `ship`, `data`, `product`, `support`, `productivity`.

## Choosing

- Writing or restructuring a skill or agent doc: `writing-for-agents`. Proving a skill changes behavior: `writing-skills`. A whole skill collection drifting: `skill-review`.
- Instruction files out of date with the code: `agents-md-improver`. The user stated a lasting preference: `task-observer`. What the agent loads and when: `context-engineering`.
- A session to learn from: `retro` improves the environment, `diagnosing-sessions` finds out with evidence why it went wrong and reports it.
- A prompt for an AI chat: `optimize-prompt`.

## Skills

| Skill | Use it to | Invoked by |
|---|---|---|
| writing-for-agents | write or restructure a skill, AGENTS.md or any doc an agent reads | agent |
| writing-skills | prove a skill changes agent behavior: baselines, pressure tests, closing loopholes | agent |
| skill-review | sweep a skill collection for stale steps, missing gotchas, gaps and duplicates | agent |
| agents-md-improver | audit agent instruction files against the codebase, or add a session's learnings to them | agent |
| task-observer | save the user's lasting working preferences as rules in the instruction files | agent |
| context-engineering | set up the context an agent works with | agent |
| retro | review a session and improve the agent's environment | user |
| diagnosing-sessions | find out, with transcript evidence, why a session went wrong, and report it to whoever maintains the skill or plugin involved | user |
| optimize-prompt | rewrite a draft prompt for an AI chat into a clearer one, without running it | agent |
