# Incident records

## Where they live

Use the project's own incident location: a postmortem folder, an incident tracker, a wiki the project links to. Look in the README, `docs/`, the project's agent instructions and the issue tracker guide (`.agents/issue-tracker.md`).

If the project has none, ask the user where incidents should live. The default, if they have no preference, is `docs/incidents/`, one file per incident.

## One file per incident

Name: `<YYYY-MM-DD>-<slug>.md`, dated by the start of the incident (UTC), the slug a few words naming the user impact: `2026-10-30-checkout-errors.md`. That name is the incident's **ID**, used everywhere the incident is referenced.

```markdown
---
severity: SEV2
status: Resolved          # Investigating | Identified | Monitoring | Resolved
started: 2026-10-30T14:02Z
resolved: 2026-10-30T15:10Z
---

# <Title: the user impact, not the cause>

## Impact
<who and what is affected, since when>

## Timeline
| Time (UTC) | Event |
|---|---|
| 14:02 | <detection: what fired or who reported it> |

## Status updates
<each update as posted, newest last>

## Postmortem
<added after resolution, in the incident-response skill's postmortem format>

## Follow-up
- Fix: <task or issue>
- Action items: <tasks or issues, each with owner, priority, due date>
- Runbooks updated: <paths>
```

## Rules

- **Open the record at triage,** before the first mitigation, so the timeline starts with the detection. During the incident it's the timeline's home; the conversation is not.
- **Append, don't rewrite.** Timeline entries and status updates are added, never edited after the fact. Corrections are new entries.
- **The postmortem goes in the same file,** not a separate one, so the evidence and the analysis stay together.
- **No secrets and no personal data** in the record: no tokens, no customer names or emails. Refer to customers by account ID or segment.
- **Link by ID.** A fix, regression test, action item, runbook change or deploy that relates to the incident names its ID: in a task's Description, a test's name or comment (`regression: 2026-10-30-checkout-errors`), a commit message, an issue.

## Reading past incidents

Skills that look for failure history read the records, not memory:
- `roast` (the Breaker seat) and `tech-debt` read recent postmortems for recurring causes and areas.
- `improve-tests` keeps every test that names an incident ID: it's the only guard against that incident recurring.
- `observability-and-instrumentation` reads them for "we couldn't tell what happened", the sign of missing telemetry.
