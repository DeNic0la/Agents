# Writing Runbooks

Rule 2 of the alerting rules in SKILL.md requires every alert to link to a runbook. A runbook's job is to answer three questions without requiring the reader to think: what is happening, what to check first, and who to call if that doesn't resolve it. Store in `docs/runbooks/` named after the alert.

**Minimum viable runbook (three lines):**

```markdown
# Runbook: High Error Rate on /api/tasks
**Means:** DB connection pool likely exhausted, or a bad deploy.
**First check:** `SELECT count(*) FROM pg_stat_activity WHERE backend_type = 'client backend';`
  — if count > pool limit, see Step 2. (Swap in the equivalent for your database.)
**Escalate to:** #db-oncall or engineering on-call rotation.
```

**When to expand beyond three lines:** add steps only when the first check alone isn't enough to decide. A five-step runbook that covers the three most common causes is better than a twenty-step document that covers every edge case and gets skimmed.

**Keep runbooks current.** Update the runbook as part of closing every incident it was used in — a stale runbook builds false confidence. If a step was wrong or missing, fix it before marking the incident resolved.
