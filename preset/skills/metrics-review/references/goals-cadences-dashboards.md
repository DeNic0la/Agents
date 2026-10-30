# Goals, review cadences and dashboards

## OKRs

- **Objective:** qualitative, inspiring, time-bound (quarter or year), directional.
- **Key results:** 2-4 per objective, measurable, with a target and date, measuring outcomes not outputs.

```
Objective: Make our product indispensable for daily workflows

Key results:
- Increase DAU/MAU from 0.35 to 0.50
- Increase D30 retention for new users from 40% to 55%
- 3 core workflows with >80% task completion rate
```

- Ambitious but achievable: 70% completion is the target for stretch OKRs. If you're sure to hit all of them, they're too easy.
- Measure user behavior and business results, not features shipped.
- 2-3 objectives with 2-4 KRs each is plenty.
- Check at mid-period and shift effort if a KR is clearly off track.
- Grade honestly: 0.0-0.3 missed, 0.4-0.6 progress, 0.7-1.0 achieved.

## Setting a target

- **Baseline:** you need a reliable current value first.
- **Benchmark:** what comparable products achieve.
- **Trajectory:** if it already grows 5% a month, 6% isn't ambitious.
- **Effort:** bigger bets justify bigger targets.
- **Confidence:** set a "commit" (high confidence) and a "stretch".

## Review cadences

**Weekly check (15-30 min, PM and maybe the engineering lead):** North Star week over week, notable L1 moves, experiment results and significance, anomalies, fired alerts. Investigate what looks off; otherwise note it and move on.

**Monthly review (30-60 min, product team and key stakeholders):** full L1 scorecard month over month, progress on quarterly OKRs, cohort comparison, adoption of recent launches, diverging segments. Pick 1-3 areas to investigate or invest in.

**Quarterly business review (60-90 min, product, engineering, design, leadership):** OKR scores, L1 trends over the quarter, year-over-year comparison, competitive context, what worked and what didn't. Set next quarter's OKRs and adjust strategy.

## Dashboard design

A good dashboard answers "how is the product doing?" at a glance.

1. Start from the decision it supports, not the data.
2. Most important metric most prominent: North Star, then L1, L2 on drill-down.
3. Always show context: current value, a comparison, trend direction.
4. 5-10 metrics that matter. Everything else goes in a detailed report.
5. One time period for the whole dashboard.
6. Status colors: green on track, yellow needs attention, red off track.
7. Only metrics the team can influence.

**Layout, top to bottom:** North Star with trend and target; L1 scorecard; key funnels with drop-off; active experiments and recent launches; L2 metrics, segments and time series for investigation.

**Anti-patterns:** vanity metrics that only go up (total signups ever), dashboards that need scrolling, numbers without comparison, stale dashboards nobody reviews, output metrics (tickets closed, PRs merged), one dashboard for executives, PMs and engineers alike.

## Alerting

- **Threshold:** crosses a critical value (error rate > 1%, conversion < 5%).
- **Trend:** sustained decline over days or weeks.
- **Anomaly:** far outside the expected range.

Every alert must be actionable and have an owner. Tune them regularly; too many false positives and people ignore all of them. Not everything is P0.
