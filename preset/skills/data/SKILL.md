---
name: data
description: Pick the skill for a data question, from one query to a shared dashboard.
license: MIT
metadata:
  router: "true"
---

# Data

A router: it names the skills for one area of work and when to reach for each. It does none of the work itself.

1. Take what the user wants from the argument, else from the conversation. If it's still unclear, ask one question.
2. Pick the one skill below that fits, using **Choosing**, and say why in one line.
3. Hand over:
   - Invoked by `agent`: use that skill now, on what the user asked.
   - Invoked by `user`: only the user can start it. Tell them its name and what to pass it, then stop.
   - Not available in this setup: say so, and name the closest skill that is.

If nothing here fits, name the router that does: `think`, `design`, `planning`, `build`, `improve`, `ship`, `agent-setup`, `product`, `support`, `productivity`.

## Choosing

- A business question: `analyze`. A table or file nobody has looked at yet: `explore-data`. Just the SQL: `sql-queries`. Whether a difference or trend is real: `statistical-analysis`.
- One chart: `data-visualization`. A dashboard people will use: `build-dashboard`. An analysis about to be shared: `validate-data` first.
- Teaching the agent the company's own data: `data-context-extractor`.

## Skills

| Skill | Use it to | Invoked by |
|---|---|---|
| analyze | answer a business question with data, from a quick number to a formal report | agent |
| explore-data | profile an unfamiliar table or file: grain, keys, nulls, distributions, quality issues | agent |
| sql-queries | write, optimize, translate or debug analytical SQL in the user's dialect | agent |
| statistical-analysis | pick and apply statistical methods and keep claims honest: tests, outliers, trends, forecasts | agent |
| data-visualization | choose the right chart and build a clear, honest, accessible one in Python | agent |
| build-dashboard | build a self-contained interactive HTML dashboard with KPIs, charts, filters and a table | agent |
| validate-data | QA an analysis before it's shared and give a ready / caveats / needs-revision verdict | agent |
| data-context-extractor | interview analysts and the schema to write or extend a company-specific data-analyst skill | agent |
