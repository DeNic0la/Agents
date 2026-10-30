---
name: metrics-review
description: Use when running a weekly, monthly or quarterly product metrics review, investigating a sudden spike or drop, comparing performance against targets, or turning raw numbers into a scorecard with recommended actions. Reviews product metrics for trends and actionable insights.
---

# Metrics review

Review product metrics, find the trends that matter and recommend actions.

## 1. Gather the data

If a product analytics tool is connected, pull the key metrics for the period, comparison data (previous period, same period last year, targets) and segment breakdowns.

Otherwise, ask the user for the metrics and values (a table, screenshot or description), comparison data, and recent changes.

Either way, ask:

- Which period? Last week, month, quarter?
- Which metrics, or the full suite?
- Which targets to compare against?
- Known events that could explain changes: launches, outages, campaigns, seasonality.

## 2. Organize the metrics

Use a hierarchy: the North Star at the top, L1 health metrics (acquisition, activation, engagement, retention, monetization, satisfaction), and L2 diagnostic metrics for drill-down. If the user has no hierarchy yet, help them pick a North Star and the key L1 metrics first.

Read [references/metrics-hierarchy.md](references/metrics-hierarchy.md) when defining the hierarchy or when you need definitions and pitfalls for DAU/MAU, retention, conversion or activation.

## 3. Analyze trends

For each key metric: current value, trend vs. the previous period, gap to target, whether the change is accelerating, and anomalies.

Then look across metrics: do changes correlate? Do leading indicators predict the lagging ones? Does a segment breakdown show one cohort driving the aggregate?

## 4. Write the review

1. **Summary:** 2-3 sentences: overall health, the most notable change, the key callout. The reader gets the story in 30 seconds.
2. **Scorecard:**

   | Metric | Current | Previous | Change | Target | Status |
   |--------|---------|----------|--------|--------|--------|
   | [Metric] | [Value] | [Value] | [+/- %] | [Target] | On track / At risk / Miss |

3. **Trend analysis:** per metric worth discussing: what happened and how big, the likely cause (known events, correlated metrics, segments), one-off or sustained.
4. **Bright spots:** metrics beating target, positive trends to sustain, strong segments or features.
5. **Areas of concern:** misses, negative trends, early warnings, blind spots.
6. **Recommended actions:** investigations to run, experiments to launch, investments to make, alerts to set.
7. **Context and caveats:** data quality issues, events that hurt comparability, metrics we should track but don't.

## 5. Follow up

Offer to dig into a metric, write a dashboard spec, draft experiment proposals, or set up a template for the recurring review.

Read [references/goals-cadences-dashboards.md](references/goals-cadences-dashboards.md) when the user asks about OKRs or target setting, what to cover at each review cadence, dashboard design or alerting.

## Rules

- Lead with the "so what".
- Never show a number without a comparison: previous period, target or benchmark.
- Correlation isn't causation. State your uncertainty about why a metric moved.
- Small fluctuations are noise. Spend attention on meaningful changes.
- For a missed target, recommend what to do, not just the miss.
- A review that leads to no action wasn't useful.
