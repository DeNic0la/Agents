---
name: product
description: Pick the skill for product work: specs, roadmaps, sprints, research and updates.
license: MIT
metadata:
  router: "true"
---

# Product

A router: it names the skills for one area of work and when to reach for each. It does none of the work itself.

1. Take what the user wants from the argument, else from the conversation. If it's still unclear, ask one question.
2. Pick the one skill below that fits, using **Choosing**, and say why in one line.
3. Hand over:
   - Invoked by `agent`: use that skill now, on what the user asked.
   - Invoked by `user`: only the user can start it. Tell them its name and what to pass it, then stop.
   - Not available in this setup: say so, and name the closest skill that is.

If nothing here fits, name the router that does: `think`, `design`, `planning`, `build`, `improve`, `ship`, `agent-setup`, `data`, `support`, `productivity`.

## Choosing

- A product problem to think through: `product-brainstorming`. A PRD: `write-spec`. The roadmap: `roadmap-update`. The next sprint: `sprint-planning`.
- User research to make sense of: `synthesize-research`. Competitors: `competitive-brief`. The numbers: `metrics-review`.
- Telling people where things stand: `stakeholder-update`.

## Skills

| Skill | Use it to | Invoked by |
|---|---|---|
| product-brainstorming | think out loud about product problems, ideas and strategy with a sparring partner | agent |
| write-spec | write a PRD with goals, non-goals, user stories, requirements and metrics | agent |
| roadmap-update | add, reprioritize or reschedule items on a product roadmap, or build one | agent |
| sprint-planning | plan a team sprint with a goal, capacity, a scoped backlog and risks | agent |
| synthesize-research | turn interviews, surveys and feedback into ranked, evidence-backed findings | agent |
| competitive-brief | write a competitive analysis brief for competitors or a feature area | agent |
| metrics-review | review product metrics for trends, a scorecard and recommended actions | agent |
| stakeholder-update | write a status update tailored to execs, engineering, partners, customers or the board | agent |
