---
name: incident-management
description: When production is down or degraded, an alert or deploy trigger fires, a P1 support ticket reports an outage, or anything touches an incident record (status update, postmortem, action item, regression test, runbook) - classify with the shared SEV scale, mitigate before root cause, change production only with the user's go-ahead, keep the timeline in UTC, stay blameless, and record the incident where the project keeps its incidents.
---

# Incident management

Applies to every agent, in any tool, in a project that runs in production. The `incident-response` skill runs an incident. This concept is the contract it shares with every other skill that raises, communicates or learns from incidents.

**Terms:**
- An **incident** is unplanned user impact in production, happening now or just ended. A bug without user impact isn't one; it goes through the agent-lifecycle as normal work.
- The **incident record** is the file that holds one incident: its severity, timeline, status updates and, later, the postmortem.
- **Mitigation** stops the user impact. A **fix** removes the root cause. They're separate pieces of work.

## Severity

One scale for everyone. A skill may use its own scale for its own domain (support priorities, alert tiers), but where it touches an incident it maps to this one.

| Level | Criteria | Response | Status updates |
|---|---|---|---|
| **SEV1** | service down, all users affected, data loss, or a security breach | immediately, all hands | every 30 minutes |
| **SEV2** | major feature degraded, many users affected | within 15 minutes | every 30 minutes |
| **SEV3** | minor feature broken, some users affected | within 1 hour | every 2 hours |
| **SEV4** | cosmetic or low impact | next business day | at resolution |

When unsure between two levels, pick the higher one; downgrading is cheap. A project's own definitions (in its incident docs) replace this table.

**Where incidents start:**
- An alert of the **page** tier (observability-and-instrumentation): a candidate SEV1-2, to be classified.
- A support ticket at **P1** (ticket-triage) that reports production down, data loss or a breach: a candidate SEV1-2. A P2 with many users affected: a candidate SEV2-3.
- A **rollback trigger** from a deploy checklist that fires: an incident at the level of its impact.

## Rules

1. **Mitigate first.** While users are affected, restore service before looking for the root cause: the fastest reversible action (roll back, turn off the flag, fail over, scale, block traffic).
2. **The user owns production.** Never change production, send anything to customers, page anyone or post publicly without the user's go-ahead for that action. State what the action does, its risk and how to undo it. An incident speeds up the lifecycle; it doesn't remove its gates.
3. **One status vocabulary:** `Investigating` → `Identified` → `Monitoring` → `Resolved`. Every status update and customer message uses it, with the impact, the actions taken, the next step and the time of the next update.
4. **Facts only.** Updates state what is known. No guesses about the cause, internal system names or blame in anything customers see.
5. **Times in UTC.** The timeline records every detection, decision and action with its time and its effect, from the first minute.
6. **Blameless.** Records and postmortems describe what in the system and the process allowed the failure, never who made the mistake.
7. **Resolved means verified.** Confirm with the same signal that showed the problem, watch it for a while, and only then set `Resolved`.
8. **Every incident leaves a trail.** After resolution:
   - a postmortem, short for SEV3-4;
   - the root-cause fix as its own work, a task of type `bug` with a regression test that names the incident;
   - action items, each with an owner, a priority and a due date, as draft tasks or tracker issues (the issue-tracker concept);
   - every runbook used, corrected where a step was wrong or missing.

## Supporting files

- [records.md](records.md): read when creating or updating an incident record, writing a postmortem, linking a fix, test or action item to an incident, or looking for past incidents (roast, tech-debt, improve-tests).
- [lifecycle.md](lifecycle.md): read when an incident starts or ends during other work, to know how incident phases map to agent-lifecycle states and where its follow-up work goes.
