---
name: budget-run
description: Use before launching work that spends a lot of usage at once (parallel subagents, a workflow, a multi-agent review or research run, a long unattended job) or when the user asks what something costs or how much usage is left. Sizes the run, cuts it to the cheapest plan that does the job, and asks first when it's large or weekly usage is ahead of pace.
license: MIT
---

# Budget a run

A run that fans out multiplies its cost by the number of agents, the context each one reads and the turns each one takes. This skill sizes the run before it starts. The rules behind it are in the usage-budget concept (`~/.agents/concepts/usage-budget/CONCEPT.md`); this is the procedure.

## Steps

1. **Read the budget.** Get the weekly usage (percent used, and when it resets) the way the concept's `levers.md` says for your tool. If you can't read it, ask the user once, or plan as if on pace and say so. Compute the pace line: elapsed share of the window × (100 − reserve), with a 10% reserve unless the user set another. Above the line is ahead of pace.
2. **Sketch the run.** List every unit (agent, stage, round, retry) with what it reads and the tier it needs, picked with `references/model-tiers.md`. Count the agents and the tier mix. Don't invent precise token numbers; the shape is what matters.
3. **Cut it down,** in this order:
   1. Replace units that count, parse, search or transform with a script.
   2. Merge units that read the same material, and drop units that another one already covers.
   3. Verify in batches: one checker per group of findings rather than per finding, and one vote unless the user asked for thoroughness.
   4. Give every unit the cheapest tier that can do it (read-only work runs `fast`), and low effort to mechanical stages.
   5. Cap the counts: sources per researcher, findings per reviewer, retries per unit.
4. **Decide.**
   - Up to 10 agents, no `deep` fan-out, and on pace: start, and state the plan in one line (agents × tier).
   - More than 10 agents, any `deep` fan-out, or ahead of pace: ask first. Show the units with their tiers, a cheaper alternative, and how much of the week is left. A standing opt-in to orchestration covers the shape of the run, not its size.
5. **Report.** After the run, give what it used if the tool shows it (agents, tokens) next to the plan, so the next estimate is better.

## Before launching

- [ ] Every unit has an explicit tier, and nothing inherits the session's model.
- [ ] No agent does deterministic work that a script could do.
- [ ] The user said yes if the run is large or usage is ahead of pace.
