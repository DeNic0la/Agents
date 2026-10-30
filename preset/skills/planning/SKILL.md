---
name: planning
description: Pick the skill for turning a decision into specs, tickets or tasks, or for handing work over.
license: MIT
metadata:
  router: "true"
---

# Planning

A router: it names the skills for one area of work and when to reach for each. It does none of the work itself.

1. Take what the user wants from the argument, else from the conversation. If it's still unclear, ask one question.
2. Pick the one skill below that fits, using **Choosing**, and say why in one line.
3. Hand over:
   - Invoked by `agent`: use that skill now, on what the user asked.
   - Invoked by `user`: only the user can start it. Tell them its name and what to pass it, then stop.
   - Not available in this setup: say so, and name the closest skill that is.

If nothing here fits, name the router that does: `think`, `design`, `build`, `improve`, `ship`, `agent-setup`, `data`, `product`, `support`, `productivity`.

## Choosing

- A conversation that settled what to build: `to-spec`. Work too big for one session: `wayfinder` first.
- A spec to break down: `to-tickets` for the issue tracker, `planning-and-task-breakdown` for a task list to work through in the session.
- Issues piling up: `triage`. One tracker issue that needs a technical spec: `analyze-issue`.
- The `.specs/` workflow: `add-task` captures a request, `plan-task` plans it, and `implement-task` (in the `build` router) builds it.
- Knowledge someone else has: `to-questionnaire`. Stopping for now: `checkpoint` when this work continues later, `handoff` when a new agent session takes over.

## Skills

| Skill | Use it to | Invoked by |
|---|---|---|
| to-spec | turn the conversation into a spec in the issue tracker | user |
| wayfinder | chart work too big for one session as a map of decision tickets | user |
| to-tickets | break a plan or spec into tracer-bullet tickets with blocking edges in the issue tracker | user |
| planning-and-task-breakdown | break a spec into small, verifiable, ordered tasks | agent |
| triage | move issues and external PRs through triage states and write agent-ready briefs | user |
| analyze-issue | write a technical spec for a tracker issue | user |
| add-task | capture a request as a draft task in `.specs/tasks/draft/` | user |
| plan-task | turn a draft into acceptance criteria, architecture and judged, phased sub-tasks | user |
| to-questionnaire | write a questionnaire for someone who knows what you don't | user |
| checkpoint | before compaction or a break, update the task tracking, record learnings and write the session state | user |
| handoff | write a handoff document for the next agent session | user |
